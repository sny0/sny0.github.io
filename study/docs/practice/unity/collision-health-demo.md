---
title: Unity実践 — 壁で止まり、ダメージ床を通り抜ける
study:
  source: 新規執筆
  section: practice
  format: tutorial
  status: published
  domain: game
  collection: unity-scene-health
  order: 3
  summary: 前回の2D入力シーンに壁を置き、Rigidbody2D.Castで移動を制限する処理と、ダメージ床のトリガー通知を比べる。
  aliases: [Unity入門, 2D物理, Rigidbody2D.Cast, ContactFilter2D, 壁, トリガー, ダメージ床]
  verification: Unity 6000.3.27f1とInput System 1.20.1のPlay Modeで、仮想入力による壁での停止・迂回・トリガー通過とRTX 3060での描画を確認（2026-11-16）
---

# Unity実践 — 壁で止まり、ダメージ床を通り抜ける

[前回の入力実践](/practice/unity/input-health-demo.html)の `SceneHealthInput` には、キーボードとゲームパッドで動く `Player` と、通るとHPが下がる床が二つあります。今回は床の間に壁を置きます。移動する前に壁までの距離を調べ、床に入ったときのダメージは既存のトリガーに任せます。Unity 6.3とInput System 1.20.1を使います。

<figure class="study-figure">
  <img src="/images/game/unity-2d-wall-and-trigger.svg" alt="左からPlayer、ダメージ床A、壁、ダメージ床B。床Aは通過でき、壁の手前で止まる。壁の上を回れば床Bへ入れる。" width="760" height="407" loading="lazy">
  <figcaption>Gameビューの配置を示す模式図。最初は右へ進み、壁に着いたら上を回って床Bに入ります。</figcaption>
</figure>

## 1. シーンを複製して壁を置く

1. Playを止め、`SceneHealthInput` を **File > Save As** で `SceneHealthCollision` として保存します。前回と同じく、`Player` の位置は `(-3, 0, 0)`、Box Collider 2Dはサイズ `(1, 1)`、Rigidbody 2Dの **Body Type** は **Kinematic** です。
2. **GameObject > 2D Object > Sprites > Square** で `Wall` を作ります。親は設定せず、Positionを `(0.5, 0, 0)`、Rotationを `(0, 0, 0)`、Scaleを `(0.25, 2, 1)` にします。床と区別しやすい色にします。
3. `Wall` に **Box Collider 2D** を追加し、Sizeを `(1, 1)`、Offsetを `(0, 0)`、**Is Trigger** をオフにします。Rigidbody 2Dは追加しません。Inspector上部の **Layer > Add Layer** で `Wall` レイヤーを作り、`Wall` オブジェクトのLayerに選びます。
4. `DamagePadA` と `DamagePadB` は **Default** レイヤーで **Is Trigger** をオンにしたまま使います。Damageはそれぞれ `3` と `9` です。

## 2. Playerの移動処理を交換する

<a href="/study/samples/unity/collision-health-demo/PlayerCollisionMotor.cs" download>PlayerCollisionMotor.csをダウンロード</a>して、プロジェクトの `Assets` 以下に置きます。

1. `Player` の **Input Mover** と **Demo Mover** が無効になっていることを確認し、**Player Collision Motor** を追加します。座標を変更するコンポーネントは、この例の中では一つだけ有効にします。
2. 前回と同じアセットから **HealthControls > Player/Move** を **Move** 欄へ割り当てます。**Speed** は `2`、**Wall Layers** は `Wall` のみ、**Skin Width** は `0.01` にします。
3. **Health Target** と Player側の **Box Collider 2D** を確認します。前回と同じ `Health.cs`・`HealthTarget.cs`・`DamageTrigger.cs` でHPを処理します。

<<< @/public/samples/unity/collision-health-demo/PlayerCollisionMotor.cs{csharp}

`Update` で入力の向きを読み、`FixedUpdate` で予定移動量を計算します。`Rigidbody2D.Cast` はPlayerに付いたColliderの形を進行方向に掃引します。`ContactFilter2D` で `Wall` レイヤーを選び、トリガーを結果から除きます。予定の移動距離に `Skin Width` を足した範囲まで調べ、壁があれば最も近いヒット距離から `Skin Width` を引きます。その結果を0以上、予定の移動距離以下に収めて `MovePosition` に渡します。距離と余白は移動方向に沿った値です。[Unity 6.3のRigidbody2D.Cast](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Rigidbody2D.Cast.html) · [ContactFilter2D](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/ContactFilter2D.html)

`MovePosition` は次の物理更新で位置を動かします。KinematicのPlayerは、衝突しても自身の動きを物理の反応で止めないため、Castで行き先を手前にします。ダメージ床は物理更新でPlayerと重なり始めたとき、`OnTriggerEnter2D` から `HealthTarget` に処理を渡します。Castでトリガーを除外しても、この重なり通知は受け取れます。[Unity 6.3のMovePosition](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Rigidbody2D.MovePosition.html) · [OnTriggerEnter2D](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Collider2D.OnTriggerEnter2D.html)

## 3. 壁で止まり、床に入る

1. **Play** を押してGameビューにフォーカスし、Dまたは右矢印を押し続けます。床Aの上を通り、壁の手前で止まります。床Aに入った時点でHPは `10 → 7` になり、壁に向かって押し続けてもHPは変わりません。
2. 右入力を離し、上だけを押してPlayerの中心を `y = 1.8` 付近まで動かします。壁の上端は `y = 1`、Playerの半分の高さは `0.5` です。その高さで右へ進み、壁の右を十分に過ぎてから下へ戻り、床Bへ入ります。床Bでも移動は続き、HPは `7 → 0` になります。
3. 二つの判定を切り分けるには、Playを止め、`Wall` の **Is Trigger** だけを一時的にオンにしてやり直します。同じレイヤーのままでもCastの対象から外れるので、直進できます。`Wall` には `DamageTrigger` がないため、ダメージを与えるのは二つの床です。比較が終わったら `Wall` の **Is Trigger** をオフに戻します。

```text
Player: hp=10
DamagePadA: damage=3, hp=7, changed=True
DamagePadB: damage=9, hp=0, changed=True
```

| 観察したいこと | どこを見るか |
| --- | --- |
| 壁の前で止まる | 壁のLayerと **Wall Layers** が一致するか、**Is Trigger** がオフか。 |
| 床では止まらずHPが減る | 床の **Is Trigger** と `DamageTrigger`、Playerの `HealthTarget` を確認する。 |
| 入力しても動かない | **Move** 欄の参照、Gameビューのフォーカス、前回のInput System設定を確認する。 |

この例では、斜めに進んで壁に当たると進行方向全体を短くします。壁沿いに滑る処理や、壁と重なった状態で始めたときに押し出す処理は、別途設計します。シーンを試すときは `Player` を壁の外から開始してください。

### 確認した動作

Unity `6000.3.27f1` と Input System `1.20.1` のPlay Modeで、仮想キーボードと仮想ゲームパッドを使って動かしました。床Aを抜けるとHPが `7` になり、右入力を続けても壁の手前 `x ≈ −0.14` で止まりました。ゲームパッドで上を回り、床Bを抜けるとHPは `0` になりました。Wallレイヤーのまま壁をトリガーにすると、右入力だけで通過し、HPの変化は二つの床からだけ発生しました。描画は GeForce RTX 3060 の Direct3D 11 で確認しました。

## 理解度チェック

1. 壁へ進むPlayerの移動量を決めるのはどの処理ですか。床に入ったことを受け取るのはどの処理ですか。

   ::: details 解答
   壁は `FixedUpdate` のCastで先に調べ、ヒット距離に応じて `MovePosition` の行き先を制限します。床は物理更新で重なったとき、`DamageTrigger` の `OnTriggerEnter2D` で通知を受け取ります。
   :::

2. 壁までのCastのヒット距離が `0.025`、予定移動距離が `0.04`、Skin Widthが `0.01` のとき、進める距離はいくつですか。

   ::: details 解答
   `0.025 − 0.01 = 0.015` です。Skin Widthは、止めたい壁との間に残す余裕です。
   :::

## 関連項目

- [前回の入力実践](/practice/unity/input-health-demo.html)
- [衝突と物理の達成条件](/learn/roadmap.html?node=unity-collision#unity-game)
- [衝突と物理の基本](/game/basics/collisions-and-physics.html)。3Dの `Collider`・`Rigidbody` で同じ役割を見比べる。
- [ゲームの状態とポーズ](/learn/roadmap.html?node=unity-state#unity-game)。プレイ中とポーズ中で入力・移動を切り替える考え方へ進む。
