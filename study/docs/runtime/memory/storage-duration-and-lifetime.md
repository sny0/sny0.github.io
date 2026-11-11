---
title: 記憶域期間とスコープ・寿命の違い
study:
  source: C++ Wiki
  status: published
  summary: 名前が使えるスコープ、記憶域を保持する期間、オブジェクトの寿命を分け、C++とC#・Unityの違いを調べる。
  section: reference
  format: article
  domain: runtime
---

# 記憶域期間とスコープ・寿命の違い

## 一言で言うと

**スコープは名前が使える範囲、記憶域期間は記憶域を保持する期間の分類、寿命はオブジェクトが存在する期間**です。C++では、場所を確保しただけで任意のクラスの初期化が済むわけではなく、破棄しても同じ場所を再利用できます。

たとえば、プールがバイト領域を保持している間に、同じ場所で敵Aを構築・破棄し、その後に敵Bを構築できます。領域の保持と各オブジェクトの寿命を分けて考えます。[C++作業草案の記憶域期間](https://eel.is/c++draft/basic.stc)と[寿命](https://eel.is/c++draft/basic.life)が根拠です。以下は通常のオブジェクトの説明で、unionや暗黙的なオブジェクト生成などには追加規則があります。

## 4つの記憶域期間

| 記憶域期間 | 記憶域を保持する期間の目安 | オブジェクトの寿命で注意すること |
| --- | --- | --- |
| 自動 automatic | 通常は属するブロックの実行に結び付く | ローカル変数は通常、宣言に伴う初期化を終えてから利用し、退出時に破棄される。ブロック開始時に全変数の構築が済むわけではない |
| 静的 static | プログラムの実行にわたる | 静的初期化か動的初期化か、関数内staticか等で初期化の時期が異なる。静的記憶域期間でも、すべてのコンストラクタがmain前に実行されるわけではない |
| スレッド thread | 対応するスレッドの実行にわたる | thread_localの初期化と、そのスレッドに属するインスタンスの破棄を考える |
| 動的 dynamic | 動的に取得した記憶域を解放するまで | 通常のnew式は確保と構築を行う。破棄と記憶域の解放を分ける使い方もある |

「自動＝必ず機械のスタック」「動的＝必ず特定のOSヒープ」という物理配置まで、これらの分類が規定するわけではありません。レジスタへの配置や処理の省略など、実装と最適化も関係します。OSから見える領域は[仮想メモリ](/os/virtual-memory.html)、言語からOSへの経路は[確保から解放まで](/runtime/memory/allocation-journey.html)で扱います。

```cpp
// C++17、各オブジェクトが持つ役割を読むための例
#include <memory>

struct Enemy {};
int frameCount = 0;                     // 静的記憶域期間

void Update() {
    float dt = 0.016f;                  // 自動記憶域期間
    static int calls = 0;               // この定数による初期化は静的初期化
    ++calls;
    auto owner = std::make_unique<Enemy>();
    // owner自身は自動、所有されるEnemyは動的記憶域期間
    (void)dt;
} // ownerの破棄がEnemyの破棄・記憶域の解放につながる
```

このコードは説明用です。`unique_ptr`の所有関係は[RAII](/languages/cpp/raii.html)と[所有権と借用](/runtime/memory/ownership-and-borrowing.html)へ進んでください。

## スコープと寿命は別物

関数内のローカル変数を指すポインタを返しても、その変数の寿命は延びません。関数を抜けた後に、そのポインタを逆参照して元の変数へアクセスするのは不正です。**ポインタを返す操作と、解放後の領域を読み書きする操作を混同しない**ようにします。

反対に、`unique_ptr`を値で返す場合は、所有する動的オブジェクトを呼出し側へ引き渡せます。同じ「関数から返す」でも、何が返り、何を所有しているかで意味が変わります。[メモリバグ図鑑](/runtime/memory/memory-bugs.html)も参照してください。

### 寿命が延びる/延びない例

```cpp
// GetNameはstd::stringを値で返すものとする
const std::string& a = GetName(); // この束縛では一時オブジェクトの寿命が延びる
std::string&& b = GetName();      // この右辺値参照の束縛でも延びる
std::string_view c = GetName();   // string_viewは所有せず、文字列の寿命は延びない
```

寿命延長は「const参照なら常に有効」という規則ではありません。束縛に使う式と初期化の文脈に依存し、右辺値参照も関係します。参照引数へ渡した一時オブジェクトを関数が参照で返しても、その返された参照へ束縛することで寿命を再延長できるわけではありません。詳細は[C++作業草案の一時オブジェクト](https://eel.is/c++draft/class.temporary)で確認できます。

## 静的記憶域の罠: 初期化順問題 (static initialization order fiasco)

異なる翻訳単位のグローバル変数が、互いの**動的初期化の完了**を当てにすると問題になります。同じ翻訳単位内の通常の定義の順序、inline変数、テンプレート、スレッドなどで規則が異なるため、「すべて未規定」と一括りにもできません。

たとえば別ファイルの`Game g_game{g_audio.Volume()};`は、`g_audio`の動的初期化が先に終わっていると保証できるかを確認する必要があります。ゼロ初期化が行われていることと、クラスの構築が完了していることは別です。[動的初期化の規則](https://eel.is/c++draft/basic.start.dynamic)を参照してください。

依存するサブシステムを`main`から明示的に生成する、所有者へまとめる、初回利用時に初期化する関数内staticを使う、といった対策があります。関数内staticでも、初期化が循環する場合や終了時の依存は自動では解決しません。

## C#との対応

通常の安全な管理コードでは、GCが追跡する強い参照を通じて利用される管理オブジェクトが、C++のように任意の`delete`で先に解放されることはありません。ただし、GCが見るのは**ルートからの到達可能性と実行時の生存情報**です。使われなくなったローカル変数の字句スコープが残るだけでは、生存の保証になりません。ネイティブAPIとの連携では[GC.KeepAlive](https://learn.microsoft.com/en-us/dotnet/api/system.gc.keepalive)が必要になる場面があります。これはオブジェクトの移動を防ぐpinningとは別です。

`struct`と`class`は値と参照の扱いを区別する型の分類です。**struct＝必ずスタックではありません。** 配列要素やオブジェクトのフィールドとして格納される値型、boxingされた値型もあります。配置は実行環境や最適化にも依存します。[C#の値型](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)と[値型の格納](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/choosing-between-class-and-struct)を参照してください。

## Unity開発者が誤解しやすい点

1. ローカル変数を関数から返せるかは、値・所有者・非所有参照を分けて判断します。C#にも`ref`や`Span<T>`の脱出制限、unsafeなポインタ、ネイティブ資源の寿命があります。
2. UnityEngine.ObjectのC#ラッパーの生存と、エンジン側の実体の寿命は別です。GCだけで`Destroy`やネイティブ資源の解放を説明しません。
3. C++のデストラクタが実行されても、プロセスの常駐量が直ちに同じ量だけ減るとは限りません。アロケータへ返る段階とOSへの返却を分けます。

## ゲーム開発での使用例

- シーンの状態はSceneContext、ゲーム全体の状態はGameContextなど、寿命に合う所有者へまとめる。
- フレーム内だけの一時データは、必要量と破棄条件を確認してローカルな値や[アリーナ](/runtime/memory/allocators-and-pools.html)で扱う。
- C#の管理オブジェクト、Disposeする資源、Unityのネイティブオブジェクトを[GCとの比較](/runtime/memory/gc-and-csharp-comparison.html)で区別する。

## 理解度チェック

1. 同じ記憶域でオブジェクトを作り直すとき、何が継続し、何の寿命が終わりますか。
2. ローカルなunique_ptrと、所有されるオブジェクトは同じ記憶域期間ですか。
3. const参照、右辺値参照、string_viewで一時文字列を受けたときの違いは何ですか。

## 演習

配布済みの<a href="/study/samples/cpp/lifetime_demo.cpp" download>lifetime_demo.cpp</a>は、デストラクタの順序と関数内staticの初期化を観察する既存サンプルです。この本文の改訂では、このサンプルの再実行は行っていません。

OSの記憶域を観察する場合は、[Windowsの予約・コミット・初回書込みの実践](/practice/memory/windows-memory-observation.html)へ進んでください。

本文の対象：C++17/20の一般的な使い方、C#/.NETとUnityの寿命の区別。2026-11-02に上記の一次資料と照合しました。説明用コード断片すべてを今回実行した、という記録ではありません。
