---
title: ケーススタディの演習
study:
  source: C++ Wiki
  status: published
  summary: 次の症状は、どのケーススタディで学んだ何のサインですか。 「同じ型分岐のswitchが5つの関数に複製されている」 「bool変数が8個あり、if条件が4つ以上のフラグを見ている」
  section: practice
  format: exercise
  domain: design
  collection: cpp-exercises
  order: 11
---

<div id="第11部-演習-—-ケーススタディ" class="study-legacy-anchor" aria-hidden="true"></div>

# ケーススタディの演習

## 問1. 概念確認(破綻シグナルの診断)

次の症状は、どのケーススタディで学んだ何のサインですか。

1. 「同じ型分岐のswitchが5つの関数に複製されている」
2. 「bool変数が8個あり、if条件が4つ以上のフラグを見ている」
3. 「機能追加のたびに、無関係なはずのゲームロジックのファイルに触っている」
4. 「効果ごとにタイマー変数がキャラクラスに増えていく」
5. 「アップデート後、ユーザーのセーブが読めなくなった」

<details><summary>解答</summary>

1. [武器切り替え](/design/case-studies/weapon-switching.html): switch散らばり=ポリモーフィズム/データ駆動の出番。2. [敵AI](/design/case-studies/enemy-ai.html): フラグの網=FSMのサイン。3. [実績](/design/case-studies/achievements.html)/[イベント通知](/design/case-studies/event-notification.html): 観測者がロジックに寄生=Pub/Subで分離。4. [ステート異常](/design/case-studies/status-effects.html): 同時複数・個別寿命=効果リスト。5. [セーブデータ](/design/case-studies/save-data.html): バージョン・名前付き形式の欠如。
</details>

## 問2. コード読解(設計案の識別)

```cpp
void World::KillEnemy(Enemy& e) {
    score_.Add(e.Exp());
    drops_.SpawnFor(e);
    bus_.Publish(EnemyDied{e.Id(), e.Type(), e.Pos()});
    uiQueue_.Push(KillLogRequest{e.Name()});
    world_.Destroy(e);
}
```

スコア/ドロップ、バス発行、UIキューがそれぞれ別の仕組みなのはなぜですか。全部バスにした場合に起きる問題を1つ挙げてください。

<details><summary>解答</summary>

反応の性質が違うから: スコア・ドロップは「ルールの帰結」で順序と確実性が仕様(直呼びで順序をコードに固定)。実績等の「観測者」は順序不問・増減するのでバス。UI・音は「演出」で遅延・集約が欲しいのでキュー([イベント通知](/design/case-studies/event-notification.html))。全部バスにすると、例えば「ドロップ生成がDestroyの後になる」ような順序が購読登録順に依存し、保証のない偶然の動作になる。
</details>

## 問3. 問題のあるコードの改善(総合)

「ショップNPCに話しかけると、(1) 所持金UIを開き、(2) 販売リストをハードコードのswitchで構築し、(3) 購入時に `Player::gold` を直接減らし、(4) 購入音をFMOD APIで直接鳴らす」1つの関数(200行)があります。4つの問題それぞれに、学んだケースから対応する改善を割り当ててください。

<details><summary>解答の要点</summary>

(1) UI直接操作 → [UI通知](/design/case-studies/ui-notification.html): 画面遷移/表示はスタックやキュー経由に。(2) 商品ハードコード → [アイテム効果](/design/case-studies/item-effects.html)/[武器切り替え](/design/case-studies/weapon-switching.html)のデータ駆動: 商品テーブル(データ)化。(3) gold直接操作 → [カプセル化](/design/foundations/abstraction-encapsulation.html)+購入手続きの集約(検証→支払→付与を1サービスに: [SOLID演習の問7](/design/solid/exercises.html))。(4) FMOD直叩き → [サウンド管理](/design/case-studies/sound-manager.html): ID化+Facade経由。全体としては[責務の分離](/design/foundations/responsibility-and-separation.html)の総合演習。
</details>

## 問4. 設計比較(規模の判断)

「1人開発・開発期間3ヶ月・敵5種・武器3種」のアクションゲームで、次のどれに設計投資しますか。優先度順に3つ選び、理由を書いてください。

A. 敵AIのBehavior Tree基盤 B. セーブのバージョン管理 C. サウンドのID化 D. 武器のStrategy化 E. DIコンテナ F. イベントバス

<details><summary>解答例</summary>

推奨: **B → C → (D)**。B: セーブ互換は後から直せない(YAGNIの例外 → [セーブデータ](/design/case-studies/save-data.html))。C: 初日にID化するだけで将来の全進化が無痛([サウンド](/design/case-studies/sound-manager.html))、コストほぼゼロ。D: 武器3種ならswitchでも足りるが、固有状態(弾数)が出た時点で安い移行。A: 敵5種にBTは過剰([敵AI](/design/case-studies/enemy-ai.html))。E/F: この規模では配線コストが利益を上回る([Service LocatorとDI](/game/patterns/service-locator-and-di.html))。——「安い保険(B,C)を先に、重い基盤(A,E,F)は破綻の証拠が出てから」が判断の型。
</details>

## 問5. デバッグ問題

「ロックオン中にターゲットの敵が死ぬと、たまにカメラが原点(0,0,0)を向く」。[照準制御](/design/case-studies/aim-control.html)と[メモリバグ図鑑 — dangling pointer・use-after-free・double free・memory leak・buffer overflow・stack overflow](/runtime/memory/memory-bugs.html)の知識で、原因の候補2つと対策を書いてください。

<details><summary>解答の要点</summary>

候補1: ターゲットへの参照がdangling(削除済み敵の位置=ゴミ or 解放済みメモリ)——「たまに」はメモリ再利用のタイミング依存の典型。候補2: 「死亡→null設定」はしているが、同フレームの後続処理(カメラ更新)が設定前の値を読む**更新順序**問題。対策: 弱参照/世代ハンドル+毎フレームの有効性確認を「照準モード更新の冒頭」に置き、無効ならその場でFreeAimへ遷移(フレーム内の順序も設計に含める)。
</details>

## 問6. 説明問題

「デザインパターンを勉強したので、次のプロジェクトでは最初から全部適用しようと思います」という後輩に、ケーススタディ全体の教訓を使って4文以内で助言してください。

<details><summary>解答例</summary>

各ケースで見た通り、正解は規模と要求で変わり、小規模では「素朴な実装」や「パターンなしの簡潔案」が最適なことが多い。パターンは破綻のシグナル(switchの複製、フラグの網、変更の波及)が出たときに、その痛みに対応するものを選ぶ道具だ。ただし「セーブのバージョン」「サウンドのID化」「意図の構造体」のような**後から変えるのが高くつく少数の決定**だけは先にやる価値がある。「全部最初から」でも「全部後回し」でもなく、可逆性で仕分けるのが実務の判断だよ([YAGNI](/design/foundations/yagni-kiss-dry.html))。
</details>

## 問7. 小規模実装問題(総合)

ミニゲーム「Wave Survival」の骨格を設計・実装してください(コンソール出力の擬似ゲームで可):

- 敵がWaveごとに湧く([オブジェクト生成](/design/case-studies/object-spawning.html): 登録制ファクトリ+スポーン予約)
- 敵は Patrol→Chase→Attack のFSM([敵AI](/design/case-studies/enemy-ai.html))
- 撃破でスコア・実績カウント・ログ表示([イベント通知](/design/case-studies/event-notification.html)の3分類)
- 状態異常(毒)を1種([ステート異常](/design/case-studies/status-effects.html): 効果リスト)

評価基準: (a) 3分類(ルール/観測/演出)が構造に現れているか、(b) 各システムが他システムの内部に触れていないか、(c) 「この規模なら過剰だった部分」を自己申告できるか。[samples/](/tools/build/samples/) の各サンプルが部品として流用できます。

---

関連項目：[照準制御](/design/case-studies/aim-control.html) / [学習ガイド](/design/case-studies/) / [設計判断の読み進め方](/design/decisions/)
