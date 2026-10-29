---
title: "シンボル・名前修飾・リンケージ・ABI"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "シンボル: リンカが使う「名前→機械語/データの場所」の項目。関数・グローバル変数が持つ 名前修飾 (name mangling): C++の関数名を、型情報込みの一意な文字列に変換する仕組み(オーバーロードを区別するため)"
---

# シンボル・名前修飾・リンケージ・ABI

## 一言で言うと

- **シンボル**: リンカが使う「名前→機械語/データの場所」の項目。関数・グローバル変数が持つ
- **名前修飾 (name mangling)**: C++の関数名を、型情報込みの一意な文字列に変換する仕組み(オーバーロードを区別するため)
- **リンケージ**: その名前が翻訳単位を越えて見えるか(外部リンケージ)、内に閉じるか(内部リンケージ)
- **ABI (Application Binary Interface)**: バイナリレベルの互換性の取り決め(修飾規則、呼出規約、レイアウト)。**ABIが互換でなければC++バイナリを安全に結合できない**ことの根拠。コンパイラ名だけでは互換性は決まらない

## シンボルと名前修飾

```cpp
// これをコンパイルすると…
int Add(int a, int b);
float Add(float a, float b);
namespace game { void Boot(); }
```

```
シンボル表(GCC/Clangの Itanium ABI 方式の例):
  _Z3Addii      ← Add(int, int)     「Z3Add」+引数型「ii」
  _Z3Addff      ← Add(float, float)
  _ZN4game4BootEv ← game::Boot()
(MSVCは別方式: ?Add@@YAHHH@Z のような形。同じ言語でも修飾は処理系ごと)
```

- **オーバーロードが可能な理由そのもの**: 型情報を名前に埋め込むから、リンカには別々の名前に見える
- リンクエラーの `undefined reference to _Z3Addii` はこの修飾名。`c++filt`(GCC系)で人間可読に戻せる
- **extern "C"**: C言語リンケージを指定し、C++の型に基づく名前修飾を避ける。C・他言語・DLL境界との接続に使う(同名関数のオーバーロードは不可)。C形式でも呼出規約や対象CPUによる装飾はあり、すべての環境で素の名前になるとは限らない

```cpp
extern "C" int PluginEntry(int version);   // 典型的なWindows x64では "PluginEntry"。実際の公開名はツールで確認
```

## リンケージ(名前の可視範囲)

| リンケージ | 意味 | 書き方 |
|---|---|---|
| **外部リンケージ** | 他の翻訳単位から参照できる(既定: 通常の関数・グローバル変数) | 何もしない |
| **内部リンケージ** | この翻訳単位内のみ | 無名namespace(推奨)/ `static`(旧式) |
| リンケージなし | ローカル変数など | — |

```cpp
// a.cpp
namespace {                    // 内部リンケージ: 他の.cppと名前が衝突しない
    int helper = 0;
    void LocalUtil() {}
}
int g_score = 0;               // 外部リンケージ: プログラムに1つだけ(他の.cppからextern参照可)
```

ヘッダーに「外部リンケージの変数の定義」を書くと多重定義になる([ODR](/runtime/cpp-internals/translation-units-and-headers.html))。`inline` 変数(C++17)がその解決策です。

### 用語注意: static/dynamic linkage という言い方

「static linkage」は文脈で2つの意味に使われます: (1) 上記の内部リンケージ(`static`キーワード由来)、(2) **静的リンク**(ライブラリを実行ファイルに焼き込むこと)。同様に「dynamic linkage」は動的リンク(DLL/共有ライブラリを実行時に結合)を指すのが普通です。本Wikiでは (2) の意味は「静的リンク/動的リンク」と表記し、[ライブラリのページ](/runtime/cpp-internals/object-files-and-libraries.html)で扱います。

## ABI — バイナリ互換の約束

ABIは「コンパイル済みバイナリ同士が正しく会話するための全ルール」:

- 名前修飾の方式
- [呼出規約](/runtime/cpp-internals/function-calls-and-cpu.html)(引数をどのレジスタ/スタックで渡すか)
- 構造体のレイアウト・[アラインメント](/runtime/cpp-internals/memory-layout.html)
- vtableの配置、例外・RTTIの実装方式
- 標準ライブラリの内部構造(std::stringのメモリ上の形)

### 実務での帰結

1. **MSVCとGCC(MinGW)のC++ ABIは一般に互換ではない**ため、C++の型・例外・標準ライブラリを境界で混ぜない。C ABIの関数だけを公開し、対象CPU・呼出規約・データ表現などが一致する場合は、異なる処理系でも連携できることがある
2. 同じコンパイラでも**バージョン・設定違いで壊れることがある**(MSVCのDebug/Releaseのイテレータサイズ違い、_ITERATOR_DEBUG_LEVEL不一致 → リンクエラーや実行時破壊)
3. **C++の型をDLL境界で渡すにはABIの互換性が必要**(std::stringなら内部レイアウトや標準ライブラリも関係する)。C ABIの関数と単純なデータに絞ると互換性を管理しやすいが、型幅・レイアウト・呼出規約・所有と解放・エラーの契約は別途そろえる(→ [DLL](/runtime/cpp-internals/object-files-and-libraries.html)、[ABI互換性](/tools/build/link-errors.html))
4. GCC/Clang系で使われるItanium C++ ABI系とMSVC ABIは主な例。ClangのMSVC互換モードや、MSVCの特定ツールセット間の互換保証もあるため、**同一コンパイラ名・同一版であること自体を普遍的な条件にはしない**。対象ツールチェーンの保証と制約を確認する([MSVCの互換条件](https://learn.microsoft.com/en-us/cpp/porting/binary-compat-2015-2017)、[ClangのMSVC互換性](https://clang.llvm.org/docs/MSVCCompatibility.html))

## C#との対応

- 一般的なC#のマネージドアセンブリはIL+メタデータを持ち、C++の名前修飾やヘッダー配布とは異なる仕組みで型を参照する。ただし**互換性の確認が不要になるわけではない**。対象フレームワーク/API、アセンブリと依存の版、実行環境、ネイティブ依存のCPU/ABIなどを確認する([.NETの対象フレームワーク](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting))。Unityではさらに、利用版のAPI Compatibility Level・スクリプティングバックエンド・対象プラットフォームの制約を確認する([Unity 6.0の説明](https://docs.unity.com/en-us/engine/6000.0/manual/programming-environment/overview-of-dot-net-in-unity/dotnet-profile-support))
- C++/C#相互運用(P/Invoke)は、まさに `extern "C"` のC ABIを経由して行う(→ [第9部](/languages/csharp/il2cpp.html))
- UnityのネイティブプラグインでC++関数を呼ぶときの `[DllImport]` + `extern "C"` がこのページの内容の実践

## Unity開発者が誤解しやすい点

1. 「DLLは言語問わず繋がる」— C ABIでもCPU・呼出規約・データ表現・所有権などの一致が必要。C++の型を公開するなら、処理系・標準ライブラリ・設定について互換性の保証が必要
2. リンクエラーの `?TakeDamage@Enemy@@QEAAXH@Z` を見て絶望しない——修飾名は機械的に読める(undname/c++filtで復元可能)。「どの関数のシンボルが無いのか」は必ず特定できる
3. 「externは変数のキーワード」— `extern "C"` は別物(リンケージ指定)

## ゲーム開発での使用例

- プラグインシステム(DLLからextern "C"のエントリポイントを取得)
- ミドルウェア統合時のリンクエラー解読(修飾名→どのライブラリの何が足りないか)
- 内部リンケージ(無名namespace)でヘルパーを隠し、シンボル衝突とリンク時間を減らす

## 理解度チェック

1. 名前修飾はなぜ必要ですか(何を可能にしているか)。
2. 内部リンケージにする手段と、その効果は?
3. MSVC製とMinGW製のC++ライブラリを混在させるとき、ABI上で何を確認すべきですか。C ABIの公開関数に絞ると何が変わりますか。

## 演習

[samples/tu_demo/](/tools/build/samples/tu-demo.html) をビルド後、`nm enemy.o`(MinGW)でシンボル表を眺め、(a) Enemy::TakeDamageの修飾名を見つけて `c++filt` で復元、(b) 無名namespace内の関数がどう見えるか(ローカルシンボル`t`表示)を確認してください。

---

前: [翻訳単位とヘッダー](/runtime/cpp-internals/translation-units-and-headers.html) | [カテゴリ目次](/runtime/cpp-internals/) | 次: [オブジェクトファイルとライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)
