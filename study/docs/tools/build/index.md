---
title: "第8部: ビルドとライブラリ"
study:
  source: "C++ Wiki"
  kind: "索引"
  status: "既存原稿"
  summary: "第6部で「ビルドの中で何が起きるか」を学びました。この章は「ビルドをどう運用するか」——道具(コンパイラ、CMake)、構成(Debug/Release)、速度、品質ツール、そしてリンクエラーとの戦い方です。"
---

# 第8部: ビルドとライブラリ

第6部で「ビルドの中で何が起きるか」を学びました。この章は「**ビルドをどう運用するか**」——道具(コンパイラ、CMake)、構成(Debug/Release)、速度、品質ツール、そしてリンクエラーとの戦い方です。

## 読む順番

1. [ビルドとは何か(コンパイラとビルドシステムの違い)](/tools/build/what-is-build.html)
2. [三大コンパイラ: MSVC・Clang・GCC](/tools/build/compilers.html)
3. [ビルドツール: CMake・Visual Studio・Make・Ninja(CMakeサンプル付き)](/tools/build/build-tools-cmake.html)
4. [ビルド構成: Debug/Development/Release/Shipping・PDB・デバッガ](/tools/build/build-configurations.html)
5. [ビルド時間: incremental build・PCH・Unity Build・遅くなる理由](/tools/build/build-speed.html)
6. [品質のための道具: 静的解析・サニタイザ・警告レベル・CI](/tools/build/debugging-and-analysis.html)
7. [リンクエラー: 未解決外部シンボル・多重定義・ABI互換性](/tools/build/link-errors.html)

仕上げに [演習](/tools/build/exercises.html)。

## 前提

[第6部: main.cppからCPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html) を先に読んでください。この章はその運用編です。

---

[全体目次](/guide/cpp-index.html) | 次: [ビルドとは何か](/tools/build/what-is-build.html)
