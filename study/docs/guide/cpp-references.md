---
title: "参考文献・参考リソース"
study:
  source: "C++ Wiki"
  kind: "参考資料"
  status: "既存原稿"
  summary: "このWikiの内容をより深く学ぶための資料です。書籍は版を問わず定番のものを挙げています。 Robert C. Martin『Clean Architecture 達人に学ぶソフトウェアの構造と設計』 — SOLID原則の一次情報に近い解説。「変更理由」の観点はここから。"
---

# 参考文献・参考リソース

このWikiの内容をより深く学ぶための資料です。書籍は版を問わず定番のものを挙げています。

## 設計・オブジェクト指向

- Robert C. Martin『Clean Architecture 達人に学ぶソフトウェアの構造と設計』 — SOLID原則の一次情報に近い解説。「変更理由」の観点はここから。
- Erich Gamma ほか『オブジェクト指向における再利用のためのデザインパターン』(いわゆるGoF本) — 23パターンの原典。例が古い(GUIフレームワーク中心)ので、本Wikiではゲーム向けに置き換えて説明している。
- Martin Fowler『リファクタリング(第2版)』 — コードの臭いカタログとリファクタリング手順の定番。
- Kent Beck『テスト駆動開発』 — テスト容易性を設計の駆動力にする考え方。
- 上田勲『プリンシプル オブ プログラミング』 — YAGNI/KISS/DRYなど原則の横断的整理。

## ゲームプログラミング

- Robert Nystrom『Game Programming Patterns』(邦訳: ゲームプログラミングパターン) — 第4部の主要な出典。Web版が無料公開されている: https://gameprogrammingpatterns.com/
- Jason Gregory『ゲームエンジンアーキテクチャ』 — エンジン全体の構造、メモリ管理、ゲームループの実務的な詳細。
- Mike Acton の Data-Oriented Design 講演 (CppCon 2014 "Data-Oriented Design and C++") — Data Locality / AoS-SoA の背景思想。

## C++

- Bjarne Stroustrup『プログラミング言語C++』 — 言語設計者による網羅的解説。
- Scott Meyers『Effective Modern C++』 — ムーブ、auto、スマートポインタなどC++11/14の要点。
- cppreference.com ( https://ja.cppreference.com/ ) — 標準ライブラリと言語仕様の事実上の標準リファレンス。本Wikiの言語仕様の記述はここで確認できる。
- ISO C++ 規格ドラフト ( https://eel.is/c++draft/ ) — 「標準で保証されること」の一次情報。
- Compiler Explorer ( https://godbolt.org/ ) — コードがどんなアセンブリになるかをブラウザで確認できる。第6部を読むときに強く推奨。
- CppCon / Meeting C++ の講演動画 — 実装の内部やパフォーマンスの一次情報が多い。

## ビルド・ツールチェーン

- CMake 公式ドキュメント ( https://cmake.org/documentation/ )
- 各コンパイラのドキュメント: MSVC ( https://learn.microsoft.com/cpp/ ) / Clang ( https://clang.llvm.org/docs/ ) / GCC ( https://gcc.gnu.org/onlinedocs/ )
- Peter Smith『Linkers and Loaders』(John R. Levine著の同名書も定番) — リンクとローダーの古典。

## Unity / C#

- Unity 公式マニュアルとスクリプティングリファレンス ( https://docs.unity3d.com/ )
- Unity 公式: IL2CPP のドキュメント — C++変換の仕組み。
- Jon Skeet『C# in Depth』 — C#言語仕様の深掘り。
- .NET のGC設計ドキュメント ( https://learn.microsoft.com/dotnet/standard/garbage-collection/ )

## Unreal Engine

- Unreal Engine 公式ドキュメント ( https://dev.epicgames.com/documentation/ )
- 公式ソースコード(GitHub、Epicアカウント連携で閲覧可) — UEの仕様の最終的な一次情報はソースコード。
- 「Unreal Engine 5で極めるゲーム開発」(歴代の定番入門書のいずれか) — Gameplay Framework の全体像。

## 本Wikiでの引用・準拠方針

- 言語仕様に関する記述は C++20 (ISO/IEC 14882:2020) を基準にし、処理系依存の事項はその旨を明記している。
- Unity / Unreal Engine の仕様はバージョンによって変わるため、本Wikiでは特定バージョンに依存しない範囲で説明し、依存する場合は本文中に注記している。

---

[目次に戻る](/guide/cpp-index.html)
