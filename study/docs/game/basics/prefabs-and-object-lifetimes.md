---
title: プレハブと生成・破棄の基本 — 同じ部品から複数の物を作る
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: Unityのプレハブから敵や弾を作る場面で、ひな形とインスタンス、個別の状態と共有アセット、生成・有効化・無効化・破棄の違いを説明する。
  aliases: [プレハブ, Prefab, インスタンス, instance, Instantiate, 生成, 破棄, Destroy, ライフサイクル, Awake, Start, OnEnable, OnDisable, オブジェクトプール]
  verification: Unity 6.0のプレハブ・Instantiate・イベント関数・SetActive・Destroyの公式資料に照合（2026-11-07）
---

# プレハブと生成・破棄の基本 — 同じ部品から複数の物を作る

同じ見た目と動きを持つ敵を何体も置きたいとします。形、当たり判定、操作するスクリプトなどを、毎回一つずつ設定する代わりに、ひな形から作れます。Unityでは、GameObjectとその部品・設定を再利用するためのアセットを**プレハブ**と呼びます。ここではUnity 6.0のGameObjectを例にします。[Unityのプレハブ](https://docs.unity3d.com/6000.0/Documentation/Manual/Prefabs.html) · [シーンとコンポーネント](/game/basics/scenes-and-components.html)

## ひな形と、実際に動く一体

プレハブアセットをもとに作った実体を**インスタンス**と呼びます。プレハブに敵の部品と初期HPを用意し、シーンに複数のインスタンスを置けます。プレハブから継承する設定と、個々のインスタンスで上書きする設定もあります。[Unityのプレハブインスタンス](https://docs.unity3d.com/6000.0/Documentation/Manual/PrefabInstanceOverrides.html)

| データ | 敵を二体作る例 |
| --- | --- |
| **プレハブアセット** | 部品、初期HP、使う素材などのひな形。 |
| **インスタンスの状態** | 敵Aと敵Bが持つ位置、現在HP、攻撃中かどうか。 |
| **参照するアセット** | 描画用のメッシュやマテリアルなど。複数の敵から同じ素材を参照できる。 |

例えばAがダメージを受けたら、Aの現在HPを70へ更新し、Bの現在HPは100を保つ設計にします。一方、共有するアセットの設定を変えた場合は、同じアセットを使う他の物にも影響し得ます。個々の状態と、参照先のデータをそれぞれ確認します。[Unityのプレハブの考え方](https://docs.unity3d.com/6000.0/Documentation/Manual/Prefabs.html) · [共有マテリアル](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Renderer-sharedMaterial.html)

<figure class="study-figure">
  <img src="/images/game/prefabs-and-object-lifetimes.svg" alt="敵のプレハブから敵Aと敵Bを作り、それぞれが位置とHPを持つ。AのHPは70、Bは100。描画用のメッシュやマテリアルは共有する参照先にできる。有効・無効の切り替えと、インスタンスを破棄する操作を区別する。" width="760" height="470" loading="lazy">
  <figcaption>ひな形、個別に変わる値、複数の物から参照する素材の関係を示します。<a href="/study/images/game/prefabs-and-object-lifetimes.svg" target="_blank" rel="noopener noreferrer">プレハブと状態の図を拡大</a></figcaption>
</figure>

## 実行中に生成する

Unityの`Instantiate`は、指定したオブジェクトを複製し、その参照を返します。プレハブをもとに弾や敵を作り、位置や初期状態を設定する場面で使えます。子のGameObjectやコンポーネントも複製され、生成元の有効状態も引き継がれます。[UnityのInstantiate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.Instantiate.html)

有効な階層に作る場合、初期化用の処理が生成の途中で呼ばれることがあります。例えば`Awake`で参照を準備し、呼び出し元から値を渡す専用の初期化処理を別に設けるなど、どの時点で必要な値がそろうかを決めます。[Instantiateと初期化イベント](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.Instantiate.html)

## 生成後に呼ばれる処理を知る

UnityのMonoBehaviourには、実行の段階に応じたイベント関数があります。次は代表的な役割です。実際に呼ばれる条件は、GameObjectやコンポーネントの有効状態などによって変わります。

| 関数 | 基本の役割 |
| --- | --- |
| **Awake** | インスタンスの初期化時に、参照などを準備する。 |
| **OnEnable** | コンポーネントが有効になり、階層内でも有効なときの処理。 |
| **Start** | 有効なスクリプトで、最初の更新の前に一度行う処理。 |
| **Update** | 有効な状態で、フレームごとの処理を進める。 |
| **OnDisable** | 無効になったときの処理。 |

`Start`は有効化のたびに繰り返される初期化としては使えません。無効から再び有効にするときにも必要な処理は、再有効化の入口へ置きます。初期化と他の物への参照に依存がある場合は、呼び出し順も確認します。[UnityのAwake](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Awake.html) · [Start](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.Start.html) · [有効状態とSetActive](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/GameObject.SetActive.html)

## 無効にすることと、破棄すること

`SetActive(false)`はGameObjectを無効にします。表示や更新など、その有効状態に従う処理が止まっても、インスタンス自体や保持している値は残ります。再び有効にすれば再利用できます。[UnityのSetActive](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/GameObject.SetActive.html)

`Destroy`はインスタンスの破棄を依頼します。Unityは通常、現在のUpdateループが終わってから描画までの間に実際の破棄を行います。GameObjectを破棄すると、そのコンポーネントと子も対象になります。終了時の処理は`OnDestroy`などに書けます。[UnityのDestroy](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.Destroy.html) · [OnDestroy](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.OnDestroy.html)

弾を使い回す**オブジェクトプール**では、弾を無効にして待機させ、次の発射で再び使う構成があります。その場合は位置、速度、残り時間、HPなどを再利用用に初期化し、前の状態を持ち越す項目を決めます。参照や通知の登録も、利用する期間に合わせて扱います。[Object Poolの詳解](/game/patterns/object-pool.html) · [ゲーム内イベントと通知](/game/basics/game-events-and-notifications.html)

## 素材の寿命も追う

同じ素材を複数の物から使う構成では、敵Aの利用が終わっても、敵Bが使い続けることがあります。素材の読み込みと解放を管理する際は、参照している利用者も追います。[アセットロードと所有権](/game/asset-loading.html)

更新のタイミングは[ゲームループと時間](/game/basics/game-loop-and-time.html)へ進みます。
