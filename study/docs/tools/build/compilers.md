---
title: "三大コンパイラ: MSVC・Clang・GCC"
study:
  source: C++ Wiki
  status: published
  summary: C++には主要な処理系が3つあり、ゲーム開発では複数と付き合うのが普通です(Windows=MSVC、コンソール機=Clangベースが多い、Linuxサーバー=GCC/Clang)。標準準拠の共通部分と、処理系ごとの差分(フラグ・拡張・ABI)を分けて把握します。
  section: reference
  format: article
  domain: compilers
---

# 三大コンパイラ: MSVC・Clang・GCC

## 一言で言うと

C++には主要な処理系が3つあり、**ゲーム開発では複数と付き合うのが普通**です(Windows=MSVC、コンソール機=Clangベースが多い、Linuxサーバー=GCC/Clang)。標準準拠の共通部分と、処理系ごとの差分(フラグ・拡張・ABI)を分けて把握します。

## 3つのプロフィール

| | MSVC | Clang | GCC |
|---|---|---|---|
| 開発元 | Microsoft | LLVMプロジェクト | GNU |
| 主戦場 | Windows / Visual Studio | Mac(Apple Clang)、Android、多くのコンソール機、ツール基盤 | Linux、組み込み |
| コンパイラ実行体 | cl.exe | clang++ | g++ |
| C++20対応 | 良好(近年は最速級で対応) | 良好 | 良好 |
| エラーメッセージ | 改善中 | **最良と評判**(初学者に優しい) | 良 |
| 特徴 | VSデバッガとの統合、Windows SDK連携 | ツール化(clang-format/clang-tidyの基盤)、モジュール構造 | 歴史と実績、最適化の強さ |

- **Clangのツール性**が現代の要: フォーマッタ(clang-format)、静的解析(clang-tidy)、言語サーバー(clangd = VSCodeの補完)はすべてClangの解析器の再利用。MSVCで開発していてもClangツール群は使う
- コンソール機のコンパイラはNDA下だが、Clangベースが多いのは公知(だからクロスプラットフォームコードはClangでも警告ゼロにしておくと移植が楽)

## フラグの対応表(日常で使うもの)

| 目的 | GCC / Clang | MSVC |
|---|---|---|
| 規格指定 | `-std=c++20` | `/std:c++20` |
| 最適化 | `-O0 / -O2 / -O3 / -Os` | `/Od / /O2 / /O1` |
| 警告 | `-Wall -Wextra`(全部ではない点に注意) | `/W4`(`/Wall`は過剰) |
| 警告をエラーに | `-Werror` | `/WX` |
| デバッグ情報 | `-g` | `/Zi`(PDB生成) |
| define | `-DNAME=1` | `/DNAME=1` |
| 例外オフ | `-fno-exceptions` | `/EHs-c-`(既定で例外モデル指定`/EHsc`) |
| RTTIオフ | `-fno-rtti` | `/GR-` |
| サニタイザ | `-fsanitize=address` 等 | `/fsanitize=address`(近年対応) |

## 処理系差が現れる場所(ハマりどころ)

1. **ABIの互換性**: MSVCとGCC(MinGW)のC++ ABIは一般に互換ではない。C ABIで契約をそろえた連携とは区別する(→ [ABI](/runtime/cpp-internals/symbols-and-linkage.html))。ClangはWindowsでMSVC互換を目指すclang-clを持つが、標準ライブラリ・CRT・設定を含む互換条件の確認は必要
2. **警告の検出範囲が違う**: GCCで警告ゼロでもMSVCで出る(逆も)。**複数コンパイラでビルドするだけでバグが見つかる**のはこのため(CIで両方回す価値)
3. 拡張機能: `#pragma once` は3社対応(事実上標準)だが、`__forceinline`(MSVC)/`__attribute__`(GCC/Clang)、可変長配列(GCC拡張。標準C++にはない)などは移植の罠
4. 標準ライブラリも別物: MSVC STL / libstdc++(GCC) / libc++(Clang)。実装依存の挙動(unordered_mapの成長戦略、SSOの閾値等)が異なる(→ [実装定義](/languages/cpp/undefined-behavior.html))
5. 最適化の癖・浮動小数点の厳密さ(`/fp:fast` vs `-ffast-math`)——クロスプラットフォームで**リプレイ・ロックステップ同期が壊れる**原因になりうる(決定性が要るなら固定小数点や厳密モードの検討)

## C#/Unityとの対応

- 現在の一般的なC#開発ではRoslynが広く使われるが、コンパイラや言語版、対象API、JIT/AOTといった実行方式の差がなくなるわけではない。UnityのIL2CPPは生成したC++を**各プラットフォームのC++コンパイラ**でビルドする。一般.NETで使えるライブラリが、そのままUnityの全バックエンドで使えるとも限らない(→ [IL2CPP](/languages/csharp/il2cpp.html)、[UnityのAPI互換性](https://docs.unity.com/en-us/engine/6000.0/manual/programming-environment/overview-of-dot-net-in-unity/dotnet-profile-support))
- 「Standalone/il2cppでだけ挙動が違う」報告の一部は、C++コンパイラ差・最適化差に由来する

## 実務指針

- **1次コンパイラ**(毎日使う)+**CIで2次コンパイラ**を回す構成が理想(警告・移植性の早期発見)
- 警告フラグはプロジェクト開始時に最大級で固定(後から上げると数千件出て詰む → [警告レベル](/tools/build/debugging-and-analysis.html))
- コンパイラのバージョン更新はブランチで隔離してテスト(最適化差・新警告・ABI変化)

## 理解度チェック

1. 3コンパイラの主戦場をそれぞれ言えますか。
2. 「複数コンパイラでビルドするとバグが見つかる」のはなぜですか。
3. MinGW(GCC)でビルドした.libをVSプロジェクトで使えない理由は?

## 演習

samples/ の任意のサンプルを `-Wall -Wextra` 付きでビルドし、警告が出るか確認してください。godbolt.orgで同じコードをGCC/Clang/MSVCでコンパイルし、生成コードとエラーメッセージの違いを見比べるのも推奨です。

---

関連項目：[ビルドとは何か](/tools/build/what-is-build.html) / [学習ガイド](/tools/build/) / [ビルドツール: CMake](/tools/build/build-tools-cmake.html)
