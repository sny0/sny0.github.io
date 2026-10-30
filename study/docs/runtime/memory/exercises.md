---
title: メモリと実行時の演習
study:
  source: C++ Wiki
  status: published
  summary: 正誤を判定し、誤りは訂正してください。 スコープを抜けた変数のメモリを指すポインタは、次の確保が起きるまでは安全に使える。 shared_ptrの循環参照は、C#のGCと同様に自動回収される。
  section: practice
  format: exercise
  domain: runtime
  collection: cpp-exercises
  order: 7
---

<div id="第7部-演習-—-メモリと実行時" class="study-legacy-anchor" aria-hidden="true"></div>

# メモリと実行時の演習

## 問1. 概念確認

正誤を判定し、誤りは訂正してください。

1. スコープを抜けた変数のメモリを指すポインタは、次の確保が起きるまでは安全に使える。
2. shared_ptrの循環参照は、C#のGCと同様に自動回収される。
3. data raceは未定義動作だが、race conditionは同期があっても起きうる論理バグである。
4. アリーナアロケータの確保が速いのは、ポインタを進めるだけだからである。
5. C#の管理ヒープの確保はC++のmallocより一般に速い。

<details><summary>解答</summary>

1. **誤**。寿命が終わった時点でアクセスはUB。「次の確保まで安全」という保証はどこにもない([寿命](/runtime/memory/storage-duration-and-lifetime.html)、[UB](/languages/cpp/undefined-behavior.html))。2. **誤**。参照カウントは循環を検出しない。weak_ptrで切る([GC比較](/runtime/memory/gc-and-csharp-comparison.html))。3. **正**([並行バグ](/runtime/memory/concurrency-bugs.html))。4. **正**(C#の管理ヒープと同じbump方式 → [アロケータ](/runtime/memory/allocators-and-pools.html))。5. **正**(代金は回収時に払う)。
</details>

## 問2. コード読解

```cpp
std::string_view GetTitle() {
    std::string s = "Stage " + std::to_string(3);
    return s;                       // (A)
}
const std::string& GetName() {
    return "Player";                // (B) 一時stringへの参照を返す
}
```

(A)(B)それぞれの問題を「寿命」の語彙で説明してください。

<details><summary>解答</summary>

(A) string_viewはsの内部バッファへの非所有ビュー。sは関数終了で死ぬため、返されたviewは即dangling([寿命](/runtime/memory/storage-duration-and-lifetime.html)、[配列と文字列](/languages/cpp/arrays-and-strings.html))。(B) 文字列リテラルから一時stringが作られ、その参照を返すが、一時は文末で破棄→dangling参照。戻り値の寿命延長は**呼び出し側のconst参照への直接束縛**でのみ起き、returnでは起きない。どちらも「値で返す」が正解。
</details>

## 問3. 問題のあるコードの改善

「ロックオン中の敵が死ぬとクラッシュする」:

```cpp
class LockOnCamera {
    Enemy* target_ = nullptr;              // 敵はEnemyManagerがvector<unique_ptr>で所有
public:
    void SetTarget(Enemy* e) { target_ = e; }
    void Update() { if (target_) LookAt(target_->Position()); }
};
```

対策を3案(weak_ptr / 世代ハンドル / 死亡イベント)挙げ、この状況での推奨と理由を書いてください。

<details><summary>解答の要点</summary>

nullチェックはdanglingを検出できない(死んでもnullにならない)のが根本原因([借用](/runtime/memory/ownership-and-borrowing.html)、[メモリバグ](/runtime/memory/memory-bugs.html))。(1) weak_ptr: 所有をshared_ptr化する必要があり、大量の敵では設計変更が大きい。(2) 世代ハンドル: EnemyManagerがID+世代で貸し、毎フレーム解決。大量・頻繁な生死に強い業界定石。(3) 死亡イベント購読でtarget_をnullクリア: 変更が最小だが、購読解除漏れという新しい罠。推奨は規模次第——敵が多数なら(2)、小規模で今すぐ直すなら(3)。「所有構造を変えずに済むか」が判断軸。
</details>

## 問4. 設計比較

「毎フレーム最大1000件発生する当たり判定結果(HitInfo、POD)を溜めて、フレーム末尾に処理して捨てる」。(a) `std::vector<HitInfo>`をnewで毎フレーム作る、(b) vectorをメンバに持ちclear()で再利用、(c) フレームアリーナ、を比較してください。

<details><summary>解答の要点</summary>

(a) 毎フレームのヒープ確保・解放=スパイクと断片化の種。論外に近い。(b) clearは容量を保持するため、数フレームで最大サイズに達した後は**確保ゼロ**。実装コストほぼゼロで十分速い——**まずこれ**。(c) 最速・複数システムの一時データを1つの仕組みに統合できるが、Arena基盤の導入が必要。HitInfo1種のためなら過剰、エンジン全体の一時データ方針としてなら正解([アロケータ](/runtime/memory/allocators-and-pools.html))。「(b)で足りるのに(c)を作らない」が本問の狙い。
</details>

## 問5. デバッグ問題

「2時間プレイするとメモリ使用量が緩やかに増え続け、まれにカクつく」。リーク以外の容疑者を1つ挙げ、リークとの切り分け方法を書いてください。

<details><summary>解答の要点</summary>

容疑者: **断片化**(合計使用量は一定でも、ヒープの穴だらけ化でOSから見た使用量が増える/確保が遅くなる → カクつき)([アロケータ](/runtime/memory/allocators-and-pools.html))。切り分け: リークツール(LeakSanitizer/CRTデバッグヒープ)で「解放されない確保」が増えているか確認——増えていればリーク、増えていないのにメモリが増えるなら断片化・キャッシュ的な保持(プールの成長など)。加えて「イベント購読リストの伸び」「ログ/履歴の無限蓄積」などの**論理リーク**(C#でも起きる型)も定番容疑者。
</details>

## 問6. 説明問題

「C++にはGCがないから危険、C#は安全」という後輩に、両言語の事故の**対称性**(早死に/不死)と、どちらでも逃げられない設計課題を4文以内で説明してください。

<details><summary>解答例</summary>

C++の典型事故は「まだ使っているのに解放される」(use-after-free)、C#の典型事故は「もう使わないのに参照が残って死なない」(意図せぬ延命・スパイク)で、方向が逆なだけでどちらも寿命管理の失敗だよ。GCはメモリの回収を肩代わりするだけで、ファイルや購読の解除(Dispose)、いつ・誰が手放すかという設計は残る。つまり「寿命を設計する」仕事自体はどちらの言語にもある。C++はそれを型(所有権)で明示する文化、C#はランタイムに任せて論理面だけ考える文化、という違いだ([GC比較](/runtime/memory/gc-and-csharp-comparison.html))。
</details>

## 問7. 小規模実装問題

固定容量の「フレームスクラッチバッファ」を実装してください: `FrameScratch{ void* Alloc(size_t, size_t align); void Reset(); }`+使用量の最大値記録(High Water Mark)。samples/arena_allocator.cpp を出発点にしてよい。

<details><summary>評価基準</summary>

(a) アラインメント処理が正しい(align-1でのマスク)。(b) 容量超過時の方針(nullptr/assert)を明記。(c) High Water Markで「実際に必要な容量」を計測できる(容量決めうちの根拠になる — 計測文化の実践)。(d) デストラクタが必要な型を置いてはいけない制約をコメントで明示([アロケータ](/runtime/memory/allocators-and-pools.html))。
</details>

---

関連項目：[GCとの違い](/runtime/memory/gc-and-csharp-comparison.html) / [学習ガイド](/runtime/memory/) / [ビルドとライブラリを学ぶ](/tools/build/)
