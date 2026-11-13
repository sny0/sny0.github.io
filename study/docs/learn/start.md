---
title: 学習を始める — 目的からロードマップを選ぶ
layout: page
study:
  source: 新規執筆
  section: learning
  format: path
  status: published
  domain: guide
  summary: 目的と経験を選び、分野ごとのロードマップのどのノードから始めるかを確認する。ブラウザに保存した進捗も見られる。
  aliases: [初心者, プログラミング入門, 学習の入口, 最初に読む, ロードマップのロードマップ, Unity入門]
---

<script setup>
import StudyStart from '../.vitepress/theme/StudyStart.vue'
</script>

<StudyStart>

```mermaid
flowchart TD
  S["スタート"] --> P["プログラミング入門"]
  P --> T["開発の道具"]
  T --> U["Unityでゲームを作る"]
  T --> L["低レイヤ・言語"]
  U --> D["設計"]
  U --> R["3DCG・描画"]
  R --> H["シェーダー"]
  L --> R
  L --> W["ネットワーク・ブラウザ"]
  D --> G["ゲーム開発（発展）"]
  R --> G
  L --> G
```

</StudyStart>
