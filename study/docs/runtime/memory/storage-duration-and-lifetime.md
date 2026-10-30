---
title: 記憶域期間とスコープ・寿命の違い
study:
  source: C++ Wiki
  status: published
  summary: C++のオブジェクトには「いつ生まれ、いつ死ぬか」の分類=記憶域期間 (storage duration) が3+1種類あります。そしてスコープ(名前が見える範囲)と寿命(実体が生きている期間)は別物——この区別が曖昧だとdangling系のバグを理解できません。
  section: reference
  format: article
  domain: runtime
---

# 記憶域期間とスコープ・寿命の違い

## 一言で言うと

C++のオブジェクトには「**いつ生まれ、いつ死ぬか**」の分類=**記憶域期間 (storage duration)** が3+1種類あります。そして**スコープ(名前が見える範囲)と寿命(実体が生きている期間)は別物**——この区別が曖昧だとdangling系のバグを理解できません。

## 4つの記憶域期間

| 期間 | 生成〜破棄 | 置き場所(典型) | 例 |
|---|---|---|---|
| **自動 (automatic)** | スコープ開始〜終了 | スタック | ローカル変数、引数 |
| **静的 (static)** | プログラム開始前後〜終了 | .data/.bss | グローバル変数、static変数 |
| **動的 (dynamic)** | new〜delete(自分で決める) | ヒープ | new/make_uniqueしたもの |
| スレッド (thread_local) | スレッド開始〜終了 | スレッドごとの領域 | thread_local変数 |

```cpp
// C++20
int g_frameCount = 0;                    // 静的: main前に0初期化、プログラム終了まで生きる

void Update() {
    float dt = 0.016f;                   // 自動: この関数の間だけ
    static int callCount = 0;            // 静的: 初回呼び出しで初期化、以後ずっと生きる
    auto e = std::make_unique<Enemy>();  // 動的: eの破棄と共にdelete(RAIIで自動に紐付け)
}                                        // dt消滅、eのデストラクタ→Enemyもdelete
```

## スコープと寿命は別物

```cpp
Enemy* Make() {
    Enemy local;          // 寿命: この関数の間だけ
    return &local;        // スコープを超えてアドレスだけ持ち出す
}                         // localは死ぬ
Enemy* p = Make();        // pは死体を指している(dangling)。使えばUB
```

- **スコープ**はコンパイル時の概念(名前がどこで見えるか)
- **寿命**は実行時の概念(実体がいつまで有効か)
- ポインタ・参照・ラムダの参照キャプチャ・string_view・イテレータは、**名前を介さずに寿命切れの実体へ到達する穴**を作れる——これがC++のメモリバグの構図そのもの(→ [メモリバグ図鑑](/runtime/memory/memory-bugs.html))

### 寿命が延びる/延びない例

```cpp
const std::string& r = GetName();        // 戻り値(一時オブジェクト)をconst参照で受けると
                                         // 一時の寿命がrに合わせて延長される(特別規則)
std::string_view sv = GetName();         // 延長されない! 一時は文末で死に、svはdangling
```

寿命延長の規則は限定的で、「const参照に直接束縛したときだけ」。**規則を暗記するより「一時オブジェクトを参照系の型で保存しない」**を習慣にする方が安全です。

## 静的記憶域の罠: 初期化順問題 (static initialization order fiasco)

**別々の翻訳単位にあるグローバル変数の初期化順は未規定**です。

```cpp
// audio.cpp
AudioSystem g_audio;               // これと
// game.cpp
Game g_game{ g_audio.Volume() };   // これのどちらが先か、保証がない → 未初期化のg_audioを触るかも
```

対策:

1. グローバル変数同士を依存させない(そもそもグローバルを減らす → [Singleton](/design/patterns/singleton.html)の問題と同根)
2. 関数内static(Meyers' Singleton)にする: 初回アクセス時初期化なので順序が使用順になる
3. 明示的な `Startup()/Shutdown()` をmainから呼ぶ(エンジンの定石)

**破棄順**も同様に危険(終了時クラッシュの一大原因): staticなオブジェクトのデストラクタが他のstaticを触ると事故ります。

## C#との対応

- C#では「参照が残っていれば生きている」(寿命をGCが管理)ため、**寿命切れの実体を指す**という状況が原理的にない(danglingがない世界)。代わりに「いつ死ぬか分からない」(非決定的破棄)世界
- C#のstaticフィールドの初期化順は型の静的コンストラクタで規定されており、C++の翻訳単位間フィアスコに相当する問題は薄い
- スタックとヒープの区別: C#では型(struct/class)でほぼ決まるが、C++では**同じ型をどこにでも置ける**(→ [値と参照](/languages/cpp/values-pointers-references.html))

## Unity開発者が誤解しやすい点

1. 「ローカル変数を返しても大丈夫」— C#では常に安全(値はコピー、参照はGCが延命)。C++では**参照・ポインタで返した瞬間にUB予備軍**
2. 「staticはシーンをまたいで残る便利な置き場」— C++のstaticは初期化・破棄順という別の危険を持つ
3. `Awake/OnDestroy` のようなエンジン管理の寿命と、C++の言語寿命は別レイヤー。UEではさらにGC寿命が重なる(→ [UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr](/game/unreal/gc-and-object-pointers.html))

## ゲーム開発での使用例

- フレーム内だけ有効なデータ(当たり判定結果リスト)は自動記憶域 or フレームアロケータ(→ [arena](/runtime/memory/allocators-and-pools.html))
- 「シーンの寿命」「ゲーム全体の寿命」を型で表す(SceneContext、GameContextが所有 → [所有権](/runtime/memory/ownership-and-borrowing.html))
- エンジンのサブシステム初期化・終了は明示的Startup/Shutdown方式が定石

## 理解度チェック

1. 4つの記憶域期間と、それぞれの生成・破棄タイミングを言えますか。
2. スコープと寿命の違いを、danglingの例で説明できますか。
3. static initialization order fiascoとは何で、対策は?

## 演習

samples/lifetime_demo.cpp(検証済み)で、(a) デストラクタの実行順(自動変数は逆順)、(b) 関数内staticの初期化タイミング、を出力で確認してください。ローカル変数のアドレスを返す関数はコメントで「なぜ危険か」を読むだけにしてください(実行しない)。

---

関連項目：[学習ガイド](/runtime/memory/) / [所有権と借用](/runtime/memory/ownership-and-borrowing.html)
