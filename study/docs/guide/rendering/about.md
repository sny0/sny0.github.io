---
title: 描画の学習ガイドについて
study:
  source: RenderingWiki
  status: published
  summary: 描画の学習ガイドの使い方と、技術辞典・実践教材への進み方。
  section: learning
  format: path
  domain: graphics
  collection: rendering
  order: 0
---

<div id="このwikiについて" class="study-legacy-anchor" aria-hidden="true"></div>

# 描画の学習ガイドについて

## このガイドの役割

描画に関する技術辞典の本文を、目的に合う順番で読むための案内です。GPU・数学・パイプライン・シェーダ・APIを結び付け、UnityやUnreal Engineで見かける機能の内部へ進みます。

1. **GPUはどう動くか** — ハードウェアとAPIの挙動を知る。
2. **なぜその技術が生まれたか** — 当時の課題と、置き換えた技術を調べる。
3. **技術同士はどうつながるか** — 1フレームの処理として結び付ける。

詳細な解説は各本文に置き、このガイドでは前提知識・読み順・実践への進み方を扱います。

## 目的別の読み方

- **順番に学ぶ**：[描画の学習ロードマップ](/guide/rendering/roadmap.html)から始めます。GPU・3D数学・パイプラインの前提を確認し、必要な本文へ進みます。
- **用語や仕組みを調べる**：[3DCGとグラフィックスの辞典](/graphics/)や全文検索を使います。各本文の「前提知識」から、不明な用語へ戻れます。
- **歴史から関係をつかむ**：[リアルタイム3D技術全史](/guide/rendering/timeline.html)で技術の変化を俯瞰します。
- **作って確かめる**：[レンダラーの設計・実装](/graphics/capstone/01-design.html)へ進み、必要な説明を辞典で参照します。

## 本文で調べられること

| 観点 | 内容 |
|---|---|
| 概要と動機 | その技術が何で、どの問題を扱うか |
| 歴史と比較 | それ以前の手法、解決した課題、現在の使われ方 |
| 内部動作 | GPU・API・ドライバの仕事と、データの流れ |
| 環境ごとの対応 | Unity、Unreal Engine、Direct3D、Vulkanなどでの扱い |
| コードと図 | 処理の対応を追うための例 |
| 前提・関連項目 | 先に知っておく概念と、理解を広げるリンク |
| 理解度チェックと参考資料 | 手元で確認する問い、原典や公式文書 |

項目によって扱う範囲と詳しさは異なります。本文内のコード断片と、取得して動かすサンプルはそれぞれのページの説明に従って使います。

## 表記について

- 数式は $\LaTeX$ 表記で表示します。
- 図にはMermaidやSVGを使います。
- コード例はHLSL・GLSL・WGSL・C++・C#などを文脈に応じて使い分けます。
- DirectX 12をDX12、Unreal EngineをUEと略すことがあります。描画APIそのものを指す場合はDirect3Dの名称にも注意してください。

## 関連する入口

- [描画の学習ロードマップ](/guide/rendering/roadmap.html)
- [リアルタイム3D技術全史](/guide/rendering/timeline.html)
- [GPUとは何か](/hardware/gpu/what-is-gpu.html)
