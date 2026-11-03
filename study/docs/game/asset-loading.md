---
title: ゲームのアセットロード設計 — 状態・世代・所有権
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  verification: 一次資料照合（2026-11-04）
  summary: アセット要求からbyte取得、展開・検証、GPU転送やエンジン登録、利用可能、解放までを整理する。取消後の所有権、古い完了、依存関係、予算とbackpressureも扱う。
  aliases: [asset loading, アセットロード, streaming, import, cook, Addressables, AssetManager, StreamableHandle, generation, 世代, ownership, backpressure, GPU fence]
---

# ゲームのアセットロード設計 — 状態・世代・所有権

部屋へ入る直前に、床のtexture、敵のmesh、material、音声を用意するとします。「ファイルを読めた」だけでは、敵を描画できるとは限りません。圧縮データの展開、形式の検証、依存assetの準備、GPU転送やエンジンへの登録が残るからです。**ロードを、利用可能になるまでの状態と、その途中の資源を誰が持つかで設計します。**

呼出側にはasset IDと型、必要な時期、優先度、要求の寿命を渡してもらい、取得元や展開形式を隠します。返すものも「bytes」「CPUで解釈済み」「描画に使える」を区別します。ロード中は代替textureを使う、入口で待つ、任意の効果音だけ省略する、といった製品側の動作も決めます。非同期APIを呼ぶこと自体は、この判断を代行しません。

## import・cook・実行時ロードを分ける

|段階|主な仕事|出力の例|
|---|---|---|
|import|制作元データを読み、設定に従ってゲームで扱うデータへ変換する|画像・modelから作った中間データ|
|cook / build|対象platform向けに変換・圧縮・依存収集・packagingする|配布用bundle、platform別texture等|
|runtime load|配布物から必要なものを取得し、実行中の環境へ登録・保持する|実行時のasset handleやresource|

これらの用語・工程はエンジンごとに異なります。Unity 6000.0のasset workflowはsource assetとimported versionを区別し、Unrealのcookはplatform向け形式への変換を説明しています。Editor向けimport APIを、そのまま配布ゲームのloaderとみなすことはできません。[Unity：Asset workflow](https://docs.unity3d.com/6000.0/Documentation/Manual/AssetWorkflow.html)、[Unreal：Cooking Content](https://dev.epicgames.com/documentation/en-us/unreal-engine/cooking-content-in-unreal-engine)

実行時の入力にはasset ID、format version、対象platform、依存一覧、展開後サイズなどを持たせると、古い配布物や組合せ違いを検出しやすくなります。パスだけで同一性を決めると、更新前後の内容や別platformのdataを混ぜるおそれがあります。

## 要求からReadyまでを段階に分ける

<figure class="study-figure">
  <img src="/images/assets/loading-stages.svg" alt="アセットの要求、byte取得、展開と検証、GPU転送またはエンジン登録、利用可能、解放の段階。byte取得完了と実際に利用できる条件を区別する。" width="760" height="1510" />
  <figcaption><strong>Readyは用途側が安全に使える条件を満たした状態。</strong> すべてのassetがGPUを使うわけではありません。<a href="/study/images/assets/loading-stages.svg" target="_blank" rel="noopener noreferrer">ロードの段階を拡大</a></figcaption>
</figure>

byte取得は[同期read](/os/file-read-journey.html)、[非同期I/O](/os/asynchronous-file-io.html)、[メモリマップドファイル](/os/memory-mapped-files.html)などから選びます。小さな起動時設定なら同期処理で足りる場合もあります。mmapは必須経路ではなく、アドレスへ対応付けても全ページの準備やasset登録まで終わるものではありません。アクセス範囲、保存形式、圧縮、待ちが許される場所に合わせます。

取得後はheader、長さ、version、各領域のoffsetと範囲、展開後サイズを検査してから解釈します。宣言サイズを信用した無制限の確保や、範囲外への参照を防ぎます。magic一致だけで安全なdataと認定せず、展開失敗や依存不整合も失敗として扱います。I/O待ちと、展開・変換のCPU作業は別の工程です。

登録段階もassetの種類で異なります。textureなら転送やresourceの利用条件、音声なら再生系への登録などを確認します。CPUがGPU commandを送っただけで転送完了とは言えません。D3D12にはqueue間の待機やfenceで進捗を同期する仕組みがあり、転送用領域をいつ再利用できるかもその契約に従います。CPUが毎回全GPU処理を待つ設計だけが選択肢ではありません。[Microsoft：Multi-engine synchronization](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization)

## 状態と所有物を一緒に定義する

|状態の例|所有するもの・利用条件|
|---|---|
|Requested|要求情報。まだbytesを予約しない設計も可能|
|Reading|I/O要求slotと、その完了まで必要なbuffer|
|CpuReady|検証済みCPU data。用途がGPUならまだ描画不可|
|Registering / Uploading|登録要求、転送用領域、依存handle等|
|Ready|利用側へ渡せるhandleと、その保持責任|
|Released|このownerの保持を終了。物理解放時刻とは別|
|Failed / Cancelled|失敗/取消理由。未完了の所有物が残る場合もある|

「状態がCancelledだから全資源0」という不変条件にはしません。まだ動作中の要求を消すと、完了通知が参照する情報やI/O先のbufferを先に破棄してしまいます。実装では状態だけでなく、pending数、CPU保持bytes、登録中token、利用側の参照数も追跡します。

複数threadで扱う場合、状態遷移・owner移譲・予算計数を整合する単位で同期します。一つのboolをatomicにするだけでは、複数fieldにまたがる契約は守れません。[スレッド同期](/runtime/thread-synchronization.html)と同様に、共有dataへの全アクセスと、callbackが触れるownerの寿命を設計します。

## 取消しと古い世代の完了

scene Aから出た後にA向けロードが完了する場合があります。同じslotをscene Bへ再利用していたら、古い結果でBの状態を上書きしてはいけません。asset IDに加えて**要求世代token**を持たせ、要求時にcaptureした世代と、完了先の現在世代を照合します。slotの再利用や再試行で世代を進め、カウンタのwrapも扱います。

<figure class="study-figure">
  <img src="/images/assets/completion-and-ownership.svg" alt="進行中要求を取り消しても旧slotの所有が残る。新世代は予算待ちし、旧read完了を回収して破棄、旧登録成功なら返却tokenも解放してから先へ進む。" width="760" height="1510" />
  <figcaption><strong>進行中の要求は、取消し後も所有が残る。</strong> 未開始のRequestedやCPU処理完了後のdataを即回収できる場合とは区別します。<a href="/study/images/assets/completion-and-ownership.svg" target="_blank" rel="noopener noreferrer">世代と所有権を拡大</a></figcaption>
</figure>

一致しない完了は利用側へ公開しませんが、結果が持つbufferや登録済みhandleの回収は必要です。「通知を無視する」と「所有物を解放する」は別です。また世代番号が正しくても、callback先のobjectが既に破棄されていれば安全にはなりません。ownerを完了まで保持する、寿命を検査できる参照を渡す、owner破棄前に完了をdrainするなどの方針も必要です。

Windowsの`CancelIoEx`は取消完了を待たず、通常完了・取消完了・別の失敗のいずれにもなり得ます。.NETの`ReadAsync`もawaitで結果や取消例外を受け取るまでbufferの寿命を守ります。tokenへ取消要求を出しただけで、以後のcallbackや転送が消滅したことにはしません。[Microsoft：CancelIoEx](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex)、[FileStream.ReadAsync](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.readasync?view=net-10.0)

## 失敗と解放も通常の経路にする

失敗には、取得元がない、read途中の失敗、形式不一致、展開失敗、依存の失敗、登録失敗などがあります。どの段階で失敗し、何を既に所有したかを残します。短いreadだけで即座に破損と判定せず、必要量の累積やEOFを確かめる点も既存readと同じです。失敗で戻る前に、取得したbuffer・子handle・登録結果の所有を戻します。

利用側には、再試行可能か、代替assetを使うか、必須assetなのでscene遷移を中止するかを判断できる結果を返します。壊れたformatを無制限に再読するループは避け、再試行する場合も回数と受付予算を持たせます。再試行は新しい世代として扱い、以前の完了で新しい失敗理由や状態を上書きさせません。

解放も「描画側の参照を消した瞬間にすべて破棄」とは限りません。既にqueueへ送ったGPU処理がresourceや転送領域を使っている可能性があります。raw graphics APIでは最後の利用完了を追跡し、必要なfence等の条件を満たしてから再利用・破棄します。エンジンhandleの場合は、そのAPIの参照・遅延解放の契約に従います。[Microsoft：queueとfenceの同期](https://learn.microsoft.com/en-us/windows/win32/direct3d12/user-mode-heap-synchronization)

## 依存・予算・backpressure

敵prefabがmeshとmaterialを、materialがtextureを必要とするなら、ロードは依存graphになります。必須依存のReadyを待つのか、代替assetを許すのかを決めます。循環依存や失敗時の伝播、途中まで成功した子assetの解放も扱います。共有textureを複数の敵が使う場合、片方の取消しで共有jobやtextureを止めないよう、利用者の要求と共有ロードの所有を分けます。

予算は件数だけでなくbytesでも制限します。圧縮ファイル10MBがCPUで100MBへ展開され、さらに転送用領域やGPU resourceを一時的に同時保持する場合、単純な「read完了でbufferを捨てる」計算ではpeakを見誤ります。I/O要求数、圧縮/展開buffer、登録待ち、GPU常駐量、1frameで処理する登録時間などを別々に計数します。

下流が詰まったら上流の受付・展開を抑えるのがbackpressureです。無制限に「後で登録するdata」を積まないよう、予算を予約してから進め、取消しで回収可能になった分だけ返します。待機queue自体も上限を設け、優先度、期限、同一asset要求の集約、不要要求の削除を決めます。重要assetの飢餓や、低優先度jobが大きな予算を占有する状況にも注意します。

進捗率だけでなく、各段階の待ち時間・処理時間、保持bytes、同時要求数、失敗理由、古い完了の破棄数を記録すると詰まりの場所を探せます。API呼出数からSSDの物理I/O回数や性能を推定せず、必要な層を別途測定します。

## エンジンhandleへ接続するとき

Unity Addressables 1.21.21の説明では、`LoadAssetAsync`の戻り値はassetそのものではなくoperation handleで、完了後に`Status`を確認します。利用中は保持責任を持ち、成功/失敗の経路と最終解放を対応付けます。`Release`は参照を減らしてhandleを無効化しますが、bundle等の寿命も関係し、即座に全メモリが返るとは限りません。[Addressables：operation handles](https://docs.unity3d.com/Packages/com.unity.addressables@1.21/manual/AddressableAssetsAsyncOperationHandle.html)、[Memory management](https://docs.unity3d.com/Packages/com.unity.addressables@1.21/manual/MemoryManagement.html)

Unrealの参照文書はAsset ManagerのPrimary/Secondary Assetやbundle、`LoadPrimaryAsset`と`UnloadPrimaryAsset`を区別します。`FStreamableHandle::ReleaseHandle`には、完了delegate前なら解放を完了後まで遅延する契約もあります。Unityのhandle解放手順をそのまま移植せず、利用APIとownerの対応を確認します。[Unreal：Asset Management](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine)、[ReleaseHandle](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/FStreamableHandle/ReleaseHandle)

完了callbackを使えば任意threadでエンジン登録してよい、とはしません。Unity 6000.0の説明では多くのUnity APIにmain thread条件があります。使用するAPI・版・継続contextを確認し、必要なら登録を適切なthreadへ渡します。確認したUnrealページはUE5.8表示で、ここではUnity/Unrealの実機接続を検証していません。[Unity 6000.0：Awaitable continuations](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/optimization/async-await-support/async-awaitable-continuations)

## 小さなモデルから実装へ進める

[C++ / C#の寿命モデル](/practice/assets/asset-lifecycle-model.html)は、単一asset・single-threadでeventを注入し、長さ/magic検査、Ready前の使用拒否、世代違い、取消後の所有維持、重複解放拒否を検証します。待機1件・pending slot1件・論理staging予算8bytesなので、旧完了を回収してから次世代が進みます。新Ready後に旧完了が来る並列順序そのものは実演しません。

`MockSink`の整数tokenはモデル用で、実ファイル・worker・展開・GPU転送・エンジン登録はありません。8bytesというカウンタも実RSSやmanaged heap、GPUメモリの測定値ではありません。実I/Oは既存の[sync](/practice/io/file-read-observation.html)・[async](/practice/io/async-file-read-observation.html)サンプルへ分け、実GPUやエンジン接続はAPIの寿命・thread・利用可能条件に従って追加します。完成したAssetManagerとして使うものではありません。

shutdownも通常のRelease一回では終わりません。新規要求の受付を止め、未完了をcancel/drainして結果を回収し、利用側の保持と転送中資源を解放してからownerを破棄します。このモデルのdestructorやGCが、実I/Oの取消しやGPUの完了待ちを代行することはありません。
