---
title: CPUの命令実行 — レジスタとプログラムカウンター
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: hardware
  summary: CPUが命令を取得して意味を解釈し、レジスタやメモリの値を更新する流れを追う。命令セット、クロック、コア、論理プロセッサーも説明する。
  aliases: [CPU, 命令, 機械語, ISA, 命令セット, レジスタ, プログラムカウンター, PC, ロード, ストア, クロック, GHz, コア, SMT, 論理プロセッサー]
  verification: RISC-Vの命令セット仕様とIntelのクロック・SMT・命令完了の資料に照合（2026-11-07）
---

# CPUの命令実行 — レジスタとプログラムカウンター

CPUはプログラムの**命令**を読み、指定された計算やデータの移動を行います。「値を3増やす」という短い処理も、値を取り出し、3を足して、結果を保存する操作に分けられます。小さな架空のCPUを使い、この流れを追います。[コンピュータの部品と役割](/hardware/computer-components.html)

## 命令と命令セット

命令には「どの操作をするか」と「どの値や場所を使うか」が含まれます。CPUが解釈するバイトの並びを**機械語**、命令を人が読める記号で書く表現を**アセンブリ言語**と呼びます。例えば加算の命令には、計算元と結果の保存先を示す情報が必要です。[RISC-Vの命令形式と演算](https://docs.riscv.org/reference/isa/v20260120/unpriv/rv32.html)

CPUにどの命令があり、各命令がどんな結果を生むかを定める仕様が**命令セットアーキテクチャー（ISA）**です。x86-64、AArch64、RISC-Vなどでは、使える命令やその符号化が異なります。ソースコードから実行ファイルを作るとき、コンパイラーは対象の命令セットに合うコードを生成します。[RISC-Vの基本命令セット](https://docs.riscv.org/reference/isa/v20260120/unpriv/rv32.html) · [コンパイルから実行まで](/runtime/cpp-internals/build-pipeline-journey.html)

## 値を一時的に置くレジスタ

**レジスタ**はCPUが命令の処理に使う、名前や番号で指定できる小さな記憶場所です。計算する値、アドレス、計算結果などを持ちます。普通のメモリからレジスタへ値を読む操作を**ロード**、レジスタからメモリへ値を書く操作を**ストア**と呼びます。RISC-Vの整数演算では、加算などの入力と出力にレジスタを使います。[RISC-Vのレジスタとロード・ストア命令](https://docs.riscv.org/reference/isa/v20260120/unpriv/rv32.html)

次の命令の位置を追うためには、**プログラムカウンター（PC）**と呼ぶ状態も使います。RISC-VのPCは現在の命令のアドレスを持ち、順に進むときや分岐するときの規則が仕様で決まっています。x86系では**命令ポインター**という名前も使われます。[RISC-VのPCと制御の移動](https://docs.riscv.org/reference/isa/v20260120/unpriv/rv32.html) · [Intelのソフトウェア開発者向けマニュアル](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)

## 5を読み、3を足し、8を書き戻す

以下は説明用の架空の命令です。命令の位置を`0`、`1`、`2`と番号で表し、PCはこれから実行する番号を持つものとします。`M[100]`は「メモリの100番地にある値」、`R0`は一つのレジスタです。最初の`M[100]`は`5`です。

```text
0  LOAD  R0, M[100]    # メモリからR0へ読む
1  ADD   R0, 3         # R0に3を足す
2  STORE M[100], R0    # R0をメモリへ書く
```

| 実行する番号 | 操作 | 実行後のR0 | 実行後のM[100] | 次のPC |
| --- | --- | --- | --- | --- |
| 0 | `LOAD`で5を読む | 5 | 5 | 1 |
| 1 | `ADD`で3を足す | 8 | 5 | 2 |
| 2 | `STORE`で8を書く | 8 | 8 | 3 |

<figure class="study-figure">
  <img src="/images/hardware/instruction-execution.svg" alt="架空のCPUで、PCが0のときメモリの5をレジスタR0へロードする。PCが1でR0に3を足して8にし、PCが2でメモリへ8をストアする。命令ごとに取得、解読、実行を考えられる。" width="760" height="420" loading="lazy">
  <figcaption>計算直後はR0だけが8になり、ストアした時点でメモリ側の値も8になります。<a href="/study/images/hardware/instruction-execution.svg" target="_blank" rel="noopener noreferrer">命令実行の図を拡大</a></figcaption>
</figure>

この例には繰り返しを入れていません。条件によって次の命令の位置を変える**分岐**や、別の処理へ移って戻る**関数呼び出し**を組み合わせると、ゲームの条件判断や繰り返しを表せます。[関数呼び出しとCPU](/runtime/cpp-internals/function-calls-and-cpu.html)

## 取得・解読・実行で考える

命令を追うときは、まずPCが示す位置から命令を**取得**し、操作と対象を**解読**し、計算や読み書きを**実行**すると考えます。メモリを使う命令では、CPUのキャッシュやメモリの仕組みも働きます。[RAM・キャッシュ・ストレージ](/hardware/memory/ram-cache-and-storage.html)

実際の高性能CPUは、複数の命令の処理を重ね、準備が整った操作を先に進める**アウトオブオーダー実行**などを使います。完了した命令の結果をプログラムが観測する状態へ確定する段階を**リタイア**と呼びます。Intelの該当するCPUでは、結果をプログラム順に確定する仕組みがあります。[Intelの命令のリタイア](https://www.intel.com/content/www/us/en/docs/vtune-profiler/user-guide/2026-0/instructions-retired-event.html) · [キャッシュ・分岐・SIMDの詳細](/runtime/cpp-internals/cache-branch-simd.html)

## GHzは命令数をそのまま表すか

**クロック周波数**は、CPU内部の動作の基準となる周期が1秒間に何回あるかを表します。`1 GHz`は1秒間に10億周期です。一つの命令の処理が複数周期にまたがる場合も、複数の命令を重ねて進める場合もあるため、`3 GHz`という表示だけから「毎秒30億命令」とは計算できません。同じ処理を終えるまでの時間には、命令の構成、メモリ待ち、CPUの実装なども関わります。[Intelのクロック周波数の解説](https://www.intel.com/content/www/us/en/gaming/resources/cpu-clock-speed.html)

## コアと論理プロセッサー

**コア**はCPU内で命令の実行を進める処理のまとまりです。複数のコアを持つCPUでは、複数の命令列を並行して実行できます。**SMT**は、一つのコアで複数のハードウェアスレッドの状態を持ち、実行資源を共有して利用する方式です。IntelのHyper-Threadingもその一例です。OSから見える実行先を**論理プロセッサー**と呼びます。[IntelのHyper-Threadingの解説](https://www.intel.com/content/www/us/en/gaming/resources/hyper-threading.html)

例えば4コア・8論理プロセッサーの構成でも、すべての計算用回路が8コア分になるわけではありません。OSが各スレッドをどの実行先へ割り当てるか、同時に進められる仕事がどれだけあるかによって、処理時間が変わります。[スレッドと同期](/runtime/thread-synchronization.html) · [Microsoftのスレッドとスケジューリング](https://learn.microsoft.com/en-us/windows/win32/procthread/about-processes-and-threads)
