import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdtemp, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { assertOnlyStudyPaths, collectFiles } from './deploy-pages.mjs';

const BRANCH = 'gh-pages';
const TRACKING_REF = `refs/remotes/origin/${BRANCH}`;
const REPOSITORY = 'https://github.com/sny0/sny0.github.io.git';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function treeEntries(text) {
  return text.split('\0').filter(Boolean).map((record) => {
    const tab = record.indexOf('\t');
    assert(tab !== -1, 'Invalid Git tree record.');
    const [mode, type, oid] = record.slice(0, tab).split(' ');
    return { mode, type, oid, name: record.slice(tab + 1), record };
  });
}

function sameFiles(expected, actual) {
  assert(expected.size === actual.size && [...expected].every(([name, file]) => actual.get(name)?.sha256 === file.sha256),
    'The copied study directory does not exactly match the built site.');
}

async function optionalStat(filename) {
  try { return await lstat(filename); } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function main() {
  assert(process.env.GITHUB_ACTIONS !== 'true', 'Use deploy-pages.mjs for GitHub Actions; this command uses normal local Git authentication.');
  const { values } = parseArgs({
    options: {
      'repo-root': { type: 'string' },
      'source-dist': { type: 'string' },
      publish: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      // Local validation can inspect an already-fetched revision without network access.
      offline: { type: 'boolean', default: false },
    },
    strict: true,
  });
  assert(!(values.publish && values['dry-run']), '--publish and --dry-run cannot be combined.');
  assert(!(values.publish && values.offline), '--offline is permitted only for a dry run.');
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const scriptRepo = await realpath(path.resolve(scriptDir, '../..'));
  const repoRoot = await realpath(path.resolve(values['repo-root'] ?? scriptRepo));
  assert(repoRoot === scriptRepo, '--repo-root must be the repository containing this script.');
  const studyRoot = await realpath(path.join(repoRoot, 'study'));
  assert(studyRoot === path.join(repoRoot, 'study'), 'The study directory must not be a symlink.');
  const expectedDist = path.join(studyRoot, 'docs', '.vitepress', 'dist');
  assert(path.resolve(values['source-dist'] ?? expectedDist) === expectedDist,
    'Only study/docs/.vitepress/dist may be published; source Markdown is never copied.');
  const sourceDist = await realpath(expectedDist);
  assert(sourceDist === expectedDist, 'The built-site path must not contain a symlink.');

  // Do not read tokens or credential stores. Git uses the user's configured credential helper.
  // Disable interactive prompts so a missing login fails instead of waiting for a password.
  const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
  delete gitEnv.GITHUB_TOKEN;
  delete gitEnv.GH_TOKEN;
  for (const name of Object.keys(gitEnv)) {
    if (name.startsWith('GIT_TRACE') || name === 'GIT_CURL_VERBOSE') delete gitEnv[name];
  }
  function git(args, cwd = repoRoot, allowFailure = false, extraEnv = {}) {
    const result = spawnSync('git', args, {
      cwd, env: { ...gitEnv, ...extraEnv }, encoding: 'utf8', timeout: 120_000, maxBuffer: 32 * 1024 * 1024,
    });
    if (result.error || (result.status !== 0 && !allowFailure)) {
      // Avoid printing raw credential-helper output or authentication diagnostics.
      throw new Error(`Git ${args[0]} failed (${result.error?.code ?? result.status}). Check ordinary Git authentication and repository access, then retry.`);
    }
    return result;
  }
  assert(await realpath(git(['rev-parse', '--show-toplevel']).stdout.trim()) === repoRoot,
    'The specified directory is not the repository root.');
  const origin = git(['remote', 'get-url', 'origin']).stdout.trim();
  assert(/^https:\/\/github\.com\/sny0\/sny0\.github\.io(?:\.git)?\/?$/i.test(origin),
    `Origin must be ${REPOSITORY}, without embedded credentials.`);
  // A distinct push URL could otherwise bypass the origin URL check.
  const pushUrls = git(['remote', 'get-url', '--push', '--all', 'origin']).stdout.trim().split(/\r?\n/);
  assert(pushUrls.length === 1 && /^https:\/\/github\.com\/sny0\/sny0\.github\.io(?:\.git)?\/?$/i.test(pushUrls[0]),
    'Origin must have exactly one HTTPS push destination for sny0/sny0.github.io.');
  const objectFormat = git(['rev-parse', '--show-object-format']).stdout.trim();
  assert(['sha1', 'sha256'].includes(objectFormat), 'Unsupported Git object format.');
  const generated = await collectFiles(sourceDist, objectFormat);

  if (!values.offline) {
    git(['fetch', '--no-tags', '--no-recurse-submodules', 'origin', `+refs/heads/${BRANCH}:${TRACKING_REF}`]);
  }
  const base = git(['rev-parse', '--verify', TRACKING_REF]).stdout.trim();
  const tree = (revision, cwd = repoRoot) => treeEntries(git(['ls-tree', '-r', '--full-tree', '-z', revision], cwd).stdout);
  const baseline = tree(base);
  assert(baseline.every(({ mode }) => mode !== '120000'), 'Existing gh-pages contains a symlink; inspect it before publishing.');
  for (const name of ['CNAME', '.nojekyll']) {
    assert(baseline.some((entry) => entry.name === name && entry.type === 'blob' && ['100644', '100755'].includes(entry.mode)),
      `Existing gh-pages must contain a tracked regular ${name} file.`);
  }
  assert(git(['show', `${base}:CNAME`]).stdout.trim() === 'sny0.com', 'Existing CNAME must contain sny0.com.');
  const outside = (entries) => entries.filter(({ name }) => name !== 'study' && !name.startsWith('study/')).map(({ record }) => record).join('\0');
  const preservedRoot = outside(baseline);
  function verifyTree(revision) {
    assertOnlyStudyPaths(git(['diff', '--name-only', '-z', base, revision]).stdout.split('\0').filter(Boolean));
    const entries = tree(revision);
    assert(outside(entries) === preservedRoot, 'A file outside study/ changed, including CNAME or .nojekyll.');
    const published = entries.filter(({ name }) => name.startsWith('study/'));
    assert(published.length === generated.size && published.every(({ name, mode, type, oid }) =>
      type === 'blob' && ['100644', '100755'].includes(mode) && generated.get(name.slice('study/'.length))?.oid === oid),
    'The staged/committed study tree differs from the built site (possibly a Git attribute/filter).');
  }

  const temporary = await mkdtemp(path.join(studyRoot, '.pages-worktree-'));
  let worktreeAdded = false;
  let result;
  async function verifyTemporary() {
    assert(path.dirname(path.resolve(temporary)) === studyRoot && path.basename(temporary).startsWith('.pages-worktree-'),
      'Unsafe temporary worktree cleanup target.');
    const info = await optionalStat(temporary);
    if (info) {
      assert(info.isDirectory() && !info.isSymbolicLink() && await realpath(temporary) === temporary,
        'Temporary worktree changed into a symlink or an unexpected directory.');
    }
  }
  try {
    await verifyTemporary();
    // The containing study/.gitignore must exclude temporary generated files from main.
    assert(git(['check-ignore', '--quiet', `${path.relative(repoRoot, temporary).split(path.sep).join('/')}/`], repoRoot, true).status === 0,
      'Temporary worktrees must be ignored by the source repository.');
    git(['worktree', 'add', '--detach', temporary, base]);
    worktreeAdded = true;
    await verifyTemporary();
    const target = path.join(temporary, 'study');
    assert(path.dirname(path.resolve(target)) === temporary && target !== sourceDist, 'Unsafe study replacement target.');
    const existing = await optionalStat(target);
    assert(!existing || (existing.isDirectory() && !existing.isSymbolicLink() && await realpath(target) === target),
      'Existing study target is not a real directory inside the temporary worktree.');
    // Only this checked child of our newly-created worktree may be removed.
    await rm(target, { recursive: true, force: true });
    await cp(sourceDist, target, { recursive: true, errorOnExist: true, force: false, dereference: false });
    sameFiles(generated, await collectFiles(target, objectFormat));
    git(['-c', 'core.autocrlf=false', 'add', '--force', '--all', '--', 'study'], temporary);
    const changed = git(['diff', '--cached', '--name-only', '-z'], temporary).stdout.split('\0').filter(Boolean);
    assertOnlyStudyPaths(changed);
    const pendingTree = git(['write-tree'], temporary).stdout.trim();
    verifyTree(pendingTree);
    console.log(`Prepared ${generated.size} generated files against gh-pages ${base}.`);
    console.log('Verified: CNAME=sny0.com, tracked .nojekyll, unchanged root tree, no symlinks, and exact generated study content.');
    if (!values.publish) {
      console.log(`Dry run only${values.offline ? ' (using the already-fetched revision)' : ''}: ${changed.length} changed paths; no commit or push. Use --publish to publish with normal Git authentication.`);
      result = { mode: 'dry-run', base, tree: pendingTree, changedPaths: changed.length };
    } else if (!changed.length) {
      console.log(`No generated files changed; nothing was committed or pushed. Existing gh-pages SHA: ${base}`);
      result = { mode: 'unchanged', sha: base };
    } else {
      // Use a public noreply identity rather than copying the user's private local email.
      git(['commit', '-m', 'Publish study (manual)'], temporary, false, {
        GIT_AUTHOR_NAME: 'sny0', GIT_AUTHOR_EMAIL: '84428073+sny0@users.noreply.github.com',
        GIT_COMMITTER_NAME: 'sny0', GIT_COMMITTER_EMAIL: '84428073+sny0@users.noreply.github.com',
      });
      const commit = git(['rev-parse', 'HEAD'], temporary).stdout.trim();
      verifyTree(commit);
      sameFiles(generated, await collectFiles(target, objectFormat));
      const remote = git(['ls-remote', '--exit-code', 'origin', `refs/heads/${BRANCH}`]).stdout.trim().split(/\s+/)[0];
      assert(remote === base, 'gh-pages changed concurrently; stopped without pushing. Re-run preparation against the new revision.');
      // Explicit destination, no force option. A race after ls-remote is rejected by Git.
      const pushed = git(['push', 'origin', `${commit}:refs/heads/${BRANCH}`], repoRoot, true);
      assert(pushed.status === 0, 'Non-force push failed. No retry/rebase was attempted; inspect Git access and concurrent gh-pages updates.');
      console.log(`Pushed gh-pages ${commit}. The normal user push should trigger Pages; confirm this exact SHA becomes built before reporting the site as published.`);
      result = { mode: 'pushed', sha: commit };
    }
  } finally {
    await verifyTemporary();
    const removed = git(['worktree', 'remove', '--force', temporary], repoRoot, true);
    if (worktreeAdded && removed.status !== 0) {
      throw new Error(`Temporary worktree cleanup failed; inspect the ignored directory ${temporary} before removing it.`);
    }
    await verifyTemporary();
    if (await optionalStat(temporary)) await rm(temporary, { recursive: true, force: true });
  }
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Manual study publication stopped: ${error.message}`);
    process.exitCode = 1;
  });
}
