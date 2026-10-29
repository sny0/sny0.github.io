import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, cp, lstat, mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const BRANCH = 'gh-pages';
const TRACKING_REF = `refs/remotes/origin/${BRANCH}`;
const MAX_PUSH_ATTEMPTS = 3;
const BUILD_TIMEOUT_MS = 5 * 60_000;
const BOT = ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Exported read-only helpers allow local validation without enabling deployment.
export function assertOnlyStudyPaths(paths) {
  assert(paths.every((name) => name.startsWith('study/') && !name.split('/').includes('..')),
    'Refusing a change outside study/.');
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function parseTree(text) {
  return text.split('\0').filter(Boolean).map((entry) => {
    const tab = entry.indexOf('\t');
    assert(tab >= 0, 'Invalid git tree record.');
    const [mode, type, oid] = entry.slice(0, tab).split(' ');
    return { mode, type, oid, name: entry.slice(tab + 1), record: entry };
  });
}

export async function collectFiles(directory, objectFormat = 'sha1') {
  const files = new Map();
  const root = await realpath(directory);
  assert((await lstat(directory)).isDirectory() && !(await lstat(directory)).isSymbolicLink(),
    'The generated site must be a real directory.');
  async function visit(current, prefix = '') {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      assert(entry.name.toLowerCase() !== '.git' && !/^\.env(?:\.|$)/i.test(entry.name),
        'Refusing Git metadata or environment files in the generated site.');
      const filename = path.join(current, entry.name);
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      const info = await lstat(filename);
      assert(!info.isSymbolicLink(), 'Symbolic links are not allowed in the generated site.');
      assert(isWithin(root, await realpath(filename)), 'A generated file escaped its directory.');
      if (info.isDirectory()) await visit(filename, name);
      else {
        assert(info.isFile(), 'Only regular files and directories may be published.');
        const data = await readFile(filename);
        const oid = createHash(objectFormat).update(`blob ${data.length}\0`).update(data).digest('hex');
        files.set(name, { oid, sha256: createHash('sha256').update(data).digest('hex') });
      }
    }
  }
  await visit(root);
  assert(files.has('index.html'), 'The generated site has no index.html.');
  return files;
}

function assertSameFiles(expected, actual) {
  assert(expected.size === actual.size && [...expected].every(([name, file]) => actual.get(name)?.sha256 === file.sha256),
    'The copied/rebased study site does not exactly match the generated files.');
}

async function main() {
  // Refuse local runs and untrusted PR refs before reading credentials or mutating Git.
  assert(process.env.GITHUB_ACTIONS === 'true' && process.platform === 'linux',
    'Deployment can run only in a Linux GitHub Actions job.');
  assert(['push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME) && process.env.GITHUB_REF === 'refs/heads/main',
    'Deployment is restricted to push/manual runs from main.');
  assert(process.env.GITHUB_REPOSITORY === 'sny0/sny0.github.io', 'Unexpected deployment repository.');
  assert(process.env.GITHUB_SERVER_URL === 'https://github.com' && process.env.GITHUB_API_URL === 'https://api.github.com',
    'Unexpected GitHub server.');
  assert(/^[a-f0-9]{40,64}$/.test(process.env.GITHUB_SHA ?? ''), 'Missing source commit SHA.');
  const { values } = parseArgs({ options: { 'repo-root': { type: 'string' }, 'source-dist': { type: 'string' } }, strict: true });
  assert(values['repo-root'] && values['source-dist'], '--repo-root and --source-dist are required.');
  const repoRoot = await realpath(path.resolve(values['repo-root']));
  assert(repoRoot === await realpath(process.env.GITHUB_WORKSPACE), 'Repository root must be GITHUB_WORKSPACE.');
  const expectedDist = path.join(repoRoot, 'study', 'docs', '.vitepress', 'dist');
  assert(path.resolve(values['source-dist']) === expectedDist, 'Only study/docs/.vitepress/dist may be published.');
  const sourceDist = await realpath(expectedDist);
  assert(sourceDist === expectedDist && isWithin(repoRoot, sourceDist), 'Generated site path contains a symlink or escaped the repository.');
  const token = process.env.GITHUB_TOKEN;
  assert(token, 'GITHUB_TOKEN is required.');
  const redact = (value) => String(value).split(token).join('[REDACTED]');
  const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'true', GIT_SEQUENCE_EDITOR: 'true' };
  delete gitEnv.GITHUB_TOKEN;
  delete gitEnv.GH_TOKEN;
  for (const name of Object.keys(gitEnv)) {
    if (name.startsWith('GIT_TRACE') || name === 'GIT_CURL_VERBOSE') delete gitEnv[name];
  }
  // Git authentication is managed by actions/checkout; never inject the token into argv/config here.
  function git(args, cwd = repoRoot, allowFailure = false) {
    const result = spawnSync('git', args, { cwd, env: gitEnv, encoding: 'utf8', timeout: 120_000, maxBuffer: 32 * 1024 * 1024 });
    if (result.error || (result.status !== 0 && !allowFailure)) {
      throw new Error(redact(`Git ${args[0]} failed: ${result.error?.message ?? result.stderr}`));
    }
    return result;
  }
  const gitTop = git(['rev-parse', '--show-toplevel']).stdout.trim();
  assert(await realpath(gitTop) === repoRoot, 'The specified directory is not the repository root.');
  const origin = git(['remote', 'get-url', 'origin']).stdout.trim();
  assert(/^https:\/\/github\.com\/sny0\/sny0\.github\.io(?:\.git)?\/?$/i.test(origin),
    'Origin must be the expected HTTPS repository without embedded credentials.');
  const objectFormat = git(['rev-parse', '--show-object-format']).stdout.trim();
  assert(['sha1', 'sha256'].includes(objectFormat), 'Unsupported Git object format.');
  const generated = await collectFiles(sourceDist, objectFormat);
  const apiBase = 'https://api.github.com/repos/sny0/sny0.github.io';
  async function api(method, suffix, deadline = Date.now() + 30_000) {
    const response = await fetch(`${apiBase}${suffix}`, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(Math.max(1, Math.min(30_000, deadline - Date.now()))),
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2026-03-10' },
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    if (!response.ok) throw new Error(redact(`Pages API ${method} ${suffix}: HTTP ${response.status} ${data.message ?? response.statusText}`));
    return { status: response.status, data };
  }
  const { data: settings } = await api('GET', '/pages');
  assert(settings.source?.branch === BRANCH && settings.source?.path === '/' && settings.build_type !== 'workflow',
    'Pages must already publish from gh-pages/(root); this script does not change Pages settings.');
  assert(settings.cname === 'sny0.com', 'Unexpected Pages custom domain.');
  function fetchPages() {
    git(['fetch', '--no-tags', '--no-recurse-submodules', 'origin', `+refs/heads/${BRANCH}:${TRACKING_REF}`]);
    return git(['rev-parse', TRACKING_REF]).stdout.trim();
  }
  function tree(revision, cwd = repoRoot) {
    return parseTree(git(['ls-tree', '-r', '--full-tree', '-z', revision], cwd).stdout);
  }
  function outsideStudy(revision) {
    return tree(revision).filter(({ name }) => name !== 'study' && !name.startsWith('study/')).map(({ record }) => record).join('\0');
  }
  function assertTree(base, revision) {
    const changed = git(['diff', '--name-only', '-z', base, revision]).stdout.split('\0').filter(Boolean);
    assertOnlyStudyPaths(changed);
    assert(outsideStudy(base) === outsideStudy(revision), 'Existing root files or CNAME changed.');
    const published = tree(revision).filter(({ name }) => name.startsWith('study/'));
    assert(published.length === generated.size && published.every(({ name, type, mode, oid }) =>
      type === 'blob' && ['100644', '100755'].includes(mode) && generated.get(name.slice('study/'.length))?.oid === oid),
    'The staged study tree differs from the generated site (possibly Git filters or a concurrent study update).');
  }

  let base = fetchPages();
  assert(tree(base).some(({ name, type, mode }) => name === 'CNAME' && type === 'blob' && mode === '100644'),
    'The existing gh-pages CNAME must be a tracked regular file.');
  const runnerTemp = await realpath(process.env.RUNNER_TEMP);
  const temporary = await mkdtemp(path.join(runnerTemp, 'study-pages-'));
  const worktree = path.join(temporary, 'site');
  let added = false;
  let expectedSha;
  try {
    assert(isWithin(runnerTemp, temporary), 'Invalid temporary directory.');
    git(['worktree', 'add', '--detach', worktree, base]);
    added = true;
    const checkedWorktree = await realpath(worktree);
    assert(checkedWorktree === worktree && isWithin(temporary, checkedWorktree), 'Invalid temporary worktree.');
    const target = path.join(checkedWorktree, 'study');
    assert(path.dirname(target) === checkedWorktree && isWithin(checkedWorktree, target), 'Invalid study replacement target.');
    try {
      const existing = await lstat(target);
      assert(existing.isDirectory() && !existing.isSymbolicLink(), 'Existing study must be a real directory.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    // Only this verified child of the newly-created temporary worktree is replaced.
    await rm(target, { recursive: true, force: true });
    await cp(sourceDist, target, { recursive: true, errorOnExist: true, force: false, dereference: false });
    assertSameFiles(generated, await collectFiles(target, objectFormat));
    git(['add', '--force', '--all', '--', 'study'], worktree);
    const stagedPaths = git(['diff', '--cached', '--name-only', '-z'], worktree).stdout.split('\0').filter(Boolean);
    assertOnlyStudyPaths(stagedPaths);
    const pendingTree = git(['write-tree'], worktree).stdout.trim();
    assertTree(base, pendingTree);
    if (stagedPaths.length) {
      git([...BOT, 'commit', '-m', `Publish study from ${process.env.GITHUB_SHA.slice(0, 12)}`], worktree);
      for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt += 1) {
        expectedSha = git(['rev-parse', 'HEAD'], worktree).stdout.trim();
        assertTree(base, expectedSha);
        const pushed = git(['push', 'origin', `${expectedSha}:refs/heads/${BRANCH}`], repoRoot, true);
        if (pushed.status === 0) break;
        if (attempt === MAX_PUSH_ATTEMPTS) throw new Error(redact(`Non-force push failed after ${attempt} attempts: ${pushed.stderr}`));
        const latest = fetchPages();
        assert(latest !== base, redact(`Push failed without a new gh-pages revision: ${pushed.stderr}`));
        assert(git(['merge-base', '--is-ancestor', base, latest], repoRoot, true).status === 0,
          'gh-pages history was rewritten; refusing to rebase or force-push.');
        console.log(`gh-pages advanced; rebasing the study commit (attempt ${attempt}/${MAX_PUSH_ATTEMPTS}).`);
        const rebased = git([...BOT, 'rebase', latest], worktree, true);
        if (rebased.status !== 0) {
          git(['rebase', '--abort'], worktree, true);
          throw new Error('Concurrent gh-pages changes conflict with study; stopped without force-pushing.');
        }
        base = latest;
        assertSameFiles(generated, await collectFiles(target, objectFormat));
      }
      console.log(`Updated gh-pages/study at ${expectedSha}; other tracked paths and CNAME are unchanged.`);
    } else {
      expectedSha = base;
      console.log(`Generated study is unchanged at ${expectedSha}.`);
    }
  } finally {
    // Both paths are created by this invocation under RUNNER_TEMP, never supplied by a user.
    assert(path.dirname(temporary) === runnerTemp && path.basename(temporary).startsWith('study-pages-'), 'Unsafe cleanup target.');
    if (added) git(['worktree', 'remove', '--force', worktree]);
    await rm(temporary, { recursive: true, force: true });
  }

  // GITHUB_TOKEN pushes do not start a Pages build; request one explicitly.
  // https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build
  const requested = await api('POST', '/pages/builds');
  assert(requested.status === 201, 'Pages did not accept a build request.');
  const deadline = Date.now() + BUILD_TIMEOUT_MS;
  let last = 'no matching build observed';
  while (Date.now() < deadline) {
    const { data: build } = await api('GET', '/pages/builds/latest', deadline);
    last = `${build.commit ?? 'unknown commit'} (${build.status ?? 'unknown status'})`;
    if (build.commit === expectedSha) {
      if (build.status === 'built') {
        console.log(`Pages built the expected gh-pages commit ${expectedSha}: https://sny0.com/study/`);
        if (process.env.GITHUB_STEP_SUMMARY) {
          await appendFile(process.env.GITHUB_STEP_SUMMARY,
            `Published [study](https://sny0.com/study/) from gh-pages commit \`${expectedSha}\`. Existing root files and CNAME were preserved.\n`);
        }
        return;
      }
      assert(!['errored', 'error', 'failed', 'cancelled'].includes(build.status),
        `Pages failed for ${expectedSha}: ${redact(build.error?.message ?? build.status)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(10_000, Math.max(0, deadline - Date.now()))));
  }
  throw new Error(`Timed out waiting for Pages commit ${expectedSha} to become built. Last build: ${last}. gh-pages was updated; inspect Pages before retrying.`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    const token = process.env.GITHUB_TOKEN;
    const message = token ? String(error.message).split(token).join('[REDACTED]') : String(error.message);
    console.error(`Study deployment failed: ${message}`);
    process.exitCode = 1;
  });
}
