---
title: OSの役割 — アプリとハードウェアをつなぐ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: ゲームとブラウザーを同時に動かす場面から、OSがCPU時間、メモリ、ファイル、機器を管理する仕事を説明する。カーネル、プロセス、スレッドの意味もつなげる。
  aliases: [OS, operating system, オペレーティングシステム, 基本ソフトウェア, カーネル, プロセス, スレッド, ドライバー, マルチタスク]
  verification: Microsoftのプロセス・メモリ・ユーザーモードとカーネルモード・ドライバーの資料に照合（2026-11-07）
---

# OSの役割 — アプリとハードウェアをつなぐ

OS（Operating System）は、アプリがCPU、メモリ、ファイル、機器を使うための共通の仕組みを提供するソフトウェアです。Windows、macOS、Linuxなどがあります。ゲームとブラウザーを一緒に開くときも、OSはそれぞれのプログラムを動かし、必要な資源を管理します。ここではWindowsを主な例にします。[MicrosoftのWindowsアーキテクチャー](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/windows-kernel-mode-process-and-thread-manager) · [コンピュータの部品と役割](/hardware/computer-components.html)

## アプリがする仕事と、OSが受け持つ仕事

ゲームはキャラクターの位置やルールを決めます。OSはその処理を実行させ、メモリやファイルなどを使うための機能を提供します。アプリがOSの機能を呼ぶための窓口を**API**と呼びます。例えばWindowsの`ReadFile`は、開いたファイルからデータを読むAPIです。[MicrosoftのWindows API](https://learn.microsoft.com/en-us/windows/win32/apiindex/windows-api-list) · [ReadFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile)

| OSが受け持つこと | ゲームとブラウザーを動かす場面 |
| --- | --- |
| **CPU時間の割り当て** | 実行できるスレッドから次に動かすものを選び、CPUで処理を進める。 |
| **メモリの管理** | 各アプリが使うアドレス空間と、必要なメモリの対応を管理する。 |
| **ファイルの管理** | 名前やディレクトリからファイルを開き、読み書きする機能を提供する。 |
| **機器とのやり取り** | ドライバーなどを通して、ストレージ、ネットワーク、入力機器を利用する。 |
| **権限の確認** | 利用者やアプリに、そのファイルや資源を操作する権限があるかを調べる。 |

<figure class="study-figure">
  <img src="/images/os/operating-system-basics.svg" alt="ゲームとブラウザーは別のプロセスとして動き、それぞれにメモリのアドレス空間を持つ。OSがCPU時間、メモリ、ファイル、機器を管理し、CPU・RAM・SSD・NICなどのハードウェアを利用する。" width="760" height="460" loading="lazy">
  <figcaption>役割の概念図です。アプリの処理もOSの処理も、実際にはCPUが命令を実行して進みます。<a href="/study/images/os/operating-system-basics.svg" target="_blank" rel="noopener noreferrer">OSの役割の図を拡大</a></figcaption>
</figure>

## プログラム、プロセス、スレッド

**プログラム**は実行する命令やデータです。保存された`game.exe`を起動すると、Windowsは実行に必要な資源をまとめた**プロセス**を作ります。同じEXEを二回起動すれば、通常は別々のプロセスになります。[Microsoftのプロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

**スレッド**は、プロセスの中で命令の実行を進め、OSが実行先を割り当てる単位です。一つのプロセスには少なくとも一つのスレッドがあり、追加もできます。同じプロセスのスレッドは、そのプロセスのメモリや開いた資源を共有します。[Microsoftのプロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

CPUの実行先より多くのスレッドがあっても、OSは実行するものを切り替えて処理を進められます。複数のコアがあれば、複数のスレッドを同時に実行することもできます。入力やファイルの完了を待っているスレッドは、再び実行できる状態になるまで待機します。[Microsoftのマルチタスク](https://learn.microsoft.com/en-us/windows/win32/procthread/multitasking) · [スレッドスケジューリング](/os/thread-scheduling.html)

## カーネルとユーザーモード

OSの中心で、資源の管理などを担当する部分を**カーネル**と呼びます。Windowsの通常のアプリは**ユーザーモード**で動き、OSの中核部分は**カーネルモード**で動きます。カーネルモードには、アプリから直接使えないメモリなどへアクセスする権限があります。[Microsoftのユーザーモードとカーネルモード](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode)

各プロセスには、自分が使う**仮想アドレス空間**があります。例えばゲームとブラウザーで同じ数値のアドレスを使っても、同じデータを指すとは限りません。共有メモリなどを明示的に使う場合には、別プロセス間でデータを共有できます。[Microsoftの仮想アドレス空間](https://learn.microsoft.com/en-us/windows/win32/memory/virtual-address-space) · [仮想メモリ](/os/virtual-memory.html)

アプリがファイルの操作などを依頼するとき、OSの保護された処理へ移る入口を使います。この仕組みが**システムコール**です。ライブラリの関数が呼ばれるたびに必ず一回のシステムコールが起きるかは、その関数の実装や扱うデータによって変わります。[システムコールと権限](/os/system-calls-and-privilege.html)

## ドライバーと機器

**ドライバー**は、OSと機器の間で、機器に応じた操作や結果の受け渡しを担当するソフトウェアです。Windowsではカーネルモードで動くドライバーも、ユーザーモードで動くドライバーもあります。例えばNICの受信では、ドライバーがデータを回収してOSの通信処理へ渡します。[Microsoftのドライバー](https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/what-is-a-driver-) · [NICの受信経路](/hardware/io/nic-receive-queues.html)

## ゲームの起動から見る

1. OSがプロセスと最初のスレッドを用意する。
2. 必要なプログラムやデータを使えるようにして、CPUで命令を実行する。
3. ゲームがファイル、入力、描画、通信などの機能を利用する。
4. 終了時に、開いた資源やメモリを解放する。

詳しい起動処理は[実行ファイルを起動してmainへ到達するまで](/os/process-startup.html)、ファイルの基本は[ファイルとパス](/os/files-and-paths.html)へ進めます。コマンドからアプリを起動する操作は[ターミナル・シェル・コマンド](/tools/terminal-shell-and-commands.html)で扱います。
