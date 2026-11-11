---
title: ネイティブビルドと IL2CPP
study:
  source: C++ Wiki
  status: published
  summary: UnityのIL2CPPによるILからC++への変換、AOT、コード生成、ネイティブ連携を調べる。
  section: reference
  format: article
  domain: languages
---

# ネイティブビルドと IL2CPP

## 一言で言うと

IL2CPPは「**C#(IL)をC++ソースに変換し、各プラットフォームのC++コンパイラでビルドする**」Unityの仕組み。つまりあなたのC#コードは、最終的に[main.cpp から CPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html)を通ってCPU命令になっています。C++を学ぶと、IL2CPPの制約・性能特性が「仕様の暗記」から「当然の帰結」に変わります。

## 実行方式の全体地図

```
C#ソース ──Roslyn──> IL(中間言語)+メタデータ
    │
    ├─ [Mono/JIT]     実行時にILを機械語へ(エディタ再生、一部プラットフォーム)
    │                  柔軟(実行時コード生成OK)だが、起動後の変換コスト・JIT不可の環境あり
    │
    └─ [IL2CPP/AOT]   ビルド時にIL→UnityLinkerでストリッピング→C++→機械語(iOS・コンソールは事実上必須)
                       il2cpp.exe が .cpp を吐き、MSVC/Clang等が旅の②以降を実行
```

- AOT (Ahead-Of-Time) = 事前コンパイル。JIT禁止のプラットフォーム(iOS等)で必須
- 生成C++の場所はUnityの版・対象・ビルド方法で異なる。旧版の`Library/Il2cppBuildCache`を固定パスとせず、2022系以降などのBeeによるビルドでは`Library/Bee/artifacts/.../il2cppOutput/cpp`などを、ビルドログや出力から探す。[Unityのビルド成果物の例](https://docs.unity.com/en-us/cloud/developer-data/upload-symbol-files-ci-troubleshooting)

## IL2CPPの制約をC++の知識で説明する

| Unityでの経験則 | ビルド・実行時の理由 |
|---|---|
| 実行時のコード生成(Emit)不可 | 機械語は事前に全部作る。実行時にコンパイラはいない([テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html)と同じ構図) |
| ジェネリックとAOTの制約は版・コード生成設定に依存 | 旧版では未生成の値型の組み合わせが失敗する例があった。Unity 2022.1以降はFull Generic Sharingのフォールバックにより、専用コードがない組み合わせも共有実装で扱える場合がある。ストリッピングや実行時コード生成の制約とは別に調べる |
| コードストリッピングでメソッドが消える(link.xml) | UnityLinkerがIL2CPP変換前にマネージドアセンブリから未使用と判定したILを取り除きます。リフレクションでの使用を静的に追えない場合は、`link.xml`などで必要な型やメソッドを保持します。[UnityのIL2CPPビルド手順](https://docs.unity3d.com/6000.0/Documentation/Manual/il2cpp-introduction.html)・[UnityLinkerの処理](https://docs.unity3d.com/6000.0/Documentation/Manual/unity-linker.html) |
| iOSビルドが遅い | 生成された膨大なC++のコンパイル([ビルドが遅い理由](/tools/build/build-speed.html)がフル適用) |
| IL2CPPの方が速いことが多い | C++コンパイラの最適化([コンパイラ最適化・未定義動作の影響・Debug/Release・ゼロコスト抽象化](/runtime/cpp-internals/optimization-and-ub.html))がフルに掛かる。ただしGCはBoehmのまま(→ [GC比較](/runtime/memory/gc-and-csharp-comparison.html)) |

## ネイティブプラグインとの境界(P/Invoke)

Full Generic Sharingでは、特殊化された実装と共有実装で性能特性が異なる場合があります。「AOTでは未知のジェネリックの組み合わせはすべて実行できない」とはせず、使用するUnityの版・設定・保持されるメタデータを確認します。[Unity 2022.1の説明](https://unity.com/blog/engine-platform/il2cpp-full-generic-sharing-in-unity-2022-1-beta)

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
- 文字列・配列を受け渡すときは、所有権を明確にします。GCはC#側のメモリを移動・回収するため、C++側でそのアドレスを保持してはいけません。ここでpinningを考えます。

## Burstとの関係

Burst(HPC# → LLVMで機械語)は「C#の**サブセット**を、C++並みの最適化で直接コンパイルする」別ルート。IL2CPPが「C#全部をそこそこ速いC++に」なのに対し、Burstは「制限つきC#([Data Locality](/game/patterns/optimization-patterns.html)前提の書き方)を最速に」。**制限の内容(参照型禁止・NativeContainer)は、本Wikiで学んだ「速いC++の条件」そのもの**です。

## Unity開発者が誤解しやすい点

1. IL2CPPが変換するのはコードです。GCと管理ヒープの構造は変わらないため、Allocのスパイクは解消されません。
2. 「エディタで動けば実機でも動く」— エディタはMono/JIT。AOT制約・ストリッピング・C++最適化の差でIL2CPP実機のみのバグは普通にある(→ [Debug/Release差](/tools/build/build-configurations.html)と同じ構図)
3. IL2CPPが生成したC++の変数名は機械的ですが、コードの構造はこの辞典で扱うC++と同じです。実機でクラッシュしたときの解析で読むコードです。

## 理解度チェック

1. JITとAOTの違いと、iOSでAOTが必須な理由は?
2. AOTのジェネリックコード生成とUnityLinkerのコードストリッピングは、それぞれビルドのどの段階で起きますか。リフレクション先の保持に`link.xml`を使うのはどちらですか。
3. P/Invoke境界の設計ルールを2つ挙げてください。

## 演習

自分のUnityプロジェクトをIL2CPPでビルドし、ビルドログから生成C++の場所を確認して、自作クラスに対応するファイルを探してください。Unityの版・対象・実際のパスと、「C#のクラスがC++でどう表現されているか」を3点メモします（メソッドテーブル、nullチェックの挿入など）。

---

関連項目：[ヘッダー分割とAssembly Definition](/languages/csharp/headers-vs-asmdef.html) / [学習ガイド](/languages/csharp/) / [手動メモリ管理とGC](/languages/csharp/memory-management-vs-gc.html)
