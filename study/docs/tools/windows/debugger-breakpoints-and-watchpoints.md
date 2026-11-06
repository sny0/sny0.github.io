---
title: ブレークポイントとデータブレークポイント
study:
  source: 新規執筆
  status: published
  summary: ソース行・命令・データのどれを観測するかで停止条件を選ぶ。Windows x64の停止の仕組みと、書き込んだコードを追う手順を扱う。
  section: reference
  format: article
  domain: tools
  aliases: [デバッガ, ブレークポイント, データブレークポイント, ウォッチポイント, breakpoint, watchpoint, INT3, WinDbg, Visual Studio]
  verification: Microsoftの資料とIntelのデバッグ仕様に照合し、MSVCでC++例をビルド・実行して、逆アセンブルで2箇所の書き込みを確認（2026-11-06）
---

# ブレークポイントとデータブレークポイント

スコアがいつの間にか0になるとき、代入箇所を一つずつ探す代わりに、スコアが置かれたメモリへの書き込みで停止できます。処理を始めた時点を調べたいなら、関数の入口で停止します。ブレークポイントは、実行中のプログラムをどんな条件で止めるかを決める機能です。以下はWindows x64のネイティブC++を想定しています。[Microsoftのブレークポイントの使い分け](https://learn.microsoft.com/en-us/visualstudio/debugger/using-breakpoints)

## ソース行と命令のどちらで止めるか

ソース行を指定すると、デバッガはデバッグ情報を使って対応する機械語のアドレスを探します。行に実行命令がなければ、停止できる別の行に移るか、未解決のままになります。インライン化や命令の並べ替えがあるビルドでは、一つのソース行が複数の場所に対応することもあります。対応が分かりにくいときは、逆アセンブル画面で命令アドレスを指定します。[Visual Studioで最適化済みコードをデバッグする](https://learn.microsoft.com/en-us/visualstudio/debugger/how-to-debug-optimized-code) · [WinDbgの命令ブレークポイント](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/bp--bu--bm--set-breakpoint-)

| 止めたい条件 | Windows x64での仕組み | WinDbgの指定例 |
| --- | --- | --- |
| ある命令を実行する | ソフトウェアブレークポイントでは、デバッガがメモリ上の命令先頭を一時的に `INT3`（`0xCC`）へ置き換え、その命令に到達すると例外を受け取る | `bp` でアドレスを指定。`bu` でモジュールの読み込みに応じて名前を解決 |
| ある命令を実行する、またはある範囲のメモリにアクセスする | プロセッサーブレークポイントでは、命令を書き換えず、プロセッサーのデバッグレジスターにアドレスと条件を設定する | `ba e 1` で実行、`ba w 4` で4バイトへの書き込み、`ba r 4` で4バイトへの読み書き |

プロセッサー側の監視には枠があります。x64の監視サイズは1・2・4・8バイトで、`ba` の開始アドレスはそのサイズに合わせて整列させます。実行の監視ではサイズに1を指定します。Visual Studioの公式資料ではx64のデータブレークポイントの上限は4個です。変化を追いたいフィールドのアドレスと幅を指定します。[Microsoftの命令リファレンス](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/x86-instructions) · [Microsoftのプロセッサーブレークポイント](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/processor-breakpoints---ba-breakpoints-) · [WinDbgの `ba`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/ba--break-on-access-) · [Visual Studioの監視上限](https://learn.microsoft.com/en-us/visualstudio/debugger/using-breakpoints#data-breakpoint-hardware-limits)

## 書き換えたコードを止める

<figure class="study-figure">
  <img src="/images/tools/debugger-breakpoints-and-watchpoints.svg" alt="ソース行のブレークポイントでmainの最初の呼び出し前に止め、g_scoreの4バイトにデータブレークポイントを置く。ApplyBonusの書き込み後に値60で止まり、続行するとResetRoundの書き込み後に値0で止まる。各停止でコールスタックから書き込み元を確認する。" width="760" height="306" loading="lazy">
  <figcaption>監視対象は同じ4バイトです。停止する関数は、そのアドレスへ書き込んだコードに応じて変わります。<a href="/study/images/tools/debugger-breakpoints-and-watchpoints.svg" target="_blank" rel="noopener noreferrer">停止の流れを拡大</a></figcaption>
</figure>

この例を `watch.cpp` として、x64 Native Tools Command Promptで `cl /nologo /Od /Zi watch.cpp /link /DEBUG` を実行すると、最適化なしの `watch.exe` とリンカーのPDBを作れます。Visual StudioでC++コンソールプロジェクトを作って試す場合は、x64のDebug構成で同じコードを使えます。[Visual StudioのネイティブC++デバッグの準備](https://learn.microsoft.com/en-us/visualstudio/debugger/debugging-preparation-visual-cpp-project-types)

```cpp
#include <cstdio>

int g_score = 10;

void ApplyBonus() {
    g_score += 50;
}

void ResetRound() {
    g_score = 0;
}

int main() {
    ApplyBonus();
    ResetRound();
    std::printf("score = %d\n", g_score);
}
```

1. Visual Studioで `main` の `ApplyBonus()` 呼び出し行にF9でブレークポイントを置き、F5で開始します。
2. 呼び出し前に止まったら、**デバッグ → 新しいブレークポイント → データ ブレークポイント**で、アドレスを `&g_score`、バイト数を4にします。WinDbgで同じ場所を監視するなら、`watch.exe` のシンボルを読み込んだ状態で `ba w 4 watch!g_score` を使えます。
3. 続行すると、先に `ApplyBonus` で60への変化を観測し、もう一度続行すると `ResetRound` で0への変化を観測します。停止したスレッドのコールスタックで、どの呼び出しから書き込みに到達したかを確認します。x64のデータブレークポイントによる例外はアクセス後に発生するため、停止位置の前後の命令と値を合わせて見ます。[Visual StudioのネイティブC++データブレークポイント](https://learn.microsoft.com/en-us/visualstudio/debugger/using-breakpoints#set-data-breakpoints-native-c-only) · [Intelのデバッグ例外仕様](https://www.intel.com/content/www/us/en/content-details/868147/intel-64-and-ia-32-architectures-software-developer-s-manual-volume-3b-system-programming-guide-part-2.html)

データブレークポイントに渡したアドレスは、オブジェクトを追跡しません。ローカル変数の寿命が終わったり、コンテナの再確保で要素が移動したりしたら、監視を解除して新しいアドレスを設定します。別プロセスやカーネルからの書き込みも、Visual Studioのネイティブデータブレークポイントの対象外です。[Microsoftのデータブレークポイントの制約](https://learn.microsoft.com/en-us/visualstudio/debugger/using-breakpoints#set-data-breakpoints-native-c-only) · [C++の記憶域期間とオブジェクトの寿命](/runtime/memory/storage-duration-and-lifetime.html)

## ステップ実行と条件付き停止を組み合わせる

Visual StudioのF11（ステップイン）は呼び出し先に入り、F10（ステップオーバー）は呼び出しを実行してから元の関数で止まります。Shift+F11（ステップアウト）は現在の関数から戻るところまで進めます。途中で別のブレークポイントや例外に当たれば、予定していた場所より前に停止する場合があります。生成された命令を一つずつ追う場合は、逆アセンブル画面で命令単位に切り替えます。[Visual Studioのステップ実行](https://learn.microsoft.com/en-us/visualstudio/debugger/navigating-through-code-with-the-debugger) · [最適化済みコードでの逆アセンブル](https://learn.microsoft.com/en-us/visualstudio/debugger/how-to-debug-optimized-code)

`enemyId == 42` のような条件を指定すると、候補に到達した時点でデバッガが式を評価します。頻繁に通る場所では、式が偽でも判定の費用がかかり、処理のタイミングに影響します。別のスレッドで同じ処理が止まる場合は、まず停止したスレッドとコールスタックを確認し、追いたいスレッドが特定できてからスレッドフィルターを使います。[Visual Studioのブレークポイント条件とフィルター](https://learn.microsoft.com/en-us/visualstudio/debugger/using-breakpoints#breakpoint-conditions) · [静的解析とサニタイザー](/tools/build/debugging-and-analysis.html) · [ビルド構成とデバッグ情報](/tools/build/build-configurations.html)
