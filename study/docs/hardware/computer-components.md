---
title: コンピュータの部品と役割 — ゲームが動くまで
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: CPU、RAM、SSD、GPU、入出力機器の役割を、ゲームを起動して操作する流れから説明する。OSとドライバー、保存と実行中の状態も結び付ける。
  aliases: [コンピュータ, ハードウェア, CPU, RAM, メインメモリ, SSD, ストレージ, GPU, OS, ドライバー, 入出力]
  verification: Microsoftのプロセス・ファイルキャッシュ・Direct3D資料とIntelのCPU資料に照合（2026-11-07）
---

# コンピュータの部品と役割 — ゲームが動くまで

ゲームを起動すると、保存されていたプログラムを実行し、キャラクターの状態を更新して画面に画像を表示します。一般的なPCを例に、どの部品が計算し、どの部品がデータを保持し、どの部品が外部とやり取りするかを確認します。

## まず五つの役割を知る

| 名前 | 担当すること | ゲームでの例 |
| --- | --- | --- |
| **CPU** | プログラムの命令を実行し、値の計算や条件の判断を進める。 | 入力に応じてプレイヤーの位置を更新する。 |
| **RAM・メインメモリ** | 実行中に使う命令やデータを置く。通常のRAMは電源を失うと内容を保持できない。 | 現在の位置、読み込んだステージ、作業中のデータを置く。 |
| **SSDなどのストレージ** | 電源を切った後も残すファイルを保存する。 | ゲーム本体、画像、音、セーブデータを保存する。 |
| **GPU** | 多数のデータに対する計算や画像の生成を進める。 | 頂点の変換や画面上の色の計算を行う。 |
| **入出力機器** | コンピュータと外側の間で情報を渡す。 | キーボードから入力し、ディスプレイへ表示し、NICで通信する。 |

CPUが実行する命令列を**プログラム**と呼びます。画像や位置など、命令が読み書きする値が**データ**です。プログラム自体も、保存や転送をするときにはバイトの列として扱えます。[CPUの命令実行](/hardware/cpu/instruction-execution.html) · [Microsoftのプロセスの構成](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

<figure class="study-figure">
  <img src="/images/hardware/computer-components.svg" alt="ゲームの実行では、OSとドライバーが部品の利用を支える。SSDに保存された必要部分をRAMへ読み、CPUが命令を実行する。描画データとコマンドを使ってGPUが画像を生成し、ディスプレイへ表示する。" width="760" height="470" loading="lazy">
  <figcaption>ゲーム起動と表示に関わる部品の概念図です。矢印は主な役割のつながりを示します。<a href="/study/images/hardware/computer-components.svg" target="_blank" rel="noopener noreferrer">部品と役割の図を拡大</a></figcaption>
</figure>

## 起動すると、保存したファイルから実行中の状態が生まれる

1. **ゲームの起動を要求する。** Windowsなどの**OS（基本ソフトウェア）**が、プログラムを動かすための**プロセス**を作ります。プロセスは、使用するメモリ空間や開いたファイルなどの資源をまとめた実行の単位です。
2. **必要な命令とデータを使える状態にする。** OSは実行ファイルや関連ファイルを扱い、ゲームが必要なメモリを利用できるようにします。起動時に全ファイルを一度に読む方式もあれば、必要になった部分を後で読む方式もあります。
3. **CPUが処理を進める。** OSが実行の順番を割り当てる**スレッド**に沿って、CPUが命令を実行します。ゲームは入力を調べ、位置などのデータを更新します。
4. **GPUで画像を作る。** ゲームが描画に必要なデータとコマンドを用意し、グラフィックスAPIを通じてGPUに仕事を渡します。生成した画像は表示に使われます。[Microsoftのプロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads) · [MicrosoftのDirect3D 11の描画機能](https://learn.microsoft.com/en-us/windows/win32/direct3d11/atoc-dx-graphics-direct3d-11) · [起動の詳細](/os/process-startup.html)

RAMに読み込んだデータをCPUが使うときは、CPUの近くにある**キャッシュ**も働きます。また、同じファイルを再び読む際、OSがRAMに残していた内容を利用できることがあります。ゲームの「ロード」は、ストレージからの読み取りに加え、圧縮データの展開や、GPUで使える形への準備も含みます。[RAM・キャッシュ・ストレージ](/hardware/memory/ram-cache-and-storage.html) · [Microsoftのファイルキャッシュ](https://learn.microsoft.com/en-us/windows/win32/fileio/file-caching) · [アセットの読み込み](/game/asset-loading.html)

## OSとドライバーは何をするか

OSは、複数のアプリがCPU、メモリ、ファイルなどを使うための仕組みを提供します。例えば、ゲームとブラウザーを同時に開いているとき、OSはそれぞれのスレッドを実行させ、各プロセスのメモリを管理します。[Microsoftのプロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

**ドライバー**は、OSと機器の間で、機器に応じた操作や結果の受け渡しを担当するソフトウェアです。ゲームがファイルを読むときや描画を依頼するときには、OSやドライバーの仕組みを通じて実際の機器を利用します。例えばNICのドライバーは、受信したデータをOS側へ渡せるように処理します。[Microsoftのドライバーの説明](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/what-is-a-driver-) · [NICの受信経路](/hardware/io/nic-receive-queues.html)

## 保存と、実行中に変わる値

ゲームの中でキャラクターを移動すると、実行中の位置の値が変わります。その状態を次の起動でも使いたいなら、ゲームは必要な情報を**セーブファイル**などへ書き出します。実行中のデータを変更しただけで、すべての変更が自動的にセーブされるわけではありません。[ファイルを読むと内部で何が起きるか](/os/file-read-journey.html)

| 操作 | 変わるもの |
| --- | --- |
| ゲームをインストールする | ストレージ上にゲームのファイルが置かれる。 |
| ゲームを起動する | プロセスが作られ、実行中の状態が用意される。 |
| キャラクターを移動する | 実行中の位置などが更新される。 |
| セーブする | 次回使いたい状態が保存先へ書き出される。 |

## 同じ役割でも、物理的な形は変わる

CPU、GPU、メモリなどは、必ず一つずつ独立した基板に載っているわけではありません。CPUとGPUを同じパッケージに備える構成や、GPUがメインメモリを共有する構成もあります。部品の役割を追い、その後に実際の接続や共有の仕方を調べると、PCとゲーム機、スマートフォンの構成も比較できます。[GPUとは何か](/hardware/gpu/what-is-gpu.html) · [MicrosoftのUMAと専用メモリを持つ構成](https://learn.microsoft.com/en-us/windows/win32/direct3d12/memory-management-strategies)

CPUが個々の命令をどう進めるかは[CPUの命令実行](/hardware/cpu/instruction-execution.html)、RAMとSSDを使い分ける理由は[RAM・キャッシュ・ストレージ](/hardware/memory/ram-cache-and-storage.html)で詳しく扱います。
