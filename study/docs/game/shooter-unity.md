---
title: シューティング実装例 — C#とUnity 6
study:
  source: 新規執筆
  status: published
  domain: game
  summary: Unity 6の小さな縦シューティング。純C# ModelをMonoBehaviourへ接続し、入力・固定更新・Sprite表示を分ける。
  aliases:
    - シューティング
    - STG
    - C#
    - Unity
    - MonoBehaviour
    - Input System
    - サンプル
  section: practice
  format: tutorial
  collection: shooter
  order: 3
  verification: モデル検証済み
---

# シューティング実装例 — C#とUnity 6

[設計の考え方と共通仕様](/game/shooter-design.html)をUnityへ接続する例です。APIの基準は**Unity 6の6000.0系・2D Built-In Render Pipeline**とし、実コンパイルは6000.3.27f1で確認しました。[C++版](/game/shooter-cpp.html)と同様に、ルールを持つModelから描画APIを呼びません。

`ShooterModel.cs`は通常のC#コードです。`ShooterDemo.cs`だけがMonoBehaviourとしてUnityの入力・時間・カメラ・SpriteRendererと接続します。表示用の丸、カメラ等を実行時に用意するため、外部の画像やPrefabは不要です。

## シーンを準備する

1. Unity 6で2DのBuilt-Inプロジェクトを用意します。別の作業中シーンとは分けた、小さな確認用シーンを使います。
2. 次の2ファイルを`Assets/Shooter/`等へ保存し、コンパイルの完了を待ちます。`ShooterDemo.cs`というファイル名を維持してください。
3. 空のGameObjectを1個作り、Transformを初期値にして`ShooterDemo`をアタッチします。同じデモを複数個置かないようにします。
4. Playして、Gameビューをクリックし、キーボード入力のフォーカスを当てます。
5. 矢印/WASDで移動、Space長押しで射撃、Rで最初からやり直します。

- <a href="/study/samples/shooter/unity/ShooterModel.cs" download>ShooterModel.cs</a>
- <a href="/study/samples/shooter/unity/ShooterDemo.cs" download>ShooterDemo.cs</a>
- <a href="/study/samples/shooter/unity/README.md" download>README.md</a>

URPの2Dテンプレートでは、使用するRendererとSpriteのMaterial等の前提が変わります。この例の起動条件と同一とは扱わず、[UnityのレンダラーとSRP](/graphics/engine/unity-renderer.html)も参照してください。

### 入力の設定

Input Systemが有効な構成では`Keyboard.current`を使い、旧Input Managerが有効な構成では`Input.GetKey`等を使います。コードはコンパイル条件でこれらを分けます。両方が有効ならInput System側を使います。

Player Settingsの**Active Input Handling**、Input Systemパッケージの有無とコードの前提を合わせてください。Input Systemを使う場合の入力更新は**Process Events In Dynamic Update**を前提にしています。Input System側の説明は[公式1.11系の導入手順](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Installation.html)を参照しています。片方のAPIを無条件に呼ぶコードにすると、入力設定が異なるプロジェクトで動かない原因になります。

## Modelの全コード

Modelは位置・弾・敵・HP・スコアを持ちます。UnityのTransformやGameObjectの参照を、ゲームの状態の代わりにはしません。

<<< @/public/samples/shooter/unity/ShooterModel.cs{csharp}

## MonoBehaviourの全コード

Unityの`Update`を入口にして、入力と実時間をModelへ渡します。固定tickをこのクラスで進めるため、同じModelを別の`FixedUpdate`からも重ねて呼ばないようにします。

`OnGUI`はHP・スコア等の表示専用です。1フレームに複数回呼ばれる場合があるため、ここからModelのtickを進めたり、ダメージを与えたりしません。

<<< @/public/samples/shooter/unity/ShooterDemo.cs{csharp}

## 座標と表示の読み方

<figure class="study-figure">
  <img src="/images/shooter/coordinates.svg" alt="左上原点のModel論理座標を、中央原点のUnityワールド座標へ変換する図。yの向きが反転し、100pxが1unitになる。自機の320,650は0,-2.9へ写る。" width="640" height="1094" />
  <figcaption>図の青い点は同じ自機です。画面上の見た目をそろえるため、原点・yの向き・単位をまとめて変えます。</figcaption>
</figure>

Modelの`(0, 0)`は画面左上です。Unity側では画面中心を原点に置き、100pxを1unitとして次の変換を使います。

$$
x_{Unity} = (x_{Model}-320)/100, \qquad
y_{Unity} = (360-y_{Model})/100
$$

例えばModelの自機初期位置`(320, 650)`は、Unityでは`(0, -2.9)`になります。円の直径も同じ比率でスケールします。この関係がずれると、見た目の大きさ・位置とModelの当たり判定が一致しなくなります。

表示用GameObjectの一覧はModelの値を描くためのものです。表示側の`SetActive(false)`でゲームの敵を倒すのではなく、Modelの有効な要素を読み、余った表示枠を無効にします。

## Physics2Dを使う版へ変えるなら

このサンプルはUnityの物理エンジンを使わず、共通Model内で位置と円の衝突を計算します。Rigidbody2Dを後付けしてTransformもModelも位置を変更すると、どちらの結果を採用するかが曖昧になります。

Unityの物理を採用する場合は、物理側へ位置・衝突を任せ、イベントからゲームのルールを更新する設計へ変えます。`FixedUpdate`という名前のメソッドへ移すだけで、今のModelと物理側の状態が自動的に同期するわけではありません。

## 確認範囲

2026-10-30時点で、次を確認しました。

| 確認対象 | 結果 |
| --- | --- |
| 純C# Model | 検証用.NET環境のReleaseビルドと36項目の実行検査が成功 |
| Unity Editorでのコンパイル | 6000.3.27f1の新規Built-Inプロジェクトで、両ファイルを旧Input Manager側の条件で実コンパイルし、Modelの簡易実行検査が成功 |
| API資料 | 6000.0系とInput System 1.11系の公式資料を参照 |
| 画面の描画、実キー入力、Player build | 未確認 |
| 新Input System側のEditor実行 | 未確認 |

Editorの確認はbatchmode / nographicsで行いました。上のコードを目視でプレイしたという意味ではありません。新Input System側もコードを掲載していますが、旧Input Manager側のコンパイル結果で両方を実行確認済みとはしていません。

## 参考資料

- [Unity 6000.0：MonoBehaviour.Update](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Update.html)
- [Unity 6000.0：Time.deltaTime](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Time-deltaTime.html)
- [Input System 1.11：導入・Active Input Handling](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Installation.html)
- [Input System 1.11：キーボード](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Keyboard.html)
