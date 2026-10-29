---
title: "RTTI・dynamic_cast・例外処理の仕組み"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "言語機能としての使い方はキャストと例外で説明済み。このページは「内部で何が起きているか」と「ゲーム開発でオフにされがちな理由」を扱います。以下は主流実装(Itanium C++ ABI / MSVC)の説明で、標準が実装方式を定めているわけではありません。"
---

# RTTI・dynamic_cast・例外処理の仕組み

言語機能としての使い方は[キャスト](/languages/cpp/casts.html)と[例外](/languages/cpp/exceptions.html)で説明済み。このページは「**内部で何が起きているか**」と「ゲーム開発でオフにされがちな理由」を扱います。以下は主流実装(Itanium C++ ABI / MSVC)の説明で、標準が実装方式を定めているわけではありません。

## RTTI (Run-Time Type Information)

### 何が格納されているか

仮想関数を持つ型のvtableには、関数ポインタに加えて **type_info への参照**が置かれます(→ [vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html))。

```
Dragonのvtable
  [type_info*] ──> "6Dragon" という型情報(名前、基底クラスへのリンク)
  [~Dragon]
  [Attack]...
```

```cpp
const std::type_info& t = typeid(*enemyPtr);   // vptr経由で実行時の型名を取得
t.name();                                       // 修飾された型名(処理系依存の文字列)
```

### dynamic_cast の動き

`dynamic_cast<Dragon*>(e)` は、eのvtableからtype_infoを取り、**継承グラフを辿って** Dragonに到達できるか照合します。深い階層・多重継承・仮想継承では照合が複雑になり、**数十〜数百サイクル**かかりえます(単純な比較ではない)。

### なぜゲームでオフにされがちか

- コスト: type_infoデータが全ポリモーフィック型に付き(サイズ)、castが遅い
- 代替が容易: ゲームは型階層を自分で管理できるので、**自前の型ID**(enumやビットマスク比較)で「1回の整数比較」に置き換えられる
- 実例: UEはRTTIをオフにし、リフレクション情報([UClass](/game/unreal/reflection-and-uht.html))を使う `Cast<T>()` を提供。Unity(IL2CPP)のC#は独自のメタデータで型検査
- コンパイラフラグ: `-fno-rtti`(GCC/Clang)、`/GR-`(MSVC)。RTTIオフだとdynamic_cast(ポリモーフィック型)とtypeidは使えない

## 例外処理の仕組み

### 2大実装方式

1. **テーブル方式(ゼロコスト例外)** — Itanium ABI(Linux/Mac/近年のWindows x64も):
   - 各関数の「この範囲で例外が起きたらここへ」という**巻き戻し表**を実行ファイルに埋め込む(.eh_frame等のセクション)
   - **投げなければ実行時コストほぼゼロ**(通常パスに命令が入らない)
   - **投げたら高い**: 表を検索しながらスタックを1フレームずつ巻き戻し、各フレームのデストラクタを実行([スタック巻き戻し](/languages/cpp/exceptions.html))。数千〜数万サイクル
2. **フレーム登録方式**(旧32bit Windowsなど): tryのたびに実行時登録=**投げなくてもコストがかかる**。「例外は遅い」という古い常識の出所の一つ

### コストの内訳(テーブル方式でも残るもの)

- 実行ファイルサイズ: 巻き戻し表+デストラクタ呼び出しコードの分
- **最適化への制約**: 「ここで例外が飛ぶかもしれない」が命令の並べ替え・レジスタ割当を制約する(noexcept が最適化に効く理由)
- だからゲームでは `-fno-exceptions` でまるごと外す文化があった(→ [例外のページ](/languages/cpp/exceptions.html)の「業界の現実」)

### noexcept の意味(内部視点)

`noexcept` 関数から例外が漏れると**即 std::terminate**。コンパイラは「この関数からは飛ばない」前提で表を省略し最適化できます。**ムーブコンストラクタのnoexceptはvectorの再確保がムーブを使う条件**でもある(投げうるムーブでは強い例外保証のためコピーが選ばれる)——実利のあるアノテーションです。

## C#との対応

- C#の例外も内部はテーブル+巻き戻しで概念は近い。ただしC#はランタイムが常に型情報・スタック情報を持つため、スタックトレース取得が標準機能。C++では別途(プラットフォームAPI/ライブラリ)で取る
- C#のリフレクション(`GetType()`)はRTTIの遥かに豊かな版(メンバ列挙・動的呼び出しまで)。C++のRTTIは「型の同定」しかできない最小限——UEがリフレクションを**自作**した理由(→ [第10部](/game/unreal/reflection-and-uht.html))

## Unity開発者が誤解しやすい点

1. 「is/as は軽い」感覚でdynamic_castを多用しない——C++版は階層照合で重め。頻繁な型分岐は設計(仮想関数/[Visitor](/design/patterns/visitor.html)/型ID)で消す
2. C++の `typeid().name()` は「読める型名」を保証しない(GCCでは修飾名。復元はabi::__cxa_demangle)
3. 「例外が使えない環境がある」はC#にはない発想。ライブラリ選定時に「例外を投げるライブラリか」を見る目が要る

## ゲーム開発での判断

- RTTI・例外とも「**使う/使わないをプロジェクト初期に決めて統一**」が重要(混在はリンク・ABI事故の元)
- 自前型IDの典型実装: 基底に `virtual TypeId GetType() const` を1つ生やし、enumを返す(1整数比較で分岐)。またはコンポーネント型ごとの静的ID(→ [ECS](/game/patterns/component-and-ecs.html)の型管理)

## 理解度チェック

1. dynamic_castが「単純な比較でない」理由は?
2. ゼロコスト例外の「ゼロ」と「高い」はそれぞれ何のことですか。
3. ムーブコンストラクタにnoexceptを付ける実利は?

## 演習

godbolt.orgで、同じ関数を `-fexceptions` と `-fno-exceptions` でコンパイルし、生成コード・セクションサイズの違いを観察してください。また `-fno-rtti` でdynamic_castがコンパイルエラーになることを確認してください。

---

前: [vtableと仮想関数呼び出し](/runtime/cpp-internals/vtable-and-virtual-calls.html) | [カテゴリ目次](/runtime/cpp-internals/) | 次: [メモリレイアウト](/runtime/cpp-internals/memory-layout.html)
