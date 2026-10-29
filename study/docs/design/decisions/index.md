---
title: "第12部: 判断ガイド"
study:
  source: "C++ Wiki"
  kind: "索引"
  status: "既存原稿"
  summary: "このWikiの総仕上げ——「いつ・何を根拠に選ぶか」の判断フロー集です。Yes/Noの二分ではなく、判断材料・例外・トレードオフを明示します。迷ったときに開く逆引きの章です。"
---

# 第12部: 判断ガイド

このWikiの総仕上げ——「**いつ・何を根拠に選ぶか**」の判断フロー集です。Yes/Noの二分ではなく、**判断材料・例外・トレードオフ**を明示します。迷ったときに開く逆引きの章です。

## ページ一覧

| ページ | 扱う判断 |
|---|---|
| [クラスを分けるべきか](/design/decisions/split-class.html) | 分割の基準と、分割しすぎの見分け方 |
| [インターフェースを作るべきか](/design/decisions/create-interface.html) | 抽象を挟む価値の判定 |
| [継承かコンポジションか](/design/decisions/inheritance-or-composition.html) | is-a検証と実務フロー |
| [抽象化すべきか・デザインパターンを使うべきか](/design/decisions/abstraction-and-patterns.html) | 「3回ルール」と破綻シグナル |
| [イベント・依存性注入・Singleton の判断](/design/decisions/events-di-singleton.html) | 通知と依存配りの選択 |
| [C++の選択(テンプレートか仮想関数か/値渡しか参照渡しか/unique_ptrかshared_ptrか/配列かvectorか/構造体かクラスか)](/design/decisions/cpp-choices.html) | C++固有の5大選択 |
| [最適化すべきか・リファクタリングすべきか](/design/decisions/optimize-or-refactor.html) | 投資判断としての改善 |

仕上げに [演習](/design/decisions/exercises.html)。

## 全判断に共通する3原則

1. **可逆性で仕分ける**: 後から安く変えられる決定は素朴に倒す([YAGNI](/design/foundations/yagni-kiss-dry.html))。変えるのが高い決定(セーブ形式、公開API、データレイアウト)だけ先に考える
2. **証拠を要求する**: 「いつか必要かも」ではなく「既に2回起きた」「計測で出た」を根拠にする
3. **選ばなかった案を書き残す**: 判断はチームの共有財産。「なぜswitchのままにしたか」の一行コメントが将来の再判断を安くする

---

[全体目次](/guide/cpp-index.html) | 次: [クラスを分けるべきか](/design/decisions/split-class.html)
