---
title: サウンド管理の設計
study:
  source: C++ Wiki
  status: published
  summary: "同時発音の氾濫: 敵10体同時死亡でSEが10重に鳴り音割れ(集約・間引きの場所がない) ミドルウェア変更(FMOD→Wwise)で全呼び出し箇所を書き換え(Adapterの不在)"
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-11-サウンド管理" class="study-legacy-anchor" aria-hidden="true"></div>

# サウンド管理の設計

## 素朴な実装

```cpp
// C++20 — 各所でオーディオAPIを直叩き
void Enemy::Die() {
    FmodApi::Play("assets/se/enemy_die.wav", 0.8f);   // パス直書き・API直結
}
```

## 機能追加で破綻する過程

1. **同時発音の氾濫**: 敵10体同時死亡でSEが10重に鳴り音割れ(集約・間引きの場所がない)
2. ミドルウェア変更(FMOD→Wwise)で全呼び出し箇所を書き換え([Adapter](/design/patterns/adapter.html)の不在)
3. 「BGMをクロスフェード」「エリアで環境音切替」→ 再生の状態管理(今何が鳴っているか)が存在しない
4. パス直書きが散在し、ファイル名変更でゲーム中の音が静かに消える(エラーにもならない)
5. 音量設定(マスター/BGM/SE別)を反映する場所がない
6. サウンド担当が調整のたびプログラマに依頼(データ駆動でない)

## 案A: Facade+Adapter+リクエストキュー(定石の三点セット)

```
[ゲームコード] ──PlaySe(SeId::EnemyDie)──> [AudioFacade]
                                             │ ・ID→アセットの解決(データテーブル)
                                             │ ・同フレーム重複の間引き([Event Queue](../04_game_patterns/event_queue_and_pubsub.md))
                                             │ ・同時発音数制限・優先度
                                             │ ・音量カテゴリ適用
                                             ▼
                                       [IAudioBackend(Adapter)] ──> FMOD / Wwise / 自前ミキサ
```

- ゲーム側は**IDで要求するだけ**(パス・API・チャンネルを知らない): [Facade](/design/patterns/facade.html)
- バックエンドは[Adapter](/design/patterns/adapter.html)で差し替え可能(テスト時は録音フェイク=「この操作でこの音が要求されたか」をテストできる)
- 再生要求はキューに積んで**間引き・優先度処理**をしてから発音: 破綻1への回答([Event Queueのサウンド適用例](/game/patterns/event-queue-and-pubsub.html)は業界の古典)
- ID→アセット対応はデータ(テーブル)にしてサウンド担当が編集: 破綻4・6への回答

## 案B: イベント購読方式(発行側をさらに疎に)

ゲームは `EnemyDied` を発行するだけで、**サウンド側が「何を鳴らすか」を購読して決める**([実績システム](/design/case-studies/achievements.html)と同じ構図)。

- 利点: ゲームコードから音の知識が完全に消える(「この出来事にどの音か」はサウンド側の関心という整理)
- 欠点: 「このタイミングでこの音を明示的に」という演出制御がしにくい。実務では**汎用SEは購読、演出音は明示要求**のハイブリッドが多い

## 案C: パターンを使わない簡潔案

`PlaySe(id)` / `PlayBgm(id)` の**自由関数2つ**+中身は直書き(間引きは「同一IDは同フレーム1回」の10行だけ入れる)。ジャム〜小規模はこれで十分。案Aは、この関数の中身が育った姿——**入口をID化しておけば移行は無痛**です。

## 継承案について

`Enemy` → `NoisyEnemy` のような音の継承は論外。「鳴らす側の階層」も不要(音の差はデータ)。この題材で継承が出てくる場面はバックエンドのAdapter実装(`FmodBackend : IAudioBackend`)だけです。

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小 | 案C(ID化した関数2つ)。パス直書きだけは初日から避ける |
| 中 | 案A(Facade+間引き+データテーブル)。バックエンドAdapterは差し替え予定がなければ後回し可 |
| 大 | 案A+案B併用+ミドルウェア(FMOD/Wwise)——**大規模ではミドルウェア採用が前提**で、Facadeは「ミドルウェアのイベントIDへの橋」になる |
| Unity | AudioSource直叩きを卒業して案C→案A。ScriptableObjectでSEテーブル |
| UE | MetaSounds/SoundCueが「データ駆動の音」を既に提供。Facade相当はGameplay側の薄い層+[Subsystem](/game/unreal/gameplay-framework.html) |

## この題材の教訓

- サウンドは「**要求と発音の分離**」が全て: 要求(ゲームの都合)と発音(ミキシングの都合: 間引き・優先度・音量)の間に1枚あるだけで、破綻1〜6が全部解ける
- 最初の1日にやるべきは設計ではなく「**IDで鳴らす**」という入口の統一だけ——後の全進化がその入口の中で起きる

---

関連項目：[画面遷移](/design/case-studies/screen-transition.html) / [学習ガイド](/design/case-studies/) / [アイテム効果](/design/case-studies/item-effects.html)
