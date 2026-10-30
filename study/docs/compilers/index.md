---
{
  "title": "コンパイラとツールチェーン",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": false,
    "section": "reference",
    "format": "index",
    "domain": "compilers"
  }
}
---

# コンパイラとツールチェーン

ソースコードが実行可能になるまでを追う。

## 辞典の本文

- [main.cpp から CPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html)
- [オブジェクトファイル・実行ファイル・静的ライブラリ・動的ライブラリ・DLL](/runtime/cpp-internals/object-files-and-libraries.html)
- [コンパイラ最適化・未定義動作の影響・Debug/Release・ゼロコスト抽象化](/runtime/cpp-internals/optimization-and-ub.html)
- [シンボル・名前修飾・リンケージ・ABI](/runtime/cpp-internals/symbols-and-linkage.html)
- [テンプレートの実体化と inline の実際](/runtime/cpp-internals/template-instantiation-and-inline.html)
- [三大コンパイラ: MSVC・Clang・GCC](/tools/build/compilers.html)
- [翻訳単位・ヘッダー・include・前方宣言・ODR](/runtime/cpp-internals/translation-units-and-headers.html)

## この分野の学習ガイド

- [第7章 コンパイラ・リンカ・実行ファイル・ABI](/guide/low-level/compiler-linker-executable.html) — 学習計画・概要

## 作って試す

この分野専用の実践教材は準備中です。[実践・サンプル一覧](/practice/)に公開中の題材をまとめています。

## 扱う範囲・増補する項目

- 字句・構文・型検査
- AST・IR・SSA
- 最適化
- コード生成
- リンク・再配置
- ABI
- ローダー
- デバッグ情報
