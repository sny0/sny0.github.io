"""Import the four existing collections without changing their source files.

Only this manually invoked importer knows the local source locations. Generated
articles and route metadata use collection labels and relative identifiers.
"""
from __future__ import annotations

import argparse
import html
import json
import posixpath
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit


STUDY = Path(__file__).resolve().parents[1]
CPP_DIRS = {
    "01_design_basics": "design/foundations", "02_solid": "design/solid",
    "03_design_patterns": "design/patterns", "04_game_patterns": "game/patterns",
    "05_cpp_language": "languages/cpp", "06_cpp_internals": "runtime/cpp-internals",
    "07_memory_and_runtime": "runtime/memory", "08_build_system": "tools/build",
    "09_unity_and_csharp": "languages/csharp", "10_unreal_engine": "game/unreal",
    "11_case_studies": "design/case-studies", "12_decision_guides": "design/decisions",
    "exercises": "guide/exercises",
}
IT_SLUGS = [
    "learning-map", "computer-and-data", "electricity-cpu-instructions",
    "memory-and-cache", "assembly", "c-language", "pointers-and-memory",
    "compiler-linker-executable", "operating-system", "cpp-language",
    "algorithms-and-game-math", "gpu-architecture", "rendering-pipeline-shaders",
    "graphics-apis", "input-and-game-loop", "engine-architecture-ecs",
    "unity-internals", "unreal-internals", "debugging-and-profiling",
    "button-to-screen", "advanced-topics",
]
IT_DOMAINS = [
    "game", "data", "hardware", "hardware", "languages", "languages",
    "runtime", "compilers", "os", "languages", "algorithms", "hardware",
    "graphics", "graphics", "game", "game", "game", "game", "tools", "game", "game",
]
LABELS = {"cpp": "C++ Wiki", "rendering": "RenderingWiki", "it": "IT教本", "atlas": "設計の手帖"}
DOMAINS = {"data", "hardware", "os", "compilers", "languages", "runtime", "browser", "network", "math", "algorithms", "design", "graphics", "game", "history", "tools"}
ATLAS_HTML_TAGS = set("a abbr address article aside b bdi bdo blockquote br caption cite code col colgroup dd del details dfn div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img kbd li main mark nav ol p pre q rp rt ruby s samp section small span strong sub summary sup table tbody td th thead time tr u ul var wbr".split())

# Explicit public source allowlist. Executables, dumps, build trees and later
# files are never picked up merely because they exist beneath samples/.
SAMPLE_FILES = """
aos_soa_bench.cpp
arena_allocator.cpp
arrays_strings.cpp
atomic_counter.cpp
behavior_tree.cpp
bytecode_vm.cpp
cache_bench.cpp
casts_demo.cpp
cmake_demo/CMakeLists.txt
cmake_demo/include/game/combat.h
cmake_demo/include/game/enemy.h
cmake_demo/src/combat.cpp
cmake_demo/src/enemy.cpp
cmake_demo/src/main.cpp
component_entity.cpp
constexpr_table.cpp
cooldown_set.cpp
design_basics_pickup.cpp
ecs_minimal.cpp
enums_namespaces.cpp
event_bus.cpp
event_queue.cpp
exceptions_raii.cpp
fsm_guard.cpp
game_loop.cpp
inheritance_virtual.cpp
input_actions.cpp
journey_main.cpp
lambdas_functions.cpp
lifetime_demo.cpp
memory_bugs_annotated.cpp
object_pool.cpp
operator_overload.cpp
pattern_abstract_factory.cpp
pattern_adapter.cpp
pattern_bridge.cpp
pattern_builder.cpp
pattern_chain.cpp
pattern_command.cpp
pattern_composite.cpp
pattern_decorator.cpp
pattern_facade.cpp
pattern_factory_method.cpp
pattern_flyweight.cpp
pattern_interpreter.cpp
pattern_iterator.cpp
pattern_mediator.cpp
pattern_memento.cpp
pattern_observer.cpp
pattern_prototype.cpp
pattern_proxy.cpp
pattern_singleton.cpp
pattern_state.cpp
pattern_strategy.cpp
pattern_template_method.cpp
pattern_visitor.cpp
raii_file.cpp
README.md
rule_of_five.cpp
service_locator.cpp
smart_pointers.cpp
solid_shop.cpp
spatial_grid.cpp
static_inline.cpp
stl_basics.cpp
struct_layout.cpp
templates_basic.cpp
tu_demo/enemy.cpp
tu_demo/enemy.h
tu_demo/main.cpp
tu_demo/radar.cpp
tu_demo/radar.h
tu_demo/README.md
type_object.cpp
ub_examples.cpp
values_and_refs.cpp
vtable_size.cpp
""".strip().splitlines()


def slug(stem: str) -> str:
    return re.sub(r"^\d+_", "", stem).replace("_", "-")


def route(path: str) -> str:
    path = path.removesuffix(".md")
    return "/" + (path[:-5] if path.endswith("/index") else path + ".html")


def plain(value: str) -> str:
    value = re.sub(r"<[^>]*>", " ", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", value)
    return re.sub(r"\s+", " ", html.unescape(value).replace("`", "").replace("**", "")).strip()


def summary(body: str, fallback: str) -> str:
    fenced = False
    candidates = []
    for line in body.splitlines():
        if re.match(r"\s*(```|~~~)", line):
            fenced = not fenced
            continue
        s = line.strip()
        if fenced or not s or s.startswith(("#", "|", "---", ":::")):
            continue
        if s.startswith(("<", "前:", "次:")):
            continue
        s = plain(re.sub(r"^(?:[-*]|\d+\.)\s+", "", s))
        if s:
            candidates.append(s)
        if sum(map(len, candidates)) >= 85:
            break
    return (" ".join(candidates) or fallback)[:150]


def quote_yaml(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def frontmatter(title: str, source: str, kind: str, status: str, desc: str) -> str:
    fields = {"source": source, "kind": kind, "status": status, "summary": desc}
    return "---\ntitle: " + quote_yaml(title) + "\nstudy:\n" + "".join("  " + key + ": " + quote_yaml(value) + "\n" for key, value in fields.items()) + "---\n\n"


def scalar(value: str) -> str:
    value = value.strip()
    if value.startswith('"'):
        return json.loads(value)
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1].replace("''", "'")
    return value


def home_to_article(source: str) -> tuple[str, str]:
    """Retain the existing single-line hero/actions/features from the source home."""
    fm, rest = source[4:].split("\n---", 1)
    hero, actions, features = {}, [], []
    section = ""
    for line in fm.splitlines():
        if line == "hero:":
            section = "hero"
        elif line.strip() == "actions:":
            section = "actions"
        elif line == "features:":
            section = "features"
        elif section == "hero" and re.match(r"  \w+:", line):
            key, value = line.strip().split(":", 1)
            hero[key] = scalar(value)
        elif section in ("actions", "features"):
            m = re.match(r"\s*(- )?(\w+):\s*(.*)", line)
            if not m:
                continue
            items = actions if section == "actions" else features
            if m[1]:
                items.append({})
            if items:
                items[-1][m[2]] = scalar(m[3])
    title = hero.get("name", "リアルタイムグラフィックス完全Wiki")
    lines = ["# " + title, "", hero.get("text", ""), "", hero.get("tagline", ""), ""]
    lines.extend(f"- [{x['text']}]({x['link']})" for x in actions)
    for f in features:
        lines.extend(["", "## " + f["title"], "", f.get("details", ""), "", f"[この項目を読む]({f['link']})"])
    return title, "\n".join(lines) + "\n" + rest.lstrip()


def extract_atlas(path: Path, node: str) -> dict:
    if path.suffix == ".json":
        return json.loads(path.read_text(encoding="utf-8-sig"))
    program = "const fs=require('node:fs'),vm=require('node:vm');const s=fs.readFileSync(process.argv[1],'utf8');process.stdout.write(vm.runInNewContext(s+'\\nJSON.stringify({chapters,dictionary,patterns,sources})',{}, {timeout:3000}));"
    result = subprocess.run([node, "-e", program, str(path)], check=True, capture_output=True, encoding="utf-8")
    return json.loads(result.stdout)


def atlas_html(value: str) -> str:
    """Keep prose markup, but do not parse C++ template tokens as HTML tags.

    v-pre disables Vue expression handling, not HTML parsing. Normalizing code
    contents through one decode/encode pass also preserves existing entities.
    The source tables have bare std::unique_ptr<T>/std::shared_ptr<T> text, so
    unknown tag-like tokens outside code need the same literal treatment.
    """
    value = re.sub(
        r"(<code\b[^>]*>)([\s\S]*?)(</code\s*>)",
        lambda m: m[1] + html.escape(html.unescape(m[2]), quote=False) + m[3],
        value, flags=re.I,
    )
    return literal_html_angles(value)


def literal_html_angles(value: str) -> str:
    """Protect known HTML, make remaining literal '<' safe for Vue templates.

    Escaping the opening angle is sufficient and preserves Markdown blockquote
    markers. It also handles nested types such as vector<unique_ptr<Base>>.
    """
    markup = re.compile(r"<!--[\s\S]*?-->|</?([A-Za-z][\w-]*)(?=[\s/>])[^<>]*>")
    result, cursor = [], 0
    for match in markup.finditer(value):
        result.append(value[cursor:match.start()].replace("<", "&lt;"))
        keep = match[0].startswith("<!--") or match[1].lower() in ATLAS_HTML_TAGS
        result.append(match[0] if keep else match[0].replace("<", "&lt;"))
        cursor = match.end()
    result.append(value[cursor:].replace("<", "&lt;"))
    return "".join(result)


def markdown_literal_angles(line: str) -> str:
    # Backtick code spans already render their contents literally. Re-escaping
    # those would display entity spellings rather than the original code.
    result, cursor = [], 0
    for match in re.finditer(r"(`+)(.*?)\1(?!`)", line):
        result.append(literal_html_angles(line[cursor:match.start()]))
        result.append(match[0])
        cursor = match.end()
    result.append(literal_html_angles(line[cursor:]))
    return "".join(result)


def verify_atlas_html(fragments: list[dict], node: str) -> None:
    program = """const fs=require('node:fs');
const {parse}=require('@vue/compiler-dom');
const errors=[];
for(const f of JSON.parse(fs.readFileSync(0,'utf8'))){
  parse('<div v-pre>'+f.html+'</div>',{onError:e=>errors.push({chapter:f.chapter,section:f.section,message:e.message})});
}
process.stdout.write(JSON.stringify(errors));
if(errors.length)process.exitCode=1;
"""
    result = subprocess.run([node, "-e", program], cwd=STUDY,
                            input=json.dumps(fragments, ensure_ascii=False),
                            capture_output=True, encoding="utf-8")
    if result.returncode:
        raise ValueError("Atlas HTML parser validation failed: " + (result.stdout or result.stderr))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cpp-root", type=Path, required=True)
    parser.add_argument("--rendering-root", type=Path, required=True)
    parser.add_argument("--it-root", type=Path, required=True)
    parser.add_argument("--atlas", type=Path, required=True)
    parser.add_argument("--node", default="node")
    args = parser.parse_args()
    docs = STUDY / "docs"
    roots = {"cpp": args.cpp_root / "docs", "rendering": args.rendering_root / "docs", "it": args.it_root}
    pages, by_path, route_map, unresolved, samples_used = [], {}, {}, [], set()

    def add(collection: str, original: str, dest: str, body: str, *, title: str = "", domain: str = "", kind: str = "本文", status: str = "既存原稿", desc: str = "", aliases: list[str] | None = None, source_path: Path | None = None, auxiliary: bool = False) -> None:
        if any(p["dest"] == dest for p in pages):
            raise ValueError("Destination collision: " + dest)
        heading = re.search(r"^#\s+(.+)$", body, re.M)
        title = title or (plain(heading[1]) if heading else Path(dest).stem)
        if not heading:
            body = "# " + title + "\n\n" + body
        desc = desc or summary(body, title)
        domain = domain or dest.split("/", 1)[0]
        if domain not in DOMAINS:
            domain = "design"
        item = dict(collection=collection, original=original, dest=dest, body=body, title=title, domain=domain, kind=kind, status=status, summary=desc, aliases=aliases or [], auxiliary=auxiliary)
        pages.append(item)
        route_map[collection + ":" + original] = route(dest)
        if source_path:
            by_path[str(source_path.resolve()).casefold()] = item

    for path in sorted(roots["cpp"].rglob("*.md")):
        rel = path.relative_to(roots["cpp"])
        if rel.as_posix() == "review_report.md":
            continue
        if len(rel.parts) == 1:
            assert path.stem in {"index", "glossary", "references", "roadmap"}, rel
            dest = "guide/cpp-" + path.stem + ".md"
            kind = {"index": "索引", "glossary": "用語", "references": "参考資料", "roadmap": "学習ガイド"}[path.stem]
            domain = "languages" if path.stem == "glossary" else "design"
        else:
            dest = CPP_DIRS[rel.parts[0]] + "/" + slug(path.stem) + ".md"
            kind = "索引" if path.stem == "index" else "演習" if path.stem in ("exercises", "answers") else "本文"
            domain = "design" if dest.startswith("guide/") else dest.split("/")[0]
        add("cpp", "docs/" + rel.as_posix(), dest, path.read_text(encoding="utf-8-sig"), domain=domain, kind=kind, source_path=path)

    for path in sorted(roots["rendering"].rglob("*.md")):
        rel = path.relative_to(roots["rendering"])
        text, title = path.read_text(encoding="utf-8-sig"), ""
        if rel.as_posix() == "index.md":
            dest = "graphics/rendering-intro.md"
            title, text = home_to_article(text)
            domain, kind = "graphics", "索引"
        else:
            prefix = {"math": "math/rendering", "gpu": "hardware/gpu", "guide": "guide/rendering"}.get(rel.parts[0], "graphics/" + rel.parts[0])
            dest = prefix + "/" + path.name
            domain = "graphics" if rel.parts[0] == "guide" else dest.split("/")[0]
            kind = "学習ガイド" if rel.parts[0] == "guide" else "本文"
        add("rendering", "docs/" + rel.as_posix(), dest, text, title=title, domain=domain, kind=kind, source_path=path)

    for path in sorted(roots["it"].glob("*.md")):
        if path.name == "README.md":
            dest, domain = "guide/low-level/index.md", "game"
        else:
            number = int(path.name[:2])
            dest, domain = "guide/low-level/" + IT_SLUGS[number] + ".md", IT_DOMAINS[number]
        add("it", path.name, dest, path.read_text(encoding="utf-8-sig"), domain=domain, kind="学習ガイド", status="学習計画・概要", source_path=path)

    atlas = extract_atlas(args.atlas, args.node)
    assert len(atlas["chapters"]) == 16 and len(atlas["dictionary"]) == 50 and len(atlas["patterns"]) == 16 and len(atlas["sources"]) == 13
    source_lookup = {s["id"]: s for s in atlas["sources"]}
    chapter_lookup = {c["id"]: c for c in atlas["chapters"]}
    examples_imported = 0
    html_fragments = []
    retained_fields = {"sections_html": 0, "examples_cpp": 0, "examples_cs": 0, "checks": 0, "chapter_refs": 0, "tags": 0}

    def fenced(language: str, value: str) -> str:
        fence = "`" * max(3, max((len(x) + 1 for x in re.findall(r"`+", value)), default=3))
        return fence + language + "\n" + value.rstrip() + "\n" + fence

    for c in atlas["chapters"]:
        fields = ["# " + html.escape(c["title"]), "", c["lead"], "", " / ".join([c["group"], c["short"], c["en"], c["level"], str(c["minutes"]) + "分"]), "", "タグ: " + " / ".join(c["tags"])]
        retained_fields["tags"] += len(c["tags"])
        for section in c["sections"]:
            safe_html = atlas_html(section["html"])
            html_fragments.append({"chapter": c["id"], "section": section["title"], "html": safe_html})
            fields += ["", "## " + html.escape(section["title"]), "", "<div v-pre>", "", safe_html, "", "</div>"]
            retained_fields["sections_html"] += 1
            if "example" in section:
                e = section["example"]
                fields += ["", "### " + html.escape(e["caption"]), "", "::: code-group", ""]
                for language, field, caption in [("cpp", "cpp", "C++"), ("csharp", "cs", "C#")]:
                    if field in e:
                        fields += [fenced(language + " [" + caption + "]", e[field]), ""]
                        retained_fields["examples_" + field] += 1
                fields += [":::"]
                examples_imported += 1
        fields += ["", "## 理解度チェック", "", c["check"], "", "## この章の参考資料", ""]
        retained_fields["checks"] += 1
        for ident in c["refs"]:
            s = source_lookup[ident]
            fields += [f"- [{s['title']}]({s['url']}) — {s['author']}。{s['desc']}"]
            retained_fields["chapter_refs"] += 1
        fields += ["", "[クラス名辞典](/design/naming) / [パターン一覧](/design/pattern-index) / [手帖の参考資料](/design/notebook-references)", ""]
        add("atlas", "chapter/" + c["id"], "design/notebook/" + c["id"] + ".md", "\n".join(fields), title=c["title"], domain="design", desc=c["lead"], aliases=c["tags"])

    verify_atlas_html(html_fragments, args.node)

    naming = ["# クラス名辞典", "", "設計の手帖に収録されている50の名前を、役割・例・注意点から引く辞典です。", ""]
    for d in atlas["dictionary"]:
        naming += [f"## {d['name']} {{#{d['id']}}}", "", f"分類: {d['category']}", "", d["role"], "", fenced("text", d["example"]), "", d["caution"], "", f"[{chapter_lookup[d['chapter']]['short']}](/design/notebook/{d['chapter']})", ""]
    add("atlas", "dictionary", "design/naming.md", "\n".join(naming), kind="用語", auxiliary=True, aliases=[d["name"] for d in atlas["dictionary"]])
    patterns = ["# 設計パターンの索引", ""]
    for p in atlas["patterns"]:
        patterns += ["## " + p["name"], "", "分類: " + p["category"], "", p["purpose"], "", "使う場面: " + p["when"], "", f"[{chapter_lookup[p['chapter']]['short']}](/design/notebook/{p['chapter']})", ""]
    add("atlas", "patterns", "design/pattern-index.md", "\n".join(patterns), kind="索引", auxiliary=True)
    references = ["# 設計の手帖の参考資料", ""]
    for s in atlas["sources"]:
        references += [f"## {s['title']} {{#{s['id']}}}", "", s["author"], "", f"[資料を開く]({s['url']})", "", s["desc"], ""]
    add("atlas", "sources", "design/notebook-references.md", "\n".join(references), kind="参考資料", auxiliary=True)

    for folder in ("cmake_demo", "tu_demo"):
        files = [x for x in SAMPLE_FILES if x.startswith(folder + "/")]
        body = "# C++サンプル: " + folder + "\n\nC++ Wikiで参照するソース一式です。コンパイル済み実行物は配布しません。\n\n" + "\n".join(f"- [{x[len(folder)+1:]}](/samples/cpp/{x})" for x in files) + "\n"
        add("cpp", "samples/" + folder + "/", "tools/build/samples/" + folder.replace("_", "-") + ".md", body, domain="tools", kind="サンプル索引", auxiliary=True)

    sample_readme = args.cpp_root / "samples" / "README.md"
    sample_index = sample_readme.read_text(encoding="utf-8-sig") + "\n\n## 配布するソースファイル\n\n" + "\n".join(f"- [{x}](/samples/cpp/{x})" for x in SAMPLE_FILES) + "\n"
    add("cpp", "samples/", "tools/build/samples/index.md", sample_index, domain="tools", kind="サンプル索引", auxiliary=True)

    public_urls = {route(p["dest"]) for p in pages}
    sample_root = args.cpp_root / "samples"
    sample_dest = docs / "public" / "samples" / "cpp"
    allowed_samples = {str((sample_root / x).resolve()).casefold(): x for x in SAMPLE_FILES}
    for name in SAMPLE_FILES:
        if not (sample_root / name).is_file():
            raise ValueError("Missing allowlisted sample: " + name)

    def resolve_link(href: str, page: dict) -> str:
        value = html.unescape(href)
        parsed = urlsplit(value)
        if parsed.scheme or value.startswith("//"):
            if parsed.scheme == "file":
                unresolved.append({"source": page["collection"] + ":" + page["original"], "link": "[local file URL omitted]"})
                return "#"
            return href
        if page["collection"] == "atlas" and value.startswith("#"):
            key = value[1:]
            if key.startswith("chapter/") or key in {"dictionary", "patterns", "sources"}:
                return route_map["atlas:" + key]
            if key == "home":
                return "/design/"
            return href
        if not parsed.path:
            return href
        suffix = ("?" + parsed.query if parsed.query else "") + ("#" + parsed.fragment if parsed.fragment else "")
        target_text = unquote(parsed.path)
        if target_text.startswith("/study/samples/cpp/"):
            return href
        if target_text.startswith("/samples/cpp/"):
            return "/study" + target_text + suffix
        if target_text in public_urls:
            return href
        # Generated cross-collection links use stable logical slugs; make the
        # actual .html URL explicit for hosts without extensionless rewrites.
        if target_text + ".html" in public_urls:
            return target_text + ".html" + suffix
        if target_text.rstrip("/") + "/" in public_urls:
            return target_text.rstrip("/") + "/" + suffix
        if target_text in {"/" + d + "/" for d in DOMAINS}:
            return href
        collection = page["collection"]
        if collection == "atlas":
            unresolved.append({"source": "atlas:" + page["original"], "link": href})
            return href
        root = roots[collection]
        if target_text.startswith("/"):
            original_target = root / target_text.lstrip("/")
        else:
            source_relative = page["original"][5:] if collection in ("cpp", "rendering") else page["original"]
            original_target = root / Path(source_relative).parent / target_text
        candidates = [original_target]
        if original_target.suffix == ".html":
            candidates.append(original_target.with_suffix(".md"))
        if not original_target.suffix:
            candidates += [original_target.with_suffix(".md"), original_target / "index.md", original_target / "README.md"]
        for candidate in candidates:
            item = by_path.get(str(candidate.resolve()).casefold())
            if item:
                return route(item["dest"]) + suffix
        normalized = str(original_target.resolve()).casefold()
        if normalized in allowed_samples:
            name = allowed_samples[normalized]
            samples_used.add(name)
            return "/study/samples/cpp/" + name + suffix
        for folder in ("cmake_demo", "tu_demo"):
            if normalized == str((sample_root / folder).resolve()).casefold():
                return route_map["cpp:samples/" + folder + "/"] + suffix
        if normalized == str(sample_root.resolve()).casefold():
            return route_map["cpp:samples/"] + suffix
        if parsed.path.endswith("review_report.md"):
            return "/guide/cpp-index.html"
        # Public metadata records a relative identifier, never a host path.
        unresolved.append({"source": collection + ":" + page["original"], "link": href})
        return href

    def rewrite(body: str, page: dict) -> str:
        lines, active_fence = [], None
        md_link = re.compile(r"(!?\[([^\]\n]*)\]\()([^\s)]+)(\))")
        html_link = re.compile(r"(\b(?:href|src)=)([\"'])([^\"']+)([\"'])")
        for line in body.splitlines(keepends=True):
            fence = re.match(r"\s*(`{3,}|~{3,})", line)
            if fence:
                if active_fence is None:
                    active_fence = fence[1][0]
                elif fence[1][0] == active_fence:
                    active_fence = None
                lines.append(line)
                continue
            if active_fence:
                lines.append(line)
                continue
            if page["collection"] in ("cpp", "it"):
                line = markdown_literal_angles(line)
            def replace_markdown(m):
                target = resolve_link(m[3], page)
                if target.startswith("/study/samples/cpp/") and not m[1].startswith("!"):
                    # Markdown links to nonstandard source extensions would be
                    # treated as document routes (.cpp.html) by VitePress.
                    return '<a href="' + html.escape(target, quote=True) + '">' + html.escape(plain(m[2])) + '</a>'
                return m[1] + target + m[4]
            line = md_link.sub(replace_markdown, line)
            def replace_html(m):
                target = resolve_link(m[3], page)
                # v-pre HTML is not rewritten by VitePress's Markdown linker.
                # Public raw hrefs therefore include the actual /study base.
                if target.startswith("/") and not target.startswith(("//", "/study/")):
                    target = "/study" + target
                return m[1] + m[2] + html.escape(target, quote=True) + m[4]
            line = html_link.sub(replace_html, line)
            lines.append(line)
        return "".join(lines)

    catalog = []
    for p in pages:
        p["body"] = rewrite(p["body"], p)
        text = frontmatter(p["title"], LABELS[p["collection"]], p["kind"], p["status"], p["summary"]) + p["body"]
        if re.search(r"(?:file:///|[A-Z]:[\\/](?:ClaudeCode|IT教本|プログラミング学習))", text, re.I):
            raise ValueError("Local source path leaked in " + p["dest"])
        out = docs / p["dest"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text.rstrip() + "\n", encoding="utf-8")
        catalog.append({"title": p["title"], "url": route(p["dest"]), "domain": p["domain"], "kind": p["kind"], "summary": p["summary"], "source": LABELS[p["collection"]], "status": p["status"], "aliases": p["aliases"]})

    for name in SAMPLE_FILES:
        out = sample_dest / name
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(sample_root / name, out)
    meta = docs / ".vitepress"
    meta.mkdir(parents=True, exist_ok=True)
    (meta / "catalog-core.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts = {key: sum(p["collection"] == key and not p["auxiliary"] for p in pages) for key in LABELS}
    assert counts == {"cpp": 161, "rendering": 68, "it": 22, "atlas": 16}, counts
    assert examples_imported == 9 and retained_fields["checks"] == 16
    metadata = {"version": 1, "routes": route_map, "excluded": ["cpp:docs/review_report.md"], "counts": {"original_public_units": sum(counts.values()), "by_source": counts, "auxiliary_pages": sum(p["auxiliary"] for p in pages), "catalog_entries": len(catalog), "sample_source_files": len(SAMPLE_FILES), "atlas_dictionary": len(atlas["dictionary"]), "atlas_patterns": len(atlas["patterns"]), "atlas_sources": len(atlas["sources"]), "atlas_examples": examples_imported}, "atlas_retained_fields": retained_fields, "atlas_html_validation": {"parser": "@vue/compiler-dom", "fragments": len(html_fragments), "errors": 0}, "unresolved_links": unresolved}
    (meta / "route-map.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"counts": metadata["counts"], "atlas_retained_fields": retained_fields, "atlas_html_validation": metadata["atlas_html_validation"], "unresolved_links": unresolved}, ensure_ascii=False, indent=2))
    if unresolved:
        raise SystemExit("Import completed with unresolved links; review route-map.json before publishing.")


if __name__ == "__main__":
    main()
