---
title: Windowsのスレッドスケジューリング — 実行・待機・実行可能
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: os
  summary: Windowsが次に動かすスレッドを選ぶ仕組みを、優先度とタイムスライスから追う。待機が終わってから実行を再開するまでの時間を区別し、WPAで調べる手順を示す。
  aliases: [スレッドスケジューリング, スケジューラ, dispatcher, Ready, Running, Waiting, タイムスライス, quantum, プリエンプション, コンテキストスイッチ, アフィニティ, WPA, CPU Usage Precise, CPU Usage Sampled]
  verification: Microsoft LearnのWindowsスケジューリングとWPAの資料に照合（2026-11-06）
---

# Windowsのスレッドスケジューリング — 実行・待機・実行可能

ゲームのメインスレッドがワーカーの完了を待つとき、ワーカーが完了を通知してから、メインスレッドが実際に動き出すまでにも時間がかかることがあります。Windowsが論理プロセッサーに割り当てるのは、プロセスに属する個々の**スレッド**です。いつ条件待ちが終わり、いつCPUを使えたかを分けると、遅れた区間を特定できます。[プロセスを起動してmainへ到達するまで](/os/process-startup.html) · [Windowsのプロセスとスレッド](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)

## 実行可能になる時刻と、実行を再開する時刻

動作中のスレッドを追うときは、まず次の三つの状態で考えます。実際のWindowsは内部でさらに細かい状態を持ちます。[Windowsのコンテキストスイッチ](https://learn.microsoft.com/en-us/windows/win32/procthread/context-switches) · [WPAのCPU解析ガイド](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/cpu-analysis)

| 状態 | そのスレッドで起きていること |
| --- | --- |
| Running（実行中） | 論理プロセッサーが命令を実行している。 |
| Waiting（待機中） | イベントの通知、ロックの解放、入出力の完了など、待っている条件がまだ満たされていない。 |
| Ready（実行可能） | 命令の実行を続けられる。スケジューラが論理プロセッサーに割り当てるまで待つ。 |

<figure class="study-figure">
  <img src="/images/os/thread-scheduling.svg" alt="単一の論理CPUを使う説明用の例。対象スレッドは0〜2 msに実行し、2〜6 msは完了を待つ。6 msに実行可能になるが他のスレッドがCPUを使用中のため、9 msに実行を再開する。12 msまでの内訳は実行5 ms、条件待ち4 ms、実行可能状態3 ms。" width="760" height="324" loading="lazy">
  <figcaption>条件待ちの終了と、実行再開の時刻を分けて読みます。<a href="/study/images/os/thread-scheduling.svg" target="_blank" rel="noopener noreferrer">タイムラインを拡大</a></figcaption>
</figure>

この例では、対象スレッドが **2 ms** に待機に入り、**6 ms** に待っていた条件が満たされます。ここで `Ready` に移りますが、対象が使える論理CPUは1つで、ほかのスレッドがその枠を使っています。CPUへの割り当てを受け、実行を再開するのは **9 ms** です。時刻は説明用で、図では切り替え処理や割り込みの時間を省いています。

0〜12 msの経過時間を分けると、**CPUで実行した時間は5 ms**（2 msと3 ms）、**条件待ちは4 ms**、**実行可能になってから割り当てを受けるまでの遅れは3 ms**です。条件待ちを短くするには完了を通知する側を追い、`Ready` の時間を短くするには同じCPUを使っていたスレッドや、対象が実行できるCPUの範囲を調べます。実行時間が長い場合は、対象スレッドがどの処理を実行していたかを調べます。[MicrosoftのCPU解析ガイド](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/cpu-analysis)

## 優先度とタイムスライスで次のスレッドを選ぶ

Windowsは、実行可能な候補から優先度の高いスレッドを選びます。スレッドがCPUを使う持ち時間を**タイムスライス**（クォンタム）と呼びます。同じ優先度のスレッドが複数いれば順に実行するのが基本です。持ち時間が尽きたときに同等以上の優先度の候補があれば、ほかのスレッドに切り替わります。より高い優先度のスレッドが実行可能になると、持ち時間の途中でも実行中のスレッドからCPUを取り上げることがあります。これが**プリエンプション**です。実行中のスレッドが自ら待機に入った場合も、別のスレッドにCPUを割り当てられます。[Windowsのスケジューリング優先度](https://learn.microsoft.com/en-us/windows/win32/procthread/scheduling-priorities) · [コンテキストスイッチが発生する条件](https://learn.microsoft.com/en-us/windows/win32/procthread/context-switches)

スレッドを切り替えるときは、直前のスレッドの実行位置やレジスターなどを保存し、次のスレッドの状態を復元します。これをコンテキストスイッチと呼びます。切り替え処理そのものに加え、別の作業でキャッシュが入れ替わり、再開後にキャッシュミスが増える場合もあります。短い仕事を大量に分けて待機と起床を繰り返す場面では、CPU時間や完了までの時間と合わせて切り替え回数を読みます。[Microsoftのコンテキストスイッチ解説](https://learn.microsoft.com/en-us/windows/win32/procthread/context-switches) · [Intelのタイムスライス費用の解説](https://www.intel.com/content/www/us/en/docs/onetbb/developer-guide-api-reference/2022-1/appendix-a-costs-of-time-slicing.html)

同じスレッドがシステムコールでカーネルモードに入り、そのまま処理を続ける経路もあります。モードの切り替えはCPUの権限が変わることを指し、コンテキストスイッチはCPUを使うスレッドが交代することを指します。カーネルでの処理中に待機へ入れば、そのCPUで別のスレッドを実行できます。[システムコールと特権モード](/os/system-calls-and-privilege.html) · [スレッドと同期](/runtime/thread-synchronization.html)

## 複数のCPUがあるときは、割り当ての範囲も見る

複数の論理プロセッサーがあれば、複数のスレッドを並行して実行できます。どの論理プロセッサーで実行できるかを制限する設定が**アフィニティ**です。CPU全体の使用率が低くても、処理の要となるスレッドを実行できる論理CPUが混み合い、`Ready` のまま待つことがあります。また、以前とは別のコアで再開すると、前のコアのキャッシュにあったデータを使いにくくなる場合があります。CPU全体の平均と合わせて、論理CPUごとの使用状況とスレッドの実行場所を読みます。[Microsoftの優先プロセッサーとアフィニティの解説](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/cpu-analysis#priority) · [Intelのスレッド移動の解説](https://www.intel.com/content/www/us/en/docs/vtune-profiler/cookbook/2024-2/os-thread-migration.html)

## WPAで長かった区間を探す

| 表示 | 使うデータ | 調べたいこと |
| --- | --- | --- |
| CPU Usage (Precise) | スレッドの切り替えや実行可能になった時刻のイベント | いつ実行し、何を待ち、再開までにどれだけ遅れたか。 |
| CPU Usage (Sampled) | 実行位置やコールスタックを定期的に採ったサンプル | 実行中にCPU時間を多く使った関数はどれか。 |

Windows Performance Recorder（WPR）で現象が起きた区間を記録し、Windows Performance Analyzer（WPA）で開きます。`CPU Usage (Precise)` で対象のプロセスとスレッドに絞り、`Waits (us)` と `Ready (us)` を比べます。待機が長い場合は、記録されたスタックやスレッドの依存関係から待ちの起点をたどります。実行可能な時間が長い場合は、その間に対象が実行できる論理CPUを誰が使っていたかを見ます。対象自身のCPU時間が長い場合は、同じ時間帯の `CPU Usage (Sampled)` でサンプルが集まった関数を調べます。[WPRとWPAの操作例](https://learn.microsoft.com/en-us/troubleshoot/windows-server/support-tools/support-tools-xperf-wpa-wpr) · [WPAのCPU Usageグラフ](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/cpu-analysis#cpu-usage-precise-graph)

ゲームのカクつきを調べる場合は、フレームが遅れた時刻を先に絞り、その区間のCPU側の状態を照合します。フレームが長かったときも、メインスレッドがCPUで仕事を続けていた場合と、ほかの仕事の完了を待っていた場合では、次に調べる場所が変わります。[フレームタイムとフレームペーシング](/graphics/optimization/frame-pacing.html)
