---
title: "ネイティブビルドと IL2CPP"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "IL2CPPは「C#(IL)をC++ソースに変換し、各プラットフォームのC++コンパイラでビルドする」Unityの仕組み。つまりあなたのC#コードは、最終的に本Wiki第6部の旅を通ってCPU命令になっています。C++を学ぶと、IL2CPPの制約・性能特性が「仕様の暗記」から「当然の帰結」に変わりま"
---

# ネイティブビルドと IL2CPP

## 一言で言うと

IL2CPPは「**C#(IL)をC++ソースに変換し、各プラットフォームのC++コンパイラでビルドする**」Unityの仕組み。つまりあなたのC#コードは、最終的に[本Wiki第6部の旅](/runtime/cpp-internals/build-pipeline-journey.html)を通ってCPU命令になっています。C++を学ぶと、IL2CPPの制約・性能特性が「仕様の暗記」から「当然の帰結」に変わります。

## 実行方式の全体地図

```
C#ソース ──Roslyn──> IL(中間言語)+メタデータ
    │
    ├─ [Mono/JIT]     実行時にILを機械語へ(エディタ再生、一部プラットフォーム)
    │                  柔軟(実行時コード生成OK)だが、起動後の変換コスト・JIT不可の環境あり
    │
    └─ [IL2CPP/AOT]   ビルド時にIL→C++→機械語(iOS・コンソールは事実上必須)
                       il2cpp.exe が .cpp を吐き、MSVC/Clang等が旅の②以降を実行
```

- AOT (Ahead-Of-Time) = 事前コンパイル。JIT禁止のプラットフォーム(iOS等)で必須
- 生成されたC++は `Library/Il2cppBuildCache` 等で実際に読める(C++を学んだ今なら!)

## IL2CPPの制約をC++の知識で説明する

| Unityでの経験則 | C++側の理由 |
|---|---|
| 実行時のコード生成(Emit)不可 | 機械語は事前に全部作る。実行時にコンパイラはいない([テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html)と同じ構図) |
| 値型ジェネリックの組み合わせがAOTで漏れる | ジェネリックがC++テンプレート的に**使用実績ベースで実体化**されるため、リフレクション経由でしか現れない組み合わせは生成されない |
| コードストリッピングでメソッドが消える(link.xml) | リンカのデッドコード除去([リンク](/runtime/cpp-internals/object-files-and-libraries.html))。リフレクション呼び出しは「使用」と見なされない |
| iOSビルドが遅い | 生成された膨大なC++のコンパイル([ビルドが遅い理由](/tools/build/build-speed.html)がフル適用) |
| IL2CPPの方が速いことが多い | C++コンパイラの最適化([第6部](/runtime/cpp-internals/optimization-and-ub.html))がフルに掛かる。ただしGCはBoehmのまま(→ [GC比較](/runtime/memory/gc-and-csharp-comparison.html)) |

## ネイティブプラグインとの境界(P/Invoke)

```csharp
// C#側
[DllImport("gamephysics")]                     // ネイティブDLL/静的ライブラリの関数を呼ぶ
private static extern int Simulate(float dt);
```

```cpp
// C++側 — extern "C" でC ABIに固定(→ シンボルと名前修飾)
extern "C" __declspec(dllexport) int Simulate(float dt) { /* ... */ return 0; }
```

- 境界のルールは[DLLのページ](/runtime/cpp-internals/object-files-and-libraries.html)そのまま: **C ABI+プレーンなデータ**(構造体はblittableに=参照型・stringを含めない)
- 呼び出しコストは1回あたり数十〜数百サイクル(マーシャリング)。**細かく何度も呼ばず、まとめて渡す**(配列でバッチ)が定石
- 文字列・配列の受け渡しは所有権を明確に(「C#側のメモリをC++が覚えてはいけない」——GCが動かす/回収するため。pinningの概念)

## Burstとの関係

Burst(HPC# → LLVMで機械語)は「C#の**サブセット**を、C++並みの最適化で直接コンパイルする」別ルート。IL2CPPが「C#全部をそこそこ速いC++に」なのに対し、Burstは「制限つきC#([Data Locality](/game/patterns/optimization-patterns.html)前提の書き方)を最速に」。**制限の内容(参照型禁止・NativeContainer)は、本Wikiで学んだ「速いC++の条件」そのもの**です。

## Unity開発者が誤解しやすい点

1. 「IL2CPPにすればC++の速さになる」— 変換されるのはコード。**GCと管理ヒープの構造はそのまま**なので、Allocのスパイクは消えない
2. 「エディタで動けば実機でも動く」— エディタはMono/JIT。AOT制約・ストリッピング・C++最適化の差でIL2CPP実機のみのバグは普通にある(→ [Debug/Release差](/tools/build/build-configurations.html)と同じ構図)
3. 生成C++を「読めない魔法」と思わない——変数名は機械的だが、構造は本Wikiで学んだC++そのもの。実機クラッシュの解析で読む日が来る

## 理解度チェック

1. JITとAOTの違いと、iOSでAOTが必須な理由は?
2. AOTジェネリック問題とコードストリッピング問題を、C++の語彙(実体化・デッドコード除去)で説明できますか。
3. P/Invoke境界の設計ルールを2つ挙げてください。

## 演習

自分のUnityプロジェクト(またはサンプルプロジェクト)をIL2CPPでビルドし、生成されたC++(Il2cppBuildCache)から自作クラスに対応するファイルを探して眺めてください。「C#のクラスがC++でどう表現されているか」を3点メモしてください(メソッドテーブル、nullチェックの挿入、など)。

---

前: [ヘッダー分割とAssembly Definition](/languages/csharp/headers-vs-asmdef.html) | [カテゴリ目次](/languages/csharp/) | 次: [手動メモリ管理とGC](/languages/csharp/memory-management-vs-gc.html)
