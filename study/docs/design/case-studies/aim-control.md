---
title: 照準制御の設計
study:
  source: C++ Wiki
  status: published
  summary: TPS/アクションの「狙う」機能——エイムアシスト、ロックオン、カメラ追従の設計です。数学とゲームフィールの絡む題材で、Update順序(Game Loop)が品質を左右します。
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-15-照準制御" class="study-legacy-anchor" aria-hidden="true"></div>

# 照準制御の設計

TPS/アクションの「狙う」機能——エイムアシスト、ロックオン、カメラ追従の設計です。数学とゲームフィールの絡む題材で、**Update順序**([Game Loop](/game/patterns/game-loop-and-update.html))が品質を左右します。

## 素朴な実装

```cpp
// C++20
void Player::UpdateAim(const FrameInput& in, float dt) {
    aimYaw_ += in.lookX * sensitivity_ * dt;
    aimPitch_ = std::clamp(aimPitch_ + in.lookY * sensitivity_ * dt, -80.f, 80.f);
}
```

素の視点操作。ここまでは全ゲーム共通です。

## 機能追加で破綻する過程

1. **エイムアシスト**(敵に吸い付く)→ 入力補正がUpdateAimに直書きされ、アシストの強さ調整のたび操作感全体が壊れる
2. **ロックオン**(ボタンでターゲット固定)→ 「自由視点とロックオンの排他」がフラグ分岐に。ロックオン対象の死亡・画面外離脱の処理が散らばる([dangling参照問題](/runtime/memory/ownership-and-borrowing.html)の実戦形)
3. 「乗り物では感度・制限が違う」「弓は偏差射撃補助」→ モード×補正の組み合わせがif爆発
4. カメラ・キャラ回転・照準UIの更新順序が絡み、**1フレーム遅れの照準ズレ**(カメラが先か狙いが先か)

## 案A: 照準モードのFSM+補正パイプライン(定石)

2つの直交する軸を別の仕組みに分けます。

```
軸1: モード(排他的・状態遷移あり)→ [FSM](../04_game_patterns/state_machines.md)
     FreeAim ⇄ LockOn ⇄ VehicleAim(遷移条件: ボタン、対象喪失、搭乗)

軸2: 入力補正(重ねがけ・調整対象)→ パイプライン(関数の列)
     生入力 → [感度カーブ] → [エイムアシスト(吸着)] → [クランプ] → 最終角度
```

```cpp
class IAimMode {                                     // モード=State
public:
    virtual ~IAimMode() = default;
    virtual AimResult Update(const AimContext& ctx, float dt) = 0;
    // 戻り値で遷移先を返す形は [State](../03_design_patterns/state.md) と同じ
};

// 補正はStrategyのリスト(調整はデータで)
using AimModifier = std::function<Vec2(Vec2 input, const AimContext&)>;
std::vector<AimModifier> pipeline_;                  // [Decoratorのリスト方式](../03_design_patterns/decorator.md)と同型
```

- アシストの調整=パイプラインの係数(データ)。モード追加=クラス1つ
- ロックオン対象は**弱参照/ハンドル**で保持し、毎フレーム有効性を確認(死亡・遮蔽・距離で解除)——[ロックオンカメラ問題](/runtime/memory/exercises.html)の本番

## 案B: 継承案(比較のため)

`Player` → `LockOnPlayer` は論外(実行時に型を変えられない)。`AimController` 基底からモード別派生は案AのFSMと実質同じで、健全(浅い継承+差し替え)。**「Playerの派生」ではなく「Playerが持つ部品の差し替え」**にするのが分かれ目([コンポジション](/design/foundations/inheritance-delegation-composition.html))。

## 案C: パターンを使わない簡潔案

モードが「通常/ロックオンの2つだけ」なら:

```cpp
if (lockOnTarget_ && IsValid(lockOnTarget_)) UpdateLockOn(dt);
else UpdateFreeAim(in, dt);
```

関数2つ+対象ハンドル1つ。エイムアシストなしのアクションならこれで完成です。

## 更新順序の設計(破綻4への回答)

照準は「入力→照準→キャラ回転→カメラ→UI」の**依存の鎖**であり、順序を明示しないと1フレーム遅れが混入します。

```
推奨順(1フレーム内): 入力取得 → 照準モード更新(狙い決定) → キャラ/銃口回転
                     → カメラ更新(狙いに追従) → 照準UI(カメラ確定後の投影)
```

- エンジンの更新枠(UnityのUpdate/LateUpdate、UEのTickGroup)に**この鎖を意図的に割り付ける**: カメラはLateUpdate/PostUpdateWork——「カメラはLateUpdate」という慣習の理由がこの鎖です
- 前フレーム値を読む箇所(意図的な遅延)はコメントで明示——[Double Buffer](/game/patterns/optimization-patterns.html)的な「どの時点の値か」の意識

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小(視点操作のみ〜ロックオン1種) | 素朴版 → 案C |
| 中(アシスト・複数モード) | 案A(FSM+パイプライン)。係数はデータ化(調整が毎日入るため) |
| 大(対戦FPS級) | 案A+入力の[固定レート処理](/game/patterns/game-loop-and-update.html)(感度の再現性)+アシストのチューニング環境(リプレイ+可視化) |
| Unity | 案A+Cinemachine(カメラ側の状態遷移はCinemachineが持ってくれる) |
| UE | 案A+SpringArm/CameraManager。Enhanced Inputの修飾子(Modifier)が入力パイプラインの一部を担う |

## この題材の教訓

- 「モード(排他)」と「補正(重ねがけ)」という**直交する2軸を見抜いて別の構造に載せる**——[ステート異常](/design/case-studies/status-effects.html)(排他でない→リスト)と[敵AI](/design/case-studies/enemy-ai.html)(排他→FSM)で学んだ判断の複合問題
- 操作感の品質は構造だけでなく**更新順序**で決まる。設計図に「1フレームの中の順序」を描く習慣を

---

関連項目：[イベント通知](/design/case-studies/event-notification.html) / [学習ガイド](/design/case-studies/) / [演習](/design/case-studies/exercises.html)
