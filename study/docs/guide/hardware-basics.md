---
title: コンピュータの部品から読む
study:
  source: 新規執筆
  section: learning
  format: path
  status: published
  domain: hardware
  collection: foundations
  order: 1
  summary: CPU・RAM・SSDの役割を知り、命令の実行とデータの置き場所へ進む読み順。身近なゲームの起動から内部を調べる。
---

# コンピュータの部品から読む

CPU、メモリ、ストレージという名前を見かけても、それぞれが何を担当するか曖昧なときの入口です。まずゲームを起動する場面から部品の関係を見て、命令とデータの動きを追います。

## 読む順番

1. [コンピュータを構成する部品](/hardware/computer-components.html)で、CPU、RAM、ストレージ、GPU、入出力の担当をつかみます。
2. [CPUが命令を実行する仕組み](/hardware/cpu/instruction-execution.html)で、命令、レジスタ、メモリの関係を追います。
3. [RAM・キャッシュ・ストレージ](/hardware/memory/ram-cache-and-storage.html)で、計算中のデータと保存したデータの置き場所を比べます。

ビットやバイト、2進数の読み方を確認したいときは、[整数・ビット・バイト](/data/integer-bits-and-bytes.html)を参照してください。

## 確かめること

- ゲームの実行中に使うデータと、終了後も保存しておくデータを、それぞれどこに置くか説明できる。
- CPUのレジスタとRAMがどう関わるか、命令の小さな例でたどれる。
- メモリの容量と、読み書きの待ち時間が指すものを区別できる。

## さらに内部を調べる

起動時にOSがする準備は[実行ファイルの起動](/os/process-startup.html)、アプリが扱うアドレスは[仮想メモリ](/os/virtual-memory.html)へ進みます。描画を調べたい場合は[GPUとは何か](/hardware/gpu/what-is-gpu.html)、部品同士の接続を調べたい場合は[PCI Express](/hardware/io/pcie-links.html)が次の入口です。

通信の基礎は[ネットワークの基本から読む](/guide/network-basics.html)へ進んでください。

OSや言語、開発ツールの関係を調べるときは、[プログラムを書く・動かす基礎](/guide/software-development-basics.html)へ進めます。
