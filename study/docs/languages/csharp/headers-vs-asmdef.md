---
title: ヘッダー分割と Assembly Definition
study:
  source: C++ Wiki
  status: published
  summary: "C++のヘッダー/ライブラリ分割とUnityのAssembly Definition(.asmdef)は、仕組みは全く別物ですが、目的は同じです: 「コードの依存関係を物理的に構造化し、ビルド時間と設計秩序を守る」。C#で.asmdefを整理した経験は、C++のモジュール分割設計にそのまま活きます。"
  section: reference
  format: article
  domain: languages
---

# ヘッダー分割と Assembly Definition

## 一言で言うと

C++のヘッダー/ライブラリ分割とUnityのAssembly Definition(.asmdef)は、**仕組みは全く別物**ですが、**目的は同じ**です: 「コードの依存関係を物理的に構造化し、ビルド時間と設計秩序を守る」。C#で.asmdefを整理した経験は、C++のモジュール分割設計にそのまま活きます。

## 対応表

| Unity (.asmdef) | C++ | 対応の質 |
|---|---|---|
| .asmdefファイルでアセンブリ分割 | ライブラリ分割(add_library → [CMake](/tools/build/build-tools-cmake.html)) | 目的同一 |
| Assembly Definition References(参照宣言) | target_link_libraries(依存宣言) | 目的同一 |
| 参照がないと型が見えない | includeパス+リンクがないと使えない | C++は2段階(宣言と実体) |
| internal(アセンブリ内公開) | 無名namespace(翻訳単位内)/ 非公開ヘッダー(ライブラリ内) | **C++に完全対応物なし** |
| 循環参照はエラー | 循環リンクは(静的ライブラリでは)通ってしまうことがある | C++の方が緩い=自衛が必要 |
| asmdef分割でスクリプトコンパイル高速化 | ヘッダー衛生・分割でビルド高速化([ビルド時間 — incremental build・PCH・Unity Build・C++でビルドが遅くなる理由](/tools/build/build-speed.html)) | 目的同一 |

## 決定的な違い: 「宣言の配布」という仕事の有無

- C#: アセンブリ参照を張れば、**メタデータから型情報が自動で見える**。公開範囲はpublic/internalで制御
- C++: 型を見せるには**ヘッダーを配る**という物理的な作業が要る(→ [翻訳単位](/runtime/cpp-internals/translation-units-and-headers.html))。そして「見せる範囲」はヘッダーの置き場所で設計する:

```
mylib/
├── include/mylib/     ← 公開ヘッダー(利用者が見てよいもの)= C#のpublic相当
│   └── enemy.h
└── src/               ← 非公開ヘッダー+実装 = internal相当
    ├── enemy_internal.h
    └── enemy.cpp
```

CMakeでは `target_include_directories(mylib PUBLIC include PRIVATE src)` がこの公開範囲の宣言になります。**「公開APIの設計=公開ヘッダーの設計」**がC++流です。

## 依存方向の強制force

.asmdefで「UIはCoreを参照するが、CoreはUIを参照できない」を強制した経験があるはずです。C++でも同じことをライブラリ分割+リンク宣言で行います(→ [依存の方向](/design/foundations/dependency.html))。

```
game_core(ゲームルール)← game_ui(表示)← game_app(組み立て)
CMakeで core が ui にリンクしていたら設計違反 — レビューで機械的に検出できる
```

- C++で注意: **includeだけなら循環がコンパイルできてしまう**場合がある(ヘッダーオンリー同士)。「参照を張らなければ物理的に見えない」.asmdefより自衛が必要
- C++20モジュール(`import`)はこの状況をC#に近づける新機構だが、ツールチェーンの普及待ち(→ [翻訳単位](/runtime/cpp-internals/translation-units-and-headers.html))

## ビルド時間の観点

| Unityの経験則 | C++での対応 |
|---|---|
| 巨大な単一Assembly-CSharp.dllは変更のたび全コンパイル | 「何でも入りヘッダー」が全再コンパイルを誘発 |
| よく変わるゲームコードと安定した基盤を別asmdefに | 変更頻度でヘッダー・ライブラリを層別([ビルド時間 — incremental build・PCH・Unity Build・C++でビルドが遅くなる理由](/tools/build/build-speed.html)) |
| Editor専用asmdefで本体から分離 | ツール・エディタコードの別ターゲット化 |

**「変更頻度の高いものに、多くのものを依存させない」**という原則は両者共通で、Unityでの整理経験がそのまま通用します。

## Unity開発者が誤解しやすい点

1. 「フォルダを分ければ分離される」— C++ではフォルダに意味はない。**ヘッダーの公開範囲とリンク宣言**が分離の実体
2. 「internalがないから全公開しかない」— 非公開ヘッダー・無名namespace・pimplで実質的な内部化は可能(粒度は粗いが)
3. .asmdefを切りすぎて管理が地獄になった経験があるなら、C++のライブラリ分割も同じ罠がある——**分割は依存の境界に沿って最小限**が両言語共通の答え

## 理解度チェック

1. .asmdefの参照宣言に対応するC++の仕組みは何ですか(2段階)。
2. C#のinternalに完全対応するC++機能がない中で、近い効果を得る手段を2つ挙げてください。
3. 「公開APIの設計=公開ヘッダーの設計」とはどういうことですか。

## 演習

[samples/cmake_demo/](/tools/build/samples/cmake-demo.html) の game_core を「公開ヘッダー(include/)と実装(src/)」構成に整理し、mainから非公開ヘッダーをincludeしようとするとパスが通らないことを確認してください。

---

関連項目：[関数ポインタとdelegate](/languages/csharp/delegates-events-function-pointers.html) / [学習ガイド](/languages/csharp/) / [ネイティブビルドとIL2CPP](/languages/csharp/il2cpp.html)
