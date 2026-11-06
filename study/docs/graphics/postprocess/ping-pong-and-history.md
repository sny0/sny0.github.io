---
title: 後処理のピンポンバッファとフレーム履歴
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: graphics
  summary: 2枚のテクスチャを交互に使い、横・縦ブラーの中間結果や、TAAの前フレーム履歴を渡す。読み書きの競合、履歴の無効化、GPU完了までの保持を扱う。
  aliases: [ピンポンバッファ, ping-pong buffer, ダブルバッファ, 履歴バッファ, history buffer, temporal history, separable blur, camera cut, UAV]
  verification: MicrosoftのD3D12仕様、AMD FidelityFXのブラーとカメラカット、Unityのカメラ履歴管理の公式資料に照合（2026-11-07）
---

# 後処理のピンポンバッファとフレーム履歴

画面全体を横方向にぼかし、その結果を縦方向にぼかすとき、各パスは直前の画像を読みながら次の画像を作ります。**ピンポンバッファ**では2枚のテクスチャを用意し、パスを進めるたびに読み取り元と書き込み先を入れ替えます。前フレームの結果を使う時間方向の処理でも同じ配置を使えますが、何をいつまで保持するかは変わります。[テクスチャに描いて次のパスで読む](/graphics/postprocess/render-to-texture.html)

<figure class="study-figure">
  <img src="/images/graphics/ping-pong-and-history.svg" alt="上段では1フレーム内で横ブラーがAを読みBへ書き、縦ブラーがBを読みAへ書く。下段ではフレームnが履歴H0を読みH1に更新し、次のフレームがH1を読んでH0に更新する。H1はフレームの境界を越えて保持する。" width="760" height="480" loading="lazy">
  <figcaption>2枚の役割を交互に変える例です。縦ブラーの後にAに残る画像は同じフレームで使い、時間方向の処理で得た履歴は次のフレームに渡します。<a href="/study/images/graphics/ping-pong-and-history.svg" target="_blank" rel="noopener noreferrer">ピンポンと履歴の図を拡大</a></figcaption>
</figure>

## 1フレーム内で中間画像を渡す

横と縦に分けて処理できるガウシアンブラーを例にします。ここではシーンを描いた画像をAに置き、Aの元の内容は横ブラーが最後に使うものとします。ピクセルシェーダーによる2パスを、同じD3D12のDIRECTキューへ順に提出します。[AMDの分離型ガウシアンブラーのサンプル](https://gpuopen.com/manuals/fidelityfx_sdk/samples/blur/) · [D3D12のリソースバリア](/graphics/optimization/d3d12-resource-barriers.html)

| パス | シェーダーが読む画像 | レンダーターゲットへ書く画像 |
| --- | --- | --- |
| 横ブラー | Aのシーン画像 | Bの横ブラー結果 |
| 縦ブラー | Bの横ブラー結果 | Aの完成画像 |

横ブラーの前にAを `PIXEL_SHADER_RESOURCE` にし、Bを `RENDER_TARGET` にします。縦ブラーの前にはBを `RENDER_TARGET` から `PIXEL_SHADER_RESOURCE` へ、Aを逆向きに遷移させます。パスを記録するときは、読み取り用のSRVと書き込み用のRTVも選び直します。たとえばブルーム合成が元のシーン画像を読むなら、その画像は最後まで保持し、ブラー用のAとBを別に用意します。[Microsoftのリソース状態と遷移の解説](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12) · [アタッチメントの読み込みと保存](/graphics/optimization/render-pass-attachments.html)

## 読み取り元と書き込み先が重なる範囲を確認する

D3D12の従来のリソース状態では、同じサブリソースに `RENDER_TARGET` とシェーダー読み取りの状態を同時に指定できません。たとえばmip 0を読みmip 1に書く場合は、SRVの範囲をmip 0に絞り、mip 1だけをRTVで指定し、それぞれの状態を管理します。ブラーのように、出力画素ごとに元の近傍を読む処理では、入力と出力に別の範囲を用意すると、全画素が同じ元画像を参照できます。[Microsoftの読み取りと書き込みの制約](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12#readwrite-resource-state-restrictions) · [テクスチャのサブリソース](/graphics/texture/dds-and-subresources.html)

計算シェーダーで同じUAVを読み書きする方式もあります。たとえば各スレッドが自分の担当する1画素だけを読み書きし、他のスレッドがその画素を参照しない色変換なら、元の場所に結果を書けます。読み取りに使うUAVの形式はデバイスで対応を確認します。近傍を直接読むブラーでは、別スレッドが書き換えた画素を先に読んでしまうことがあります。グループ同期はそのグループ内に限られ、ディスパッチ間のUAVバリアは前後のGPU処理の順序を指定します。処理を同じ場所で行えるかは、各スレッドがどの値を読み、誰がその値を書き換えるかで決まります。[Microsoftの型付きUAVロード](https://learn.microsoft.com/en-us/windows/win32/direct3d11/typed-unordered-access-view-loads) · [HLSLのグループ同期](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/groupmemorybarrierwithgroupsync) · [D3D12のUAVバリア](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/ns-d3d12-d3d12_resource_uav_barrier)

## 次のフレームが読む履歴を作る

TAAのような時間方向の処理では、今フレームの色に加えて、以前の描画を蓄積した**履歴**を読みます。フレームnで履歴H0を読み、モーションベクターを使って現在の画素位置へ再投影し、今フレームの色と合成してH1に書きます。フレームn+1ではH1が読み取り元になり、H0が書き込み先になります。以前のカメラ行列や画像の有効領域など、履歴を解釈するために使う情報も、その履歴を作ったフレームに対応付けます。[TAAの再投影と蓄積](/graphics/postprocess/taa.html) · [Unreal EngineのTSR履歴](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-frequently-asked-questions-for-unreal-engine)

最初のフレームやカメラが急に切り替わったフレームでは、以前の履歴を無効にし、現在のデータから次の履歴を作ります。解像度変更で履歴テクスチャを作り直す場合も、以前の画像を新しい座標で扱う処理がなければ同じ手順を取ります。動的解像度を扱う設計では、履歴のサイズを固定する方法や、前フレームの有効領域に合わせて読み取り位置を調整する方法もあります。[AMD FSR 2のカメラカットとリセット](https://gpuopen.com/manuals/fsr_sdk/techniques/super-resolution-temporal/#camera-jump-cuts) · [Unityのカメラ別履歴と動的解像度](https://docs.unity3d.com/Packages/com.unity.render-pipelines.core@17.0/manual/rthandle-system-using.html)

## 履歴の持ち主とGPU上での寿命を追う

履歴の入れ替えはカメラやビューごとの処理に合わせます。たとえばメインカメラとミニマップを別の頻度で描くなら、それぞれに「最後に作った有効な履歴」を持たせます。スワップチェーンの画像番号や、CPUが記録用メモリを使い回すフレームスロットは、別の対象を指します。[Unityのカメラ別履歴](https://docs.unity3d.com/Packages/com.unity.render-pipelines.core@17.0/manual/rthandle-system-using.html) · [スワップチェーンとVSync](/graphics/optimization/swap-chain-and-vsync.html) · [フレームスロットとフェンス](/graphics/optimization/parallel-command-recording.html)

CPUが次のフレームを記録している間も、GPUは先の履歴を使っていることがあります。固定の2枚を同じキューで順に使う場合は、書き込みから読み取りへ、読み取りから次の書き込みへと、実行順と状態遷移を組みます。別キューなら、以前の書き込みや読み取りが完了する順序も `Signal` と `Wait` でつなぎます。CPUが古い履歴を無効と判断しても、提出済みの処理がそのテクスチャや記述子を使い終えるまでは保持します。リサイズで古いテクスチャを解放するときも、最後のGPU参照の完了をフェンスで確認します。[D3D12のキュー間同期](/graphics/optimization/gpu-queue-synchronization.html) · [GPUリソースの寿命](/graphics/optimization/gpu-resource-lifetime.html)
