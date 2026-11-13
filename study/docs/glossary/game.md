---
{
  "title": "ゲーム開発・エンジン・現場の言い回しの用語集",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": true,
    "section": "reference",
    "format": "glossary",
    "domain": "terms",
    "summary": "ゲーム開発・エンジン・現場の言い回しで使う語の定義、用例、関連する解説記事。"
  }
}
---

# ゲーム開発・エンジン・現場の言い回しの用語集

[用語集の入口・全用語検索](/glossary/)

読み順で 53 項目を掲載しています。

## アセット {#asset}

**asset** ／ 読み あせっと

ゲーム制作や実行に使う素材・データ。画像、モデル、音声、シーンや材質の設定などが含まれる。

**例**　足音のアセットを差し替える。

**関連**　[実行時のアセットロード](/game/asset-loading.html) · [インポート](/glossary/game.html#import) · [ロード](/glossary/game.html#load)

**出典**　[Unity 6.3 — Introduction to assets](https://docs.unity3d.com/6000.3/Documentation/Manual/AssetWorkflow.html)

## α版・β版 {#alpha-beta}

**alpha / beta** ／ 読み あるふぁばん べーたばん あるふぁべーた

正式版より前のビルドや開発段階の呼び名。主要機能を入れて通して遊べる段階をα版とし、内容がそろい、不具合修正やバランス調整に集中する段階をβ版とする例がある。

**この分野での意味**　機能やコンテンツの到達条件とテスト参加者の範囲は、プロジェクトごとに決める。β版にも限定公開と一般公開がある。

**例**　β版を配って実機での問題を集める。

**関連**　[フィーチャーフリーズ](/glossary/game.html#feature-freeze) · [ビルド番号](/glossary/game.html#build-number)

**出典**　[Ubisoft — Creative Process（Alpha・Betaの到達条件の例）](https://www.ubisoft.com/en-us/company/how-we-make-games/creative-process)

## アンロード {#unload}

**unload / unloading** ／ 読み あんろーど

シーンやアセットの利用を終了し、使用中の参照を外して資源を解放できる状態にすること。

**この分野での意味**　他の利用者が同じ資源を参照している場合は、メモリに残ることがある。

**例**　ダンジョンを出たらその区画をアンロードする。

**関連**　[実行時のアセットロード](/game/asset-loading.html) · [ロード](/glossary/game.html#load) · [ストリーミング](/glossary/game.html#streaming)

**出典**　[Epic Games — Level Streaming Overview（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/level-streaming-overview-in-unreal-engine?lang=en-US)

## インポート {#import}

**import** ／ 読み いんぽーと

外部で作ったファイルを制作環境へ取り込み、その環境で使えるデータに変換すること。

**この分野での意味**　実行中に使うためのロードとは工程が異なる。

**例**　FBXをインポートしてスケールを確認する。

**関連**　[ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html) · [クック](/glossary/game.html#cook) · [ロード](/glossary/game.html#load)

**出典**　[Unity 6.3 — Introduction to assets](https://docs.unity3d.com/6000.3/Documentation/Manual/AssetWorkflow.html)

## ガベコレ {#gc}

**GC / Garbage Collection** ／ 読み がべこれ がべーじこれくしょん じーしー

プログラムから到達できなくなったオブジェクトのメモリを回収する仕組み。

**例**　一時オブジェクトの割り当てを減らしてガベコレの頻度を下げる。

**関連**　[C++とC#のメモリ管理](/languages/csharp/memory-management-vs-gc.html) · [GCスパイク](/glossary/game.html#gc-spike)

**出典**　[Unity 6.3 — Garbage collection modes](https://docs.unity3d.com/6000.3/Documentation/Manual/performance-incremental-garbage-collection.html)

## QA {#qa}

**QA / Quality Assurance** ／ 読み きゅーえー ひんしつほしょう

品質を確保するための活動。ゲーム開発の会話では、テスト計画、再現、修正確認などを行うチームや担当を指すこともある。

**例**　QAが古いセーブを使って修正を確認する。

**関連**　[自動テストの基礎](/tools/automated-testing.html) · [リグレッション](/glossary/game.html#regression) · [ロットチェック](/glossary/game.html#lot-check)

**出典**　[ISTQB — Certified Tester Foundation Level Syllabus 4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf) · [任天堂 — ゲームソフト適合性検査とロットチェック](https://www.nintendo.co.jp/jobs/keyword/154.html)

## クック {#cook}

**cook / cooking** ／ 読み くっく

Unreal Engine 5.8で、エディター用のアセットを対象プラットフォームの実行時に使える形式へ変換する工程。

**この分野での意味**　Houdiniではノードの評価を指す。

**例**　対象のゲーム機向けにテクスチャをクックする。

**関連**　[ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html) · [クック（Houdini）](/glossary/game.html#houdini-cook) · [パッケージング](/glossary/game.html#packaging)

**出典**　[Epic Games — Packaging Your Project（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/packaging-your-project)

## クック（Houdini） {#houdini-cook}

**cook / cooking** ／ 読み くっく ふーでぃに

Houdini 22.0で、依存するノードを評価し、入力や現在のフレームに対応する出力を作ること。

**この分野での意味**　UEでのクックは、対象機種に合わせたアセット変換。

**例**　パラメーターを変えるとノードが再クックされる。

**関連**　[クック](/glossary/game.html#cook)

**出典**　[SideFX — Cooking（Houdini 22.0）](https://www.sidefx.com/docs/houdini/basics/cooking.html)

## ゲームフィール・手触り {#game-feel}

**game feel** ／ 読み げーむふぃーる てざわり

操作に対して返る動きや映像・音などを通じてプレイヤーが感じる操作感。

**例**　停止時の減速を調整して手触りを確かめる。

**関連**　[カメラシステム](/game/camera-system.html) · [ヒットストップ](/glossary/game.html#hit-stop) · [コアループ](/glossary/game.html#core-loop)

**出典**　[Steve Swink — Game Feel: The Secret Ingredient](https://www.gamedeveloper.com/game-platforms/feature-game-feel---the-secret-ingredient-)

## ゲームループ {#game-loop}

**game loop** ／ 読み げーむるーぷ

入力の取り込み、状態更新、描画などを実行中に繰り返す処理の構造。

**例**　ゲームループで入力を取り込み、固定tickで状態を進める。

**関連**　[ゲームループと時間](/game/basics/game-loop-and-time.html) · [コアループ](/glossary/game.html#core-loop) · [フレーム](/glossary/game.html#frame) · [ティック](/glossary/game.html#tick)

**出典**　[Unity 6.3 — Event function execution order](https://docs.unity3d.com/6000.3/Documentation/Manual/execution-order.html)

## コアループ {#core-loop}

**core loop / core gameplay loop** ／ 読み こあるーぷ

プレイヤーが繰り返す中心的な行動と、その結果から次の行動へ戻る流れ。

**この分野での意味**　フレームごとに回るプログラムのゲームループとは、繰り返す主体が異なる。

**例**　探索し、素材を集め、装備を作ってまた探索へ出る。

**関連**　[シューティングゲームの設計](/game/shooter-design.html) · [ゲームフィール・手触り](/glossary/game.html#game-feel) · [ゲームループ](/glossary/game.html#game-loop)

**出典**　[Game Developer — How supporting core loops and early prototyping are key to your game’s success](https://www.gamedeveloper.com/design/how-supporting-core-loops-and-early-prototyping-are-key-to-your-game-s-success)

## コンテンツフリーズ {#content-freeze}

**content freeze** ／ 読み こんてんつふりーず

ステージ、台詞、素材など、ゲーム内容の追加・変更を原則止める期間・区切り。

**この分野での意味**　新機能を止めるフィーチャーフリーズと対象が異なる。

**例**　翻訳検証のため、台詞のコンテンツフリーズを設定する。

**関連**　[ローカライズの設計](/game/localization-design.html) · [フィーチャーフリーズ](/glossary/game.html#feature-freeze)

## GCスパイク {#gc-spike}

**GC spike / Garbage Collection spike** ／ 読み じーしーすぱいく がべこれすぱいく

ガベージコレクションの処理により、フレーム時間などが一時的に増える現象。

**この分野での意味**　割り当て量の表示と、GCそのものにかかった時間は別。

**例**　プロファイラーで長いフレームにGCスパイクがあるか見る。

**関連**　[CPUプロファイリング](/tools/profiling/cpu-profiling.html) · [ガベコレ](/glossary/game.html#gc) · [スパイク](/glossary/game.html#spike)

**出典**　[Unity 6.3 — Garbage collection modes](https://docs.unity3d.com/6000.3/Documentation/Manual/performance-incremental-garbage-collection.html) · [Unity 6.3 — CPU Usage Profiler module](https://docs.unity3d.com/6000.3/Documentation/Manual/ProfilerCPU.html)

## シーン {#scene}

**scene** ／ 読み しーん

Unityで、ある場面のGameObjectの配置や環境を保存する単位。複数のシーンを同時に読み込める。

**例**　タイトル画面と対戦を別シーンにする。

**関連**　[シーン・オブジェクト・コンポーネント](/game/basics/scenes-and-components.html) · [レベル](/glossary/game.html#level) · [ストリーミング](/glossary/game.html#streaming)

**出典**　[Unity 6.3 — Introduction to scenes](https://docs.unity3d.com/6000.3/Documentation/Manual/CreatingScenes.html)

## シェーダー（エンジン内の呼び方） {#shader}

**shader / shader asset** ／ 読み しぇーだー しぇーだ

エンジンの会話で、GPUプログラムや、それをまとめるシェーダー資産を指す語。材質の設定まで含めてこう呼ぶこともある。

**この分野での意味**　UnityではShaderと、そのプロパティー値を持つMaterialを区別する。

**例**　水面のシェーダーを差し替える。

**関連**　[マテリアル・テクスチャ・シェーダー](/graphics/basics/materials-textures-and-shaders.html) · [シェーダー](/glossary/graphics.html#shader)

**出典**　[Unity 6.3 — Materials and shaders](https://docs.unity3d.com/6000.3/Documentation/Manual/Materials.html)

## 処理落ち {#slowdown}

**slowdown** ／ 読み しょりおち

仕事が所定の時間内に終わらず、表示やゲームの進行が遅くなることを指す現場語。

**この分野での意味**　固定tickなどで時間を管理していると、表示のカクつきとゲーム内時間の遅れは別に起きる。

**例**　敵を出しすぎて処理落ちする。

**関連**　[ゲームループと時間](/game/basics/game-loop-and-time.html) · [フレーム落ち](/glossary/game.html#frame-drop)

## ストリーミング {#streaming}

**streaming** ／ 読み すとりーみんぐ

プレイ中の必要性に応じて、世界の一部やテクスチャなどを順次読み込み、不要になった分を解放する方式。

**この分野での意味**　動画の配信を指す場合もある。

**例**　プレイヤーの移動に合わせて地形をストリーミングする。

**関連**　[ワールドストリーミング](/game/world-streaming.html) · [ロード](/glossary/game.html#load) · [アンロード](/glossary/game.html#unload)

**出典**　[Epic Games — Level Streaming Overview（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/level-streaming-overview-in-unreal-engine?lang=en-US)

## スパイク {#spike}

**spike** ／ 読み すぱいく

計測した時間や使用量が、一時的に周囲の値より大きくなること。

**例**　初回のエフェクト再生でCPU時間のスパイクが出る。

**関連**　[CPUプロファイリング](/tools/profiling/cpu-profiling.html) · [ヒッチ](/glossary/game.html#hitch) · [GCスパイク](/glossary/game.html#gc-spike)

**出典**　[Unity 6.3 — CPU Usage Profiler module](https://docs.unity3d.com/6000.3/Documentation/Manual/ProfilerCPU.html)

## スポーン {#spawn}

**spawn** ／ 読み すぽーん

実行中にゲーム内のオブジェクトを生成し、ワールドへ登場させること。

**この分野での意味**　プールから既存の実体を取り出して再登場させる場合にも使う。

**例**　敵を画面外の地点にスポーンする。

**関連**　[プレハブと生成・破棄の基本](/game/basics/prefabs-and-object-lifetimes.html) · [デスポーン](/glossary/game.html#despawn) · [プレハブ](/glossary/game.html#prefab)

**出典**　[Epic Games — Spawning Actors（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/spawning-actors-in-unreal-engine?lang=en-US)

## 世代付きハンドル {#generational-handle}

**generational handle** ／ 読み せだいつきはんどる

スロット番号と世代番号を組み合わせ、同じスロットに入った別の実体を区別する参照用の値。

**例**　敵の古いハンドルは世代が違うため無効になる。

**関連**　[世代付きハンドル](/algorithms/generational-handles.html) · [ハンドル](/glossary/pc.html#handle) · [ハンドル（制作ツール）](/glossary/graphics.html#handle)

**出典**　[Bevy — EntityGeneration](https://docs.rs/bevy/latest/bevy/ecs/entity/struct.EntityGeneration.html)

## チート {#cheat}

**cheat / debug cheat** ／ 読み ちーと

通常のゲームルールを迂回する操作。制作時は、無敵化やステージ移動などの検証用コマンドにも使う。

**この分野での意味**　対戦で許可なく使う不正行為とは、許可された用途が違う。

**例**　再現テスト用のチートで必要なアイテムを付与する。

**関連**　[デバッグメニュー](/glossary/game.html#debug-menu)

**出典**　[Epic Games — UCheatManager（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UCheatManager)

## ツールチェーン {#toolchain}

**toolchain** ／ 読み つーるちぇーん

ソースや素材を成果物にするために、組み合わせて使うツール群。コンパイラ、リンカー、SDKのツール、アセット変換ツールなどが該当する。

**例**　機種ごとに同じ版のツールチェーンをCIで使う。

**関連**　[ライブラリ・API・SDK](/compilers/libraries-apis-and-sdks.html) · [パイプライン（制作）](/glossary/game.html#pipeline) · [ワークフロー](/glossary/game.html#workflow)

**出典**　[Epic Games — Build Operations（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/build-operations-cooking-packaging-deploying-and-running-projects-in-unreal-engine)

## TRC {#trc}

**Technical Requirements Checklist** ／ 読み てぃーあーるしー

PlayStationのソフト提出時に使われてきた、技術要件のチェックリスト。PC向けの品質検査などでも同じ略語を使う例がある。

**この分野での意味**　Xboxの現行文書ではXbox Requirements（XR）、Xbox 360時代の資料ではTechnical Certification Requirements（TCR）と呼ぶ。任天堂ではガイドラインへの適合を確認する工程をロットチェックと呼ぶ。

**例**　コントローラーを抜いたときの挙動をTRCに沿って確認する。

**関連**　[ロットチェック](/glossary/game.html#lot-check)

**出典**　[SCEA・Take-Two — PlayStationライセンス契約 §4.5](https://ir.take2games.com/static-files/1c0445c6-016b-41f7-97bc-03274e8f3fa3) · [Ubisoft・NVIDIA — Watch Dogs 2: PC Adaptation（GDC 2017）](https://developer.download.nvidia.com/assets/gameworks/downloads/regular/GDC17/WD2_Success_Story_with%20_NVIDIA-GDC_2017-Final.pdf#page=10) · [Microsoft — Xbox Requirements（GDK 2610）](https://learn.microsoft.com/en-us/gaming/gdk/docs/store/policies/console/console-certification-requirements-and-tests?view=gdk-2610) · [Microsoft XNA Game Quality — Xbox 360認証の解説](https://www.gamedeveloper.com/business/sponsored-feature-xna-game-quality-the-certification-story) · [任天堂 — ゲームソフト適合性検査とロットチェック](https://www.nintendo.co.jp/jobs/keyword/154.html)

## ティック {#tick}

**tick** ／ 読み てぃっく

シミュレーションやオブジェクトを一回更新する単位。固定tickのゲームでは、描画間隔と別に更新の刻みを決める。

**この分野での意味**　Unreal EngineのActor Tickには、フレームごとや指定間隔で呼ぶ設定がある。

**例**　サーバーは毎秒60ティック進める。

**関連**　[ゲームループと時間](/game/basics/game-loop-and-time.html) · [フレーム](/glossary/game.html#frame)

**出典**　[Epic Games — Actor Ticking（UE 5.8）](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine) · [Unity 6.3 — Event function execution order](https://docs.unity3d.com/6000.3/Documentation/Manual/execution-order.html)

## ディレクター {#director}

**game director** ／ 読み でぃれくたー

ゲームの方向性や体験を決め、各担当の成果をその方向へそろえる役割。

**この分野での意味**　意思決定の範囲や、プロデューサーとの分担はチームによる。

**例**　ディレクターが試作の操作感を確認する。

**関連**　[プランナー](/glossary/game.html#planner) · [ゲームフィール・手触り](/glossary/game.html#game-feel)

**出典**　[任天堂 — 社長が訊く『パンドラの塔』（ディレクターの担当）](https://www.nintendo.co.jp/wii/interview/sx3j/vol1/index.html)

## テクニカルアーティスト {#technical-artist}

**TA / Technical Artist** ／ 読み てくにかるあーてぃすと てぃーえー

アート制作と実装を技術面でつなぐ職種。ツール、シェーダー、リグ、最適化など、担当範囲はチームで変わる。

**例**　TAとモデルのLOD生成手順を調整する。

**関連**　[シェーダー言語の全体像](/graphics/shader/overview.html) · [パイプライン（制作）](/glossary/game.html#pipeline)

**出典**　[Ubisoft — Technical Artistの職務紹介](https://www.ubisoft.com/en-us/company/careers/search/744000110207267-senior-technical-artist-tool-art-pipelines-w-m-nb-)

## デスポーン {#despawn}

**despawn** ／ 読み ですぽーん

オブジェクトをワールドから取り除き、その個体としての活動を終えること。

**この分野での意味**　実体を破棄するか、無効にして再利用するかは実装による。

**例**　画面外へ出た弾をデスポーンしてプールに返す。

**関連**　[オブジェクトプール](/game/patterns/object-pool.html) · [スポーン](/glossary/game.html#spawn)

**出典**　[Epic Games — Actor Lifecycle（UE 5.8）](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle)

## デバッグメニュー {#debug-menu}

**debug menu** ／ 読み でばっぐめにゅー

ステージ移動、状態表示、再現用設定などを操作する、開発・検証向けの画面。

**例**　デバッグメニューからボス戦に直接入る。

**関連**　[開発ツールの基本](/tools/development-tools-basics.html) · [チート](/glossary/game.html#cheat) · [QA](/glossary/game.html#qa)

## パイプライン（制作） {#pipeline}

**asset pipeline / content pipeline** ／ 読み ぱいぷらいん せいさく

制作した素材を検査・変換し、ゲームで使えるデータにして配布へ渡す工程のつながり。

**この分野での意味**　GPUの描画段階を指すパイプラインとは対象が異なる。

**例**　モデルの命名検査をアセットパイプラインへ組み込む。

**関連**　[ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html) · [描画パイプライン](/glossary/graphics.html#pipeline) · [ワークフロー](/glossary/game.html#workflow) · [ツールチェーン](/glossary/game.html#toolchain)

**出典**　[Epic Games — Packaging Your Project（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/packaging-your-project) · [Unity 6.3 — Introduction to assets](https://docs.unity3d.com/6000.3/Documentation/Manual/AssetWorkflow.html)

## バジェット（予算） {#budget}

**budget / frame budget** ／ 読み ばじぇっと よさん

フレーム時間、メモリ、描画や転送などに割り当てる許容量。60 Hzで1表示間隔に使える時間は約16.67 ms。

**この分野での意味**　CPU・GPUが並行する場合、各処理時間を単純に足すだけでは表示間隔を求められない。

**例**　CPUのフレーム予算にロード処理が収まらない。

**関連**　[フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html) · [ホットパス](/glossary/game.html#hot-path) · [フレーム](/glossary/game.html#frame)

**出典**　[Unity 6.3 — CPU Usage Profiler module](https://docs.unity3d.com/6000.3/Documentation/Manual/ProfilerCPU.html)

## パッケージング {#packaging}

**packaging** ／ 読み ぱっけーじんぐ

コードと変換済みデータを実行・配布できる形にまとめる工程。UE 5.8のパッケージング全体にはビルド、クック、ステージ、パッケージなどの段階がある。

**例**　テスト端末に入れるためにパッケージングする。

**関連**　[ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html) · [クック](/glossary/game.html#cook) · [ビルド（成果物）](/glossary/game.html#build)

**出典**　[Epic Games — Packaging Your Project（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/packaging-your-project)

## パッチ（ゲーム更新） {#patch}

**patch / game update** ／ 読み ぱっち

すでに配布したゲームに、修正や新しいデータを適用する更新。更新の配送には差分やファイル単位の置き換えなどを使う。

**例**　進行不能になる不具合をパッチで直す。

**関連**　[ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html) · [パッチ](/glossary/programming.html#patch) · [ビルド（成果物）](/glossary/game.html#build)

**出典**　[Epic Games — Cooking Content and Creating Chunks（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/cooking-content-and-creating-chunks-in-unreal-engine)

## ヒッチ {#hitch}

**hitch / hitching** ／ 読み ひっち

一部のフレームだけ長くかかり、動きや入力への反応が一瞬止まったように見えること。

**この分野での意味**　スパイクはグラフの突出、ヒッチはプレイ中に感じる現象を表すことが多い。

**例**　エリア境界を越えるとヒッチする。

**関連**　[フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html) · [スパイク](/glossary/game.html#spike) · [フレーム落ち](/glossary/game.html#frame-drop)

**出典**　[Epic Games — Stat Commands（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/stat-commands-in-unreal-engine)

## ヒットストップ {#hit-stop}

**hit stop / hitstop** ／ 読み ひっとすとっぷ

攻撃が当たった瞬間に、一部または全体の動きを短く止めて打撃を強調する演出。

**この分野での意味**　全体の時間スケールを変える方法と、対象ごとに止める方法がある。

**例**　重い攻撃だけヒットストップを長くする。

**関連**　[ゲームループと時間](/game/basics/game-loop-and-time.html) · [ゲームフィール・手触り](/glossary/game.html#game-feel) · [ティック](/glossary/game.html#tick)

**出典**　[Unity 6.3 — Time.timeScale](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Time-timeScale.html) · [Evans Bohl — How to Make a Combat System in UE5（UE 5.7の実装例）](https://dev.epicgames.com/community/learning/tutorials/Wv1y/unreal-engine-how-to-make-a-combat-system-in-ue5)

## ビルド（成果物） {#build}

**build / game build** ／ 読み びるど せいかぶつ

ある時点のソースとデータから作られた、試遊・検査・配布に使うゲームの一式。

**この分野での意味**　作る工程を指す「ビルド」と、出来上がった一式を指す「ビルド」がある。

**例**　最新ビルドで不具合を再現する。

**関連**　[ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html) · [ビルド](/glossary/programming.html#build) · [ビルド番号](/glossary/game.html#build-number) · [ROM（ロム）](/glossary/game.html#rom)

**出典**　[Epic Games — Build Operations（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/build-operations-cooking-packaging-deploying-and-running-projects-in-unreal-engine)

## ビルド番号 {#build-number}

**build number** ／ 読み びるどばんごう

実行ファイルやパッケージを作った版を識別する番号。プレイヤー向けのバージョン表記と別に管理できる。

**この分野での意味**　番号の形式・増加条件は配布先や運用で異なる。

**例**　報告にビルド番号を添えて再現した版を特定する。

**関連**　[CIとビルド自動化](/tools/ci-and-build-automation.html) · [ビルド（成果物）](/glossary/game.html#build)

**出典**　[Apple — CFBundleVersion](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleversion)

## フィーチャーフリーズ {#feature-freeze}

**feature freeze** ／ 読み ふぃーちゃーふりーず

新しい機能の追加を原則止め、既存機能の修正や安定化を優先する期間・区切り。

**この分野での意味**　例外や許す修正の範囲はプロジェクトで決める。

**例**　フィーチャーフリーズ後は不具合修正を優先する。

**関連**　[コンテンツフリーズ](/glossary/game.html#content-freeze) · [α版・β版](/glossary/game.html#alpha-beta)

**出典**　[Python Developer’s Guide — Development cycle](https://github.com/python/devguide/blob/main/developer-workflow/development-cycle.rst)

## ブートシーケンス（ゲーム） {#boot-sequence}

**boot sequence / game startup** ／ 読み ぶーとしーけんす きどう

ゲームが起動し、必要なシステムや設定を初期化して、タイトル画面など最初の状態へ進むまでの流れ。

**例**　ブートシーケンスでセーブと初期アセットを読み込む。

**関連**　[ゲームエンジンの役割](/game/basics/game-engine-basics.html) · [ブート](/glossary/pc.html#boot) · [ロード](/glossary/game.html#load)

**出典**　[Unity 6.3 — Event function execution order](https://docs.unity3d.com/6000.3/Documentation/Manual/execution-order.html)

## プランナー {#planner}

**game designer / game planner** ／ 読み ぷらんなー

ルール、ステージ、体験など、遊びの内容を設計し、試作や調整を通じて形にする職種。

**この分野での意味**　英語の職名や担当範囲はチームごとに異なる。

**例**　プランナーと敵の行動の切り替え条件を決める。

**関連**　[シューティングゲームの設計](/game/shooter-design.html) · [ディレクター](/glossary/game.html#director) · [コアループ](/glossary/game.html#core-loop)

**出典**　[任天堂 — 制作企画系の職種紹介](https://www.nintendo.co.jp/jobs/introduction/planning/career.html)

## ブループリント {#blueprint}

**Blueprint** ／ 読み ぶるーぷりんと

Unreal Engineのノードベースのビジュアルスクリプティング機能と、それを使うアセット。Blueprint Classではコンポーネントと振る舞いを持つ再利用可能なクラスを定義できる。

**この分野での意味**　Unityのプレハブは主にオブジェクト構成の再利用に使う。

**例**　扉を開閉するBlueprint Classを作る。

**関連**　[UObject・Actor・Component](/game/unreal/uobject-actor-component.html) · [プレハブ](/glossary/game.html#prefab)

**出典**　[Epic Games — Introduction to Blueprints（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/introduction-to-blueprints-visual-scripting-in-unreal-engine?lang=en-US)

## フレーム {#frame}

**frame** ／ 読み ふれーむ

ゲームループで処理を進める一巡や、描画して表示へ渡す画像の一枚。更新・描画・表示のどれを数えるかで意味が変わる。

**この分野での意味**　固定tickの更新は、1フレームに0回または複数回起きることがある。

**例**　次のフレームで入力を読み取る。

**関連**　[ゲームループと時間](/game/basics/game-loop-and-time.html) · [ティック](/glossary/game.html#tick) · [フレーム（描画）](/glossary/graphics.html#frame)

**出典**　[Unity 6.3 — Event function execution order](https://docs.unity3d.com/6000.3/Documentation/Manual/execution-order.html)

## フレーム落ち {#frame-drop}

**frame drop / dropped frame** ／ 読み ふれーむおち

予定したタイミングに新しい絵を出せず、画像が飛んだり前の画像が表示され続けたりすること。

**この分野での意味**　会話ではFPSが下がること全般にも使う。

**例**　負荷が高い場面でフレーム落ちが起きる。

**関連**　[フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html) · [ヒッチ](/glossary/game.html#hitch) · [処理落ち](/glossary/game.html#slowdown)

**出典**　[Epic Games — Stat Commands（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/stat-commands-in-unreal-engine)

## プレハブ {#prefab}

**prefab** ／ 読み ぷれはぶ

Unityで、GameObjectとそのコンポーネントや子の構成を保存し、複数の場所で使えるようにしたアセット。

**例**　同じ敵のプレハブから3体を生成する。

**関連**　[プレハブと生成・破棄の基本](/game/basics/prefabs-and-object-lifetimes.html) · [ブループリント](/glossary/game.html#blueprint) · [スポーン](/glossary/game.html#spawn)

**出典**　[Unity 6.3 — Prefabs](https://docs.unity3d.com/6000.3/Documentation/Manual/Prefabs.html)

## ホットパス {#hot-path}

**hot path** ／ 読み ほっとぱす

頻繁に通る処理経路や、実行時間の多くを占める経路。プロファイル結果から特定する。

**例**　毎tick通る衝突候補の収集がホットパスだった。

**関連**　[CPUプロファイリング](/tools/profiling/cpu-profiling.html) · [バジェット（予算）](/glossary/game.html#budget)

**出典**　[Unity 6.3 — CPU Usage Profiler module](https://docs.unity3d.com/6000.3/Documentation/Manual/ProfilerCPU.html)

## マスターアップ {#master-up}

**master submission / going gold** ／ 読み ますたーあっぷ

製品版の基準になるビルドを確定し、提出・製造・配信の工程へ渡せる段階に達すること。

**この分野での意味**　和製の現場語。どの段階をそう呼ぶかや、審査の前後関係はプロジェクトによる。

**例**　提出用のビルドを確定してマスターアップした。

**関連**　[ゲームのアセットビルドと差分配信](/game/asset-build-and-patches.html) · [ビルド（成果物）](/glossary/game.html#build) · [ロットチェック](/glossary/game.html#lot-check)

## マップ {#map}

**map** ／ 読み まっぷ

地形や配置を含むプレイ空間。Unreal Engineでは、レベルを保存したマップファイルも指す。

**この分野での意味**　地図UIや、プログラミングの連想コンテナを指す場合もある。

**例**　新しい対戦マップを開く。

**関連**　[ワールドストリーミング](/game/world-streaming.html) · [レベル](/glossary/game.html#level) · [シーン](/glossary/game.html#scene)

**出典**　[Epic Games — Level Streaming Overview（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/level-streaming-overview-in-unreal-engine?lang=en-US)

## 「焼く」・アセットの「焼き」 {#asset-baking}

**asset baking / bake / burn a disc / program a ROM** ／ 読み やく あせっとのやき やき やきこみ べいく

制作時の計算結果や設定を、実行時に読み取れるデータとして書き出すこと。

**この分野での意味**　「ディスクを焼く」は光ディスクにデータを書き込むこと。「ROMを焼く」は書き込み可能なROMにプログラムなどを書き込むことを指す。

**例**　アニメーションを頂点テクスチャに焼く。提出用のディスクを焼く。

**関連**　[頂点シェーダーでの表現](/graphics/shader/vertex-effects.html) · [ベイク（焼き込み）](/glossary/graphics.html#bake) · [クック](/glossary/game.html#cook) · [ROM（ロム）](/glossary/game.html#rom)

**出典**　[SideFX — Labs Vertex Animation Textures 3.0](https://www.sidefx.com/docs/houdini/nodes/out/labs--vertex_animation_textures-3.0.html) · [Apple — CDやDVDに情報を書き込む](https://support.apple.com/en-euro/guide/mac-help/mchl8addfd95/27/mac/27) · [Microchip — EPROM Memory Programming Specifications](https://ww1.microchip.com/downloads/en/DeviceDoc/30274b.pdf)

## リグレッション {#regression}

**regression** ／ 読み りぐれっしょん でぐれ

以前は動作していた機能が、変更後に動かなくなったり悪化したりすること。

**この分野での意味**　現場では「デグレ」とも呼ぶ。性能の悪化にも使う。

**例**　ロードを短縮する修正でセーブ復元にリグレッションが出た。

**関連**　[自動テストの基礎](/tools/automated-testing.html) · [リグレッション](/glossary/programming.html#regression) · [QA](/glossary/game.html#qa)

**出典**　[ISTQB — Certified Tester Foundation Level Syllabus 4.0.1](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)

## レベル {#level}

**level** ／ 読み れべる

ゲームの舞台やステージ。Unreal EngineではActorを配置する単位にも使う。

**この分野での意味**　キャラクターの成長段階を示す「レベル」とは指すものが違う。

**例**　常駐レベルに、街区のストリーミングレベルを重ねる。

**関連**　[ワールドストリーミング](/game/world-streaming.html) · [マップ](/glossary/game.html#map) · [シーン](/glossary/game.html#scene)

**出典**　[Epic Games — Level Streaming Overview（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/level-streaming-overview-in-unreal-engine?lang=en-US)

## ロード {#load}

**load / loading** ／ 読み ろーど

ファイルや配布データを読み、必要な展開・転送・登録を経てゲームから使える状態にすること。

**この分野での意味**　ファイルを読み終わる時刻と、ゲームから使える時刻は異なることがある。

**例**　タイトル画面の裏で次のシーンをロードする。

**関連**　[実行時のアセットロード](/game/asset-loading.html) · [アンロード](/glossary/game.html#unload) · [ストリーミング](/glossary/game.html#streaming)

**出典**　[Epic Games — Level Streaming Overview（UE 5.8）](https://dev.epicgames.com/documentation/unreal-engine/level-streaming-overview-in-unreal-engine?lang=en-US)

## ロットチェック {#lot-check}

**Lot Check / platform compliance testing** ／ 読み ろっとちぇっく

ゲーム機向けソフトが、対象機種で正常に動き、プラットフォームのガイドラインに適合するかを確認する工程。

**この分野での意味**　任天堂が公に用いる工程名。プラットフォームごとに審査名と要件は変わる。

**例**　対応する実機で中断・復帰を確認してロットチェックに備える。

**関連**　[TRC](/glossary/game.html#trc) · [マスターアップ](/glossary/game.html#master-up)

**出典**　[任天堂 — ゲームソフト適合性検査とロットチェック](https://www.nintendo.co.jp/jobs/keyword/154.html)

## ROM（ロム） {#rom}

**ROM / Read-Only Memory** ／ 読み ろむ あーるおーえむ

本来は読み出し専用のメモリ。ゲーム制作の会話では、試遊や検査に使うビルド一式を「ロム」と呼ぶこともある。

**この分野での意味**　「今日のロム」「開発中のロム」のような用法では、媒体の種類より、試遊や検査に使うビルドの版を指す。

**例**　今日のロムを実機で確認する。

**関連**　[ビデオゲーム史](/history/video-games.html) · [ビルド（成果物）](/glossary/game.html#build)

**出典**　[任天堂 — 社長が訊く Wii Street U（制作現場での「ROM」）](https://www.nintendo.co.jp/wiiu/interview/hardware/vol12/index.html) · [カプコン開発者による『プラグマタ』の合同インタビュー（Gamer）](https://www.gamer.ne.jp/news/202512140001/) · [NIST — Read-Only Memory](https://csrc.nist.gov/glossary/term/read_only_memory)

## ワークフロー {#workflow}

**workflow** ／ 読み わーくふろー

作業を完了するまでの手順と受け渡しの流れ。人による確認、判断、差し戻しも含められる。

**例**　レビュー後にテクスチャを差し替えるワークフローを決める。

**関連**　[パイプライン（制作）](/glossary/game.html#pipeline) · [ツールチェーン](/glossary/game.html#toolchain)

**出典**　[Unity 6.3 — Introduction to assets](https://docs.unity3d.com/6000.3/Documentation/Manual/AssetWorkflow.html)
