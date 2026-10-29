---
title: "第2部: SOLID原則"
study:
  source: "C++ Wiki"
  kind: "索引"
  status: "既存原稿"
  summary: "SOLIDは、オブジェクト指向設計の経験則5つの頭文字です(Robert C. Martinの整理による)。第1部の概念(責務・結合・依存の方向)を「原則」の形に定式化したものです。"
---

# 第2部: SOLID原則

SOLIDは、オブジェクト指向設計の経験則5つの頭文字です(Robert C. Martinの整理による)。第1部の概念(責務・結合・依存の方向)を「原則」の形に定式化したものです。

| 略 | 名前 | 一言で |
|---|---|---|
| [SRP](/design/solid/srp.html) | 単一責任の原則 | 1つのモジュールの変更理由は1つにする |
| [OCP](/design/solid/ocp.html) | 開放閉鎖の原則 | 追加は新コードで、既存コードの変更なしでできるようにする |
| [LSP](/design/solid/lsp.html) | リスコフの置換原則 | 派生型は基底型の約束を守り、いつでも置き換え可能にする |
| [ISP](/design/solid/isp.html) | インターフェース分離の原則 | 使わないものへの依存を強制しない |
| [DIP](/design/solid/dip.html) | 依存性逆転の原則 | 上位方針を下位詳細に依存させず、両方を抽象に依存させる |

仕上げに [演習](/design/solid/exercises.html) を解いてください。

## この章の前提と読み方

- 前提知識: [責務](/design/foundations/responsibility-and-separation.html)、[凝集度と結合度](/design/foundations/cohesion-and-coupling.html)、[依存の方向](/design/foundations/dependency.html)、[ポリモーフィズム](/design/foundations/polymorphism-interface.html)。
- **SOLIDは法律ではありません。** どの原則も「変更が来る場所」に適用して初めて元が取れる投資です。各ページの「適用しすぎた場合の弊害」まで読んで1ページ完結です。
- 5原則は独立ではなく、SRPで分け、OCP/LSPで拡張可能にし、ISP/DIPで依存を整える、という1セットの道具です。各ページの「原則同士の関係」で繋がりを説明します。

---

[全体目次](/guide/cpp-index.html) | 次: [SRP: 単一責任の原則](/design/solid/srp.html)
