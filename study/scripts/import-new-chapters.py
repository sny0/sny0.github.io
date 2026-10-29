"""Import the standalone ECS/history drafts into the public study site.

Run manually with --input-root /path/to/study-review. The generated Markdown
and JSON are committed; the CI build does not need this external input folder.
"""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path


DOCS = Path(__file__).resolve().parents[1] / "docs"
PUBLIC_LINKS = {
    "review.html#allocation-internals": "/study/runtime/",
    "review.html#chapter-audit-details": "/study/guide/learning-paths.html",
    "review.html#expanded-scope": "/study/",
}


def read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected an object: {path.name}")
    return value


def quote(value: str) -> str:
    # JSON strings are also valid YAML scalars.
    return json.dumps(value, ensure_ascii=False)


def frontmatter(title: str, summary: str) -> str:
    return "\n".join([
        "---", f"title: {quote(title)}", f"description: {quote(summary)}",
        "study:", '  source: "新規執筆"', '  kind: "本文草稿"',
        '  status: "草稿"', f"  summary: {quote(summary)}", "---", "",
    ])


def public_html(body: str) -> str:
    for old, new in PUBLIC_LINKS.items():
        body = body.replace(old, new)
    body = body.replace("関連する統合計画：", "関連する分野：")
    body = body.replace("同期・非同期、データ構造、計測の加筆案", "学習経路と関連分野")
    # This source block describes a migration task, rather than ECS itself.
    # Keep its useful reading connections as links to the public counterparts.
    body = re.sub(
        r'<div class="callout"><strong>既存原稿とのつなぎ方</strong>.*?</div>',
        '<div class="callout"><strong>関連する読み物</strong><p>'
        '<a href="/study/game/patterns/component-and-ecs.html">ComponentとECS</a>'
        'では部品方式との比較を、'
        '<a href="/study/samples/cpp/ecs_minimal.cpp">最小C++サンプル</a>'
        'では同じComponent構成の並行配列を処理する例を扱います。'
        '<a href="/study/guide/low-level/engine-architecture-ecs.html">'
        'ゲームエンジンアーキテクチャとECS</a>も併せて参照できます。'
        '</p></div>', body, flags=re.DOTALL,
    )
    if re.search(r"<script\b|\son\w+\s*=|javascript:", body, re.IGNORECASE):
        raise ValueError("Executable HTML is not allowed in imported draft bodies")
    # A pre block must begin its own Markdown HTML block. Otherwise a blank
    # line inside code can end a preceding <p>-style HTML block, and Markdown
    # inserts paragraph tags into the code. Leave the pre/code contents intact.
    body = re.sub(r"(<pre\b)", r"\n\n\1", body)
    body = body.replace("</pre>", "</pre>\n\n")
    return '<div class="study-source-prose" v-pre>\n\n' + body.strip() + '\n\n</div>\n'


def markdown_text(value: str) -> str:
    return html.escape(str(value), quote=False).replace("|", "\\|").replace("\n", "<br>")


def source_link(source: list[str]) -> str:
    title, url = source
    if not url.startswith(("https://", "http://")):
        raise ValueError(f"Non-public source URL: {url}")
    label = title.replace("[", "\\[").replace("]", "\\]")
    return f"[{label}](<{url}>)"


def append_sections(parts: list[str], sections: list[dict]) -> None:
    ids = [section["id"] for section in sections]
    if len(ids) != len(set(ids)):
        raise ValueError("Section IDs must be unique")
    for section in sections:
        if not section.get("body"):
            raise ValueError(f"Empty section: {section['id']}")
        parts.append(f"## {section['title']} {{#{section['id']}}}\n")
        if section.get("summary"):
            parts.append(section["summary"] + "\n")
        parts.append(public_html(section["body"]))


def import_ecs(data: dict) -> tuple[str, dict]:
    summary = "EntityのIDと寿命、Componentの配置、Query、構成変更、並列実行と性能判断を説明します。"
    parts = [frontmatter(data["title"], summary), f"# {data['title']}\n"]
    parts.extend([
        "::: info 草稿と検証範囲",
        data["verification"],
        f"資料の参照日：{data['checked_at']}。実装の実行検証日を示すものではありません。",
        ":::\n",
    ])
    append_sections(parts, data["sections"])
    parts.append("## 参考資料\n")
    parts.extend(f"- {source_link(source)}" for source in data["sources"].values())
    entry = {
        "title": data["title"], "url": "/game/ecs.html", "domain": "game",
        "kind": "本文草稿", "summary": summary, "source": "新規執筆", "status": "草稿",
        "aliases": ["ECS", "Entity Component System", "エンティティ・コンポーネント・システム", "Archetype", "Sparse Set"],
    }
    return "\n\n".join(parts).rstrip() + "\n", entry


def validate_annual(data: dict) -> dict:
    years = data["years"]
    expected = list(range(data["first_year"], data["last_year"] + 1))
    if [year["year"] for year in years] != expected:
        raise ValueError("Annual data must contain each year in order")
    counts = {
        "years": len(years), "games": sum(len(y["games"]) for y in years),
        "hardware": sum(len(y["hardware"]) for y in years), "sources": len(data["sources"]),
    }
    if counts != data["counts"]:
        raise ValueError(f"Annual declared counts differ: {counts}")
    for year in years:
        for key in ("games", "hardware"):
            for item in year[key]:
                required = {"title", "platform", "region", "release_note", "reason", "source_url", "source_title"} if key == "games" else {"name", "region", "release_note", "significance", "source_url", "source_title"}
                if required - item.keys():
                    raise ValueError(f"Missing annual fields in {year['year']}: {required - item.keys()}")
                if not item["source_url"].startswith(("https://", "http://")):
                    raise ValueError("Annual source URLs must be public HTTP(S) links")
    return data


def import_history(data: dict) -> tuple[str, dict, dict]:
    annual = validate_annual(data["annual_highlights"])
    summary = f"遊び・ハード・制作・流通・保存をつなぐ概説と、{annual['first_year']}〜{annual['last_year']}年の代表作・ハード年表。"
    parts = [frontmatter(data["title"], summary), f"# {data['title']}\n"]
    parts.extend([
        "::: info 本文草稿と資料の範囲",
        "主要な転換を選んだ概説です。地域別・ジャンル別の網羅と追加の査読は、今後の増補対象です。発売地域、発表・初公開・発売、原作と移植を区別します。",
        f"資料の参照日：{data['checked_at']}。機種やコードの実機検証を示すものではありません。",
        ":::\n",
    ])
    append_sections(parts, data["sections"])
    parts.extend([
        "## 主な出来事の年表 {#milestones}\n",
        "| 年・時期 | 地域・対象 | 出来事 | 読み取る観点・出典 |",
        "| --- | --- | --- | --- |",
    ])
    for year, region, name, note, key in data["timeline"]:
        cells = [markdown_text(year), markdown_text(region), markdown_text(name), markdown_text(note) + " " + source_link(data["sources"][key])]
        parts.append("| " + " | ".join(cells) + " |")
    # Keep table rows contiguous: Markdown does not accept blank lines between them.
    start = next(i for i, part in enumerate(parts) if part.startswith("| 年・時期"))
    parts[start:] = ["\n".join(parts[start:])]
    parts.extend([
        "## 各年の代表的ソフトとハード {#annual-highlights}\n",
        "<AnnualHighlights />\n",
        "## 技術の章とのつながり\n",
        "| 観点 | 関連する知識 | 分野 |",
        "| --- | --- | --- |",
    ])
    table_start = len(parts) - 2
    for axis, knowledge, paths in data["cross_links"]:
        links = []
        for path in paths.split("、"):
            path = path.strip()
            target = {"graphics/api/": "graphics/api/comparison.html"}.get(path, path)
            links.append(f"[{path}](/{target})")
        parts.append(f"| {markdown_text(axis)} | {markdown_text(knowledge)} | {' / '.join(links)} |")
    parts[table_start:] = ["\n".join(parts[table_start:])]
    parts.extend([
        "描画技術の各論は、[リアルタイム3D技術全史](/guide/rendering/timeline.html)からも参照できます。\n",
        "## 理解を確かめる問い\n",
        "\n".join(f"{i}. {question}" for i, question in enumerate(data["questions"], 1)),
        "### 小さな調査課題\n",
        "好きな作品を一つ選び、原作の発売地域・機種・年、入力、媒体、開発環境、遊ぶ場所、保存に必要なものを1枚にまとめます。メーカー資料と当時の資料を一つずつ探し、事実・証言・自分の解釈を分けて書きます。\n",
        "## 参考資料と確認範囲\n",
        "\n".join(f"- {source_link(source)}" for source in data["sources"].values()),
        "### 資料の扱い\n",
        data["source_notes"]["primary_materials"],
        "Steamの公式資料：" + data["source_notes"]["steam"],
    ])
    entry = {
        "title": data["title"], "url": "/history/video-games.html", "domain": "history",
        "kind": "本文草稿", "summary": summary, "source": "新規執筆", "status": "草稿",
        "aliases": ["ビデオゲーム史", "ゲーム史", "ゲームの歴史", "年表", "名作ソフト", "ゲーム機", "歴代ハード"],
    }
    return "\n\n".join(parts).rstrip() + "\n", entry, annual


def write_public(path: Path, text: str) -> None:
    if re.search(r"(?<![A-Za-z])[A-Za-z]:[\\/]|file://|review\.html|study-review[/\\]", text):
        raise ValueError(f"Internal path or review link in public output: {path.name}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-root", type=Path, required=True, help="Folder containing ecs.json and video-game-history.json")
    parser.add_argument("--output-root", type=Path, default=DOCS, help="VitePress docs folder")
    args = parser.parse_args()
    ecs_data = read_json(args.input_root / "ecs.json")
    history_data = read_json(args.input_root / "video-game-history.json")
    ecs, ecs_entry = import_ecs(ecs_data)
    history, history_entry, annual = import_history(history_data)
    write_public(args.output_root / "game/ecs.md", ecs)
    write_public(args.output_root / "history/video-games.md", history)
    write_public(args.output_root / ".vitepress/catalog-new.json", json.dumps({"domains": [], "entries": [ecs_entry, history_entry]}, ensure_ascii=False, indent=2) + "\n")
    write_public(args.output_root / ".vitepress/annual-data.json", json.dumps(annual, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"ecs_sections": len(ecs_data["sections"]), "history_sections": len(history_data["sections"]), "milestones": len(history_data["timeline"]), "annual": annual["counts"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
