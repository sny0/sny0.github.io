---
title: "第3部: GoFデザインパターン"
study:
  source: "C++ Wiki"
  kind: "索引"
  status: "既存原稿"
  summary: "デザインパターンは、繰り返し現れる設計問題への定型解のカタログです。GoF(Gang of Four: Gamma, Helm, Johnson, Vlissides)の23パターンが古典として整理されています。"
---

# 第3部: GoFデザインパターン

デザインパターンは、繰り返し現れる設計問題への**定型解のカタログ**です。GoF(Gang of Four: Gamma, Helm, Johnson, Vlissides)の23パターンが古典として整理されています。

## パターンを学ぶ目的(重要)

パターン名を暗記することではなく、**「この問題には、どんな選択肢があり、なぜこの構造を選ぶのか」を判断できる**ようになることが目的です。各ページは必ず「パターンなしの実装 → 問題点 → 適用 → 失うもの → 使わない場面」の順で書かれています。「使わない場面」まで読んで1ページです。

- パターンは**発明ではなく発見**: 優れたコードに繰り返し現れた形に名前を付けたもの。名前は会話の道具(「ここObserverでいいよね」)として最も価値があります。
- パターンは**絶対規則ではない**: 適用すること自体に価値はなく、問題がないところに適用すればただの複雑化です。
- 言語で形は変わる: GoF本はC++/Smalltalk時代のもの。C++20ではラムダや`std::function`、テンプレートで簡潔になるパターンが多く、各ページで現代的な形も示します。

## 3分類

| 分類 | 何を扱うか | 直感 |
|---|---|---|
| **生成 (Creational)** | オブジェクトを「誰が・どうやって」作るか | `new` を直接書くと生成方法に結合する。生成の柔軟性が欲しいときの道具 |
| **構造 (Structural)** | クラス・オブジェクトを「どう組み合わせて」大きな構造を作るか | 包む・繋ぐ・まとめる。既存のものを変えずに形を合わせる道具 |
| **振る舞い (Behavioral)** | オブジェクト間の「責任分担と通信」をどうするか | 誰が何を決め、どう伝えるか。アルゴリズムと通知の道具 |

## 生成パターン

| パターン | 一言で | ゲームでの典型 |
|---|---|---|
| [Factory Method](/design/patterns/factory-method.html) | 生成をサブクラス/関数に任せる | 敵の生成をステージ毎に変える |
| [Abstract Factory](/design/patterns/abstract-factory.html) | 関連する一族をまとめて生成 | プラットフォーム別UI部品一式 |
| [Builder](/design/patterns/builder.html) | 複雑な構築を段階的に | キャラクターメイキング、レベル構築 |
| [Prototype](/design/patterns/prototype.html) | 見本のコピーで生成 | 配置済み敵の複製(UnityのPrefabの思想) |
| [Singleton](/design/patterns/singleton.html) | 唯一のインスタンス+全域アクセス | 各種Manager(乱用注意の筆頭) |

## 構造パターン

| パターン | 一言で | ゲームでの典型 |
|---|---|---|
| [Adapter](/design/patterns/adapter.html) | インターフェースを変換して繋ぐ | 外部SDKを自作インターフェースに合わせる |
| [Bridge](/design/patterns/bridge.html) | 抽象と実装の2軸を分離 | 武器の種類×プラットフォーム描画 |
| [Composite](/design/patterns/composite.html) | 個と集合を同一視 | シーングラフ、UIツリー |
| [Decorator](/design/patterns/decorator.html) | 包んで機能を足す | バフでダメージ計算を装飾 |
| [Facade](/design/patterns/facade.html) | 複雑な下位系に窓口を1つ | サウンド再生の一枚窓口 |
| [Flyweight](/design/patterns/flyweight.html) | 共有できるデータを共有 | 弾・木・タイルの共通データ |
| [Proxy](/design/patterns/proxy.html) | 代理を挟んで制御 | アセットの遅延ロード |

## 振る舞いパターン

| パターン | 一言で | ゲームでの典型 |
|---|---|---|
| [Chain of Responsibility](/design/patterns/chain-of-responsibility.html) | 処理者の連鎖に流す | ダメージ軽減の段階処理、UIイベント伝播 |
| [Command](/design/patterns/command.html) | 操作をオブジェクト化 | 入力のリバインド、Undo、リプレイ |
| [Interpreter](/design/patterns/interpreter.html) | 文法を持つ言語を解釈 | スキルスクリプト、数式パーサ |
| [Iterator](/design/patterns/iterator.html) | 走査を抽象化 | コンテナ走査(C++ではイテレータとして言語に溶けている) |
| [Mediator](/design/patterns/mediator.html) | 多対多の通信を仲介役に集約 | UI画面内の部品間調整 |
| [Memento](/design/patterns/memento.html) | 状態のスナップショットを保存 | セーブ、Undo、リプレイの基準点 |
| [Observer](/design/patterns/observer.html) | 変化を購読者に通知 | イベント通知全般(C#のevent) |
| [State](/design/patterns/state.html) | 状態ごとの振る舞いをオブジェクト化 | キャラの状態遷移、AI |
| [Strategy](/design/patterns/strategy.html) | アルゴリズムを差し替え可能に | 移動アルゴリズム、AI難易度 |
| [Template Method](/design/patterns/template-method.html) | 骨格を親、詳細を子に | ゲームモードの共通フロー |
| [Visitor](/design/patterns/visitor.html) | 構造側を変えずに操作を追加 | シーンツリーへの操作追加(使用は稀) |

[演習](/design/patterns/exercises.html) で総仕上げをしてください。

## どう選ぶか(逆引き)

- 生成方法を差し替えたい・生成に条件がある → Factory Method / Abstract Factory
- 「if種類分岐」が増え続ける → State / Strategy / ポリモーフィズム全般
- 通知したいが相手を知りたくない → Observer(即時)/ [Event Queue](/game/patterns/event-queue-and-pubsub.html)(遅延)
- 操作を記録・取消・再生したい → Command (+ Memento)
- 既存コードを変えずに機能追加 → Decorator / Proxy / Adapter
- 大量の同種オブジェクトでメモリが苦しい → Flyweight (+ [Object Pool](/game/patterns/object-pool.html))
- 詳しくは [判断ガイド: デザインパターンを使うべきか](/design/decisions/abstraction-and-patterns.html)

---

[全体目次](/guide/cpp-index.html) | 次: [Factory Method](/design/patterns/factory-method.html)
