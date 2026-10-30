# Shooter demo — Unity 6.0

対象は **Unity 6.0（6000.0系）の2D Built-In Render Pipeline** です。`ShooterModel.cs` と `ShooterDemo.cs` を同じプロジェクトへ入れて使います。画像、Prefab、Physics2D、Canvas、TextMesh Pro、Cinemachineは不要です。

## 起動

1. 2DのBuilt-In Render Pipelineプロジェクトで、新しい空のSceneを開きます。URP/HDRPのテンプレートとは区別してください。
2. 2つの`.cs`を`Assets`配下へコピーします。独自asmdefを使わない通常の`Assembly-CSharp`が前提です。
3. 空のGameObjectを一つ作り、Transformを初期値にし、`ShooterDemo`をattachします。同じSceneでは一つだけ動かしてください。
4. PlayしてGame viewへfocusを合わせます。Camera、共有circle sprite、プレイヤー・弾・敵の表示pool、HUDが自動で用意されます。

このadapterはBuilt-InのSpriteRenderer既定materialを使います。URP/HDRPを検出した場合はConsoleへ前提を表示して停止します。URP 2Dへ移植するには2D Rendererと対応するunlit Sprite material等を用意し、material・camera設定と描画をそのpipelineで確認する必要があります。このファイルは全pipeline対応版ではありません。

既存のMain Cameraは削除・変更しません。このdemoが別のCamera（depth 10）を所有して描画します。新しい空のSceneという前提で、他のCamera/rendererとの合成は扱いません。Game viewを640×720にするとモデルのpixel座標を追いやすく、他の比率でも全プレイ領域が収まります。

## 入力設定

`Edit > Project Settings > Player > Other Settings > Active Input Handling`を、使うbackendに合わせます。設定変更時にEditorの再起動を求められた場合は従ってください。

- `Input System Package (New)`：Package ManagerでそのEditorに対応するInput Systemが導入済みであること。`ENABLE_INPUT_SYSTEM`が定義されたときだけ`UnityEngine.InputSystem`と`Keyboard.current`をcompileします。参照資料は **Input System 1.11.2**。入力更新は`Process Events In Dynamic Update`を使います。
- `Input Manager (Old)`：`ENABLE_LEGACY_INPUT_MANAGER`側の`Input.GetKey` / `GetKeyDown`をcompileします。Input System packageは不要です。
- `Both`：このサンプルは新Input System側を選び、一つの操作を両backendから二重取得しません。

どちらのdefineもない場合は入力を呼び出さずHUDへ状態を表示します。新Input Systemでkeyboardが見つからない場合も`null`を扱います。defineを自分で追加してpackageの存在を偽装しないでください。

| 操作 | キー |
| --- | --- |
| 移動 | 矢印 / WASD |
| 発射 | Spaceを押し続ける |
| 初期状態へ戻す | Rを押す（押し始めを一度消費） |

## ModelとUnity lifecycle

`ShooterModel`は`System`だけを使う純C#の状態機械です。主なAPIは`Tick(ShooterInput)`、`Reset()`、player/HP/score/GameOverのgetter、`BulletCount` / `EnemyCount`と`GetBullet(i)` / `GetEnemy(i)`です。actorは値のコピーで返し、viewへ書換え可能な内部配列や参照を渡しません。

`Awake`がmodelと表示資源を作ります。Unityの可変周期の`Update`で入力を一度読み、accumulatorへ`min(Time.deltaTime, 0.1)`を加え、`1/60秒`ごとにmodelの`Tick`を最大5回呼びます。それでも残る全tick分は捨て、1tick未満の端数だけ保持します。Rのedgeはtickがないframeを越えて保持し、最初のtickだけで消費します。Unityの`FixedUpdate`やPhysics2Dは使っていません。

各tickは、restart→GameOver停止判定→cooldown/無敵時間→移動/発射→spawn→弾と敵の移動→弾と敵の衝突→敵とplayerの接触→画面外のmark→最後のcleanup、の順です。新しい弾・敵も作成tickに移動します。初射はtick 1、以後9tick間隔、敵はtick 39から39tick間隔、無敵時間は48tickです。これらは60Hzでそれぞれ0.15/0.65/0.8秒に相当します。

弾64・敵32の上限では生成をskipします。skip時もcooldown・spawn間隔を消費し、敵のx cycleもspawn試行ごとに進みます。弾一つは敵一体だけに当たり、敵とplayerが同tickで複数接触しても無敵時間によってHP減少は一度です。HP 0ではmodelの更新を止め、restartでHP 3・score 0からやり直します。

表示は100 pixelを1 Unity unitにし、yを反転します。640×720の中央がworld原点です。64×64の白いcircle texture/spriteを一度だけ作り、各SpriteRendererが色・半径・位置を表します。弾・敵はindexに対応するRenderer poolを有効/無効にするだけで、Rendererのdestroyや位置変更からmodelを更新しません。`OnGUI`はHUD専用で、GUIStyleを最初の呼出しでcacheし、score/HP文字列は値が変わった`Update`でだけ作ります。`OnDestroy`では自分が生成したGameObject・sprite・textureだけを破棄します。

固定tickは更新の刻みを定義するもので、異なる処理系間の浮動小数点のbit一致まで保証するものではありません。

## 検証範囲

純modelはローカルの.NET SDK 5.0.416、`net5.0`、Releaseでコンパイル・実行し、36件のassertionを確認しました。移動正規化・境界、初射と9tick間隔、39tick spawn、一弾一敵、死者skip、無敵48tick、GameOver/Restart、上限時の試行消費とx cycleを含みます。衝突・上限のfixtureを作るreflectionは公開サンプルには含めていません。この.NETはローカル検証用で、配布先への.NET 5導入を勧めるものではありません。

APIの対象は6000.0系ですが、手元の **Unity 6000.3.27f1** でも、新規の隔離projectを`-batchmode -nographics`で開き、両ファイルのEditorコンパイルとmodelの簡単な実行を確認しました。`ENABLE_LEGACY_INPUT_MANAGER`側でコンパイルされ、検査用Editor methodはexit code 0で終了しました。

6000.0 Editorそのもの、GUIでの描画、実キーボード入力、Player build、新Input System側のEditor実行は未検証です。headlessのコンパイル確認と、遊んで表示・入力を確認する検証は区別しています。

## 公式資料

- [Unity 6.0: MonoBehaviour.Update](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Update.html)
- [Input System 1.11.2: Installation / Active Input Handlingとdefine](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Installation.html)
- [Input System 1.11.2: Keyboard.currentとkeyの状態](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Keyboard.html)
- [Unity 6.0: Input.GetKey](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Input.GetKey.html)
- [Unity 6.0: MonoBehaviour.OnGUI](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.OnGUI.html)
- [Unity 6.0: Sprite.Create](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Sprite.Create.html)
