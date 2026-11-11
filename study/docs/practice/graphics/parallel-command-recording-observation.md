---
title: C++でD3D12のコマンドを別スレッドで記録する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: graphics
  collection: parallel-command-recording-observation
  order: 1
  summary: 2つのスレッドが別々のコマンドリストを記録する。閉じた順と依存関係に沿った提出順を変え、WARPで読み戻した16バイトを照合する。
  aliases: [D3D12, WARP, command allocator, command list, ExecuteCommandLists, ResourceBarrier, フェンス]
  verification: Windows x64のMSVCでビルドし、WARPで10回実行。B→Aの記録完了、A→Bの提出、読み戻した全16バイトの一致を確認（2026-11-06）
---

# C++でD3D12のコマンドを別スレッドで記録する

二つのCPUスレッドは別々のアロケーターとコマンドリストを使います。Aは16バイトを中間バッファへ書くコピーを、Bは中間バッファの状態を変えて読み戻すコピーを記録します。Bの記録を先に終えるよう調整し、提出では書き込みのAを先に渡します。[D3D12の並列コマンド記録](/graphics/optimization/parallel-command-recording.html) · [D3D12のリソースバリア](/graphics/optimization/d3d12-resource-barriers.html)

## 手元で動かす {#run-locally}

<a href="/study/samples/graphics/parallel-command-recording-observation/parallel_recording.cpp" download>parallel_recording.cpp</a>を空の作業フォルダーに保存します。Windows 10／11でVisual StudioのC++ツールとWindows SDKを使い、**x64 Native Tools Command Prompt**から実行します。D3D12のコマンドはWARPというソフトウェアアダプターで動かします。[MicrosoftのC++コマンドラインツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170) · [MicrosoftのWARP解説](https://learn.microsoft.com/en-us/windows/win32/direct3darticles/directx-warp)

```bat
cl /nologo /std:c++20 /EHsc /W4 /WX parallel_recording.cpp d3d12.lib dxgi.lib
parallel_recording.exe
```

```text
CPU recording finished: B -> A
Submitted to one DIRECT queue: A -> B
Fence 1 reached; all 16 readback bytes match
```

## 記録、提出、読み戻しの順を追う

| 段階 | Aがすること | Bがすること |
| --- | --- | --- |
| CPUで記録する | `UPLOAD`から`DEFAULT`へコピーする命令を記録し、Bがリストを閉じてから自分も閉じる。 | `DEFAULT`を`COPY_DEST`から`COPY_SOURCE`へ遷移させ、`READBACK`へコピーする命令を記録して閉じる。 |
| キューへ提出する | `ExecuteCommandLists`の配列の1番目に置く。 | 同じ配列の2番目に置く。書き込みから読み取りへの依存関係はBのバリアで表す。 |

`std::latch`は、Bの`Close`がAより先に返るようにするCPU側の仕掛けです。`join`で二つの記録スレッドの終了を確認してから、メインスレッドが依存順にリストを並べます。提出は一つの`DIRECT`キューへの一回の呼び出しです。AとBの間に必要な順序は、Bの遷移バリアが表します。[Microsoftのリスト提出仕様](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12commandqueue-executecommandlists) · [Microsoftのリソースバリア](https://learn.microsoft.com/en-us/windows/win32/direct3d12/using-resource-barriers-to-synchronize-resource-states-in-direct3d-12)

提出後、メインスレッドは同じキューへフェンス値`1`の通知を積みます。値の到達を待ってから読み戻しバッファを開き、16バイトを元のデータと照合します。

この実践では、記録と提出の順番、バッファの状態、読み戻したデータを確認します。アロケーターをフレームごとに再利用する条件や、別のキューに仕事を分けるときの同期は、それぞれの解説で追えます。[アロケーターとフレームスロット](/graphics/optimization/parallel-command-recording.html) · [D3D12のキュー間同期](/graphics/optimization/gpu-queue-synchronization.html)

## ソース

<<< @/public/samples/graphics/parallel-command-recording-observation/parallel_recording.cpp{cpp}
