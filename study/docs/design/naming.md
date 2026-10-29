---
title: "クラス名辞典"
study:
  source: "設計の手帖"
  kind: "用語"
  status: "既存原稿"
  summary: "設計の手帖に収録されている50の名前を、役割・例・注意点から引く辞典です。 分類: ドメイン 同一性を持ち、状態の変化を追う。 Entity と DB 行は常に同じ単位ではない。"
---

# クラス名辞典

設計の手帖に収録されている50の名前を、役割・例・注意点から引く辞典です。

## Entity {#0}

分類: ドメイン

同一性を持ち、状態の変化を追う。

```text
Order / Customer
```

Entity と DB 行は常に同じ単位ではない。

[DDD・Entity・Repository](/design/notebook/domain.html)

## Value Object {#1}

分類: ドメイン

値で等しさを判断し、ルールをまとめる。

```text
Money / DateRange / Quantity
```

struct や record にするだけでは不変条件は保証されない。

[カプセル化と値オブジェクト](/design/notebook/objects.html)

## Aggregate Root {#2}

分類: ドメイン

整合性を守る集約の操作窓口。

```text
Order / ShoppingCart
```

関連データをすべて詰め込まない。

[DDD・Entity・Repository](/design/notebook/domain.html)

## Domain Service {#3}

分類: ドメイン

一つの Entity へ自然に属さない業務判断。

```text
PricingService / TransferService
```

取得と保存の調整をする Application Service と区別。

[DDD・Entity・Repository](/design/notebook/domain.html)

## Specification {#4}

分類: ドメイン

適合条件を名前のあるルールにする。

```text
EligibleCustomerSpecification
```

単純な条件式まで型に分ける必要はない。

[DDD・Entity・Repository](/design/notebook/domain.html)

## Policy {#5}

分類: ドメイン

判断や制約を表す差し替え可能な方針。

```text
ShippingPolicy / RetryPolicy
```

技術的な再試行と業務の価格規則は別の責務。

[Strategy・State・Command](/design/notebook/behavior.html)

## Repository {#6}

分類: データ・境界

ドメインの集合として取得・保存を提供。

```text
OrderRepository / IOrderRepository
```

全テーブルに機械的に作るものではない。

[DDD・Entity・Repository](/design/notebook/domain.html)

## DAO {#7}

分類: データ・境界

データストアの操作をまとめる。

```text
CustomerDao / UserDao
```

Repository と役割が重なる運用もある。契約を見る。

[DDD・Entity・Repository](/design/notebook/domain.html)

## DTO {#8}

分類: データ・境界

境界を越えてデータを運ぶ形。

```text
OrderSummaryDto / CustomerDto
```

業務モデルや画面状態との共用は変更理由を確認。

[DDD・Entity・Repository](/design/notebook/domain.html)

## Request / Response {#9}

分類: データ・境界

入口の入力と、出口の応答を表す。

```text
CreateOrderRequest / OrderResponse
```

内部モデルの全項目をそのまま公開しない。

[レイヤーとアーキテクチャ](/design/notebook/architecture.html)

## Mapper / Converter {#10}

分類: データ・境界

データ表現や型を変換する。

```text
OrderMapper / CurrencyConverter
```

通貨換算など業務判断を含むなら責務を明確に。

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Serializer / Deserializer {#11}

分類: データ・境界

型と、保存・通信する形式を相互変換。

```text
JsonOrderSerializer
```

形式変更と業務判断を混ぜない。

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Gateway / Client {#12}

分類: データ・境界

外部サービスとの通信の窓口。

```text
PaymentGateway / WeatherApiClient
```

タイムアウト、エラー変換、所有する接続を決める。

[レイヤーとアーキテクチャ](/design/notebook/architecture.html)

## UnitOfWork {#13}

分類: データ・境界

変更の追跡やトランザクションを調整。

```text
OrderUnitOfWork / DbContext
```

既存 ORM の機能と重ねる前に必要性を確認。

[DDD・Entity・Repository](/design/notebook/domain.html)

## QueryService / Reader {#14}

分類: データ・境界

参照専用の取得や投影を担う。

```text
OrderQueryService / ReportReader
```

更新側の不変条件を迂回する書き込みを混ぜない。

[関数型・データ指向・CQRS](/design/notebook/paradigms.html)

## Adapter {#15}

分類: 構造・生成

外側の契約を利用側の契約へ適合。

```text
LegacyPaymentAdapter
```

API と単位、例外の意味も翻訳する。

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Decorator {#16}

分類: 構造・生成

同じ契約を包んで機能を追加。

```text
LoggingRepository / CompressingStream
```

包む順序による振る舞いの変化に注意。

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Facade {#17}

分類: 構造・生成

複数の処理へ簡潔な入口を提供。

```text
CheckoutFacade / MediaFacade
```

すべての業務を抱える巨大な入口にしない。

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Proxy {#18}

分類: 構造・生成

対象へのアクセスを代理・制御。

```text
LazyImageProxy / RemoteServiceProxy
```

ローカル呼び出しと通信の失敗の違いを隠しすぎない。

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Factory {#19}

分類: 構造・生成

生成手順や実装の選択をまとめる。

```text
ParserFactory / ConnectionFactory
```

GoF Factory Method と単純な factory 関数を区別。

[Factory・Builder・Singleton](/design/notebook/creation.html)

## Builder {#20}

分類: 構造・生成

段階的に組み立てて完成品を作る。

```text
ReportBuilder / QueryBuilder
```

完成時に必要条件を検証する。

[Factory・Builder・Singleton](/design/notebook/creation.html)

## Composite {#21}

分類: 構造・生成

単体と集合を同じ操作で扱う。

```text
ShapeGroup / CompositeRule
```

すべての操作が単体・集合の両方に自然か確認。

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Bridge {#22}

分類: 構造・生成

抽象と実装の二つの変動軸を分離。

```text
Shape + Renderer
```

変動軸が一つだけなら過剰な可能性がある。

[Adapter・Decorator・Facade](/design/notebook/structure.html)

## Strategy {#23}

分類: 振る舞い

同じ目的のアルゴリズムを差し替える。

```text
DiscountStrategy / SortStrategy
```

一操作なら関数やデリゲートでも表せる。

[Strategy・State・Command](/design/notebook/behavior.html)

## State {#24}

分類: 振る舞い

状態ごとの振る舞いと遷移をまとめる。

```text
DraftState / ApprovedState
```

少数の状態なら enum と遷移表で足りることも。

[Strategy・State・Command](/design/notebook/behavior.html)

## Command {#25}

分類: 振る舞い

実行する操作と引数をひとまとめにする。

```text
RenameFileCommand / PlaceOrderCommand
```

自動で Undo や冪等性が得られるわけではない。

[Strategy・State・Command](/design/notebook/behavior.html)

## Handler {#26}

分類: 振る舞い

特定の要求・通知を受けて処理する。

```text
PlaceOrderHandler / OrderPlacedHandler
```

何を扱うかを名前に含める。

[Observer とイベント設計](/design/notebook/events.html)

## Observer / Subscriber {#27}

分類: 振る舞い

対象の変化や通知を購読する。

```text
InventoryObserver / OrderSubscriber
```

購読解除と発行元との寿命関係に注意。

[Observer とイベント設計](/design/notebook/events.html)

## Publisher / EventBus {#28}

分類: 振る舞い

通知を発行・配信する窓口。

```text
DomainEventPublisher / EventBus
```

配信順序、同期性、失敗時の扱いを明示。

[Observer とイベント設計](/design/notebook/events.html)

## Mediator {#29}

分類: 振る舞い

複数の部品や要求の調整を仲介。

```text
DialogMediator / RequestMediator
```

全業務を抱える司令塔にしない。

[Observer とイベント設計](/design/notebook/events.html)

## Validator {#30}

分類: 振る舞い

入力や候補が条件を満たすか検査。

```text
CreateOrderValidator
```

境界の検証とモデルの不変条件を区別。

[カプセル化と値オブジェクト](/design/notebook/objects.html)

## Parser {#31}

分類: 振る舞い

入力を文法に従って構造へ変換。

```text
CsvParser / ExpressionParser
```

文字列分割とエラー位置の契約を明確に。

[Factory・Builder・Singleton](/design/notebook/creation.html)

## Processor / Pipeline {#32}

分類: 振る舞い

一連の処理や複数ステップを実行。

```text
ImageProcessor / ImportPipeline
```

何でも受ける汎用型へ広げすぎない。

[Strategy・State・Command](/design/notebook/behavior.html)

## UseCase / ApplicationService {#33}

分類: アプリ・UI

ユースケースの取得・操作・保存を調整。

```text
PlaceOrderUseCase / OrderAppService
```

業務判断を全部ここへ詰め込まない。

[レイヤーとアーキテクチャ](/design/notebook/architecture.html)

## Controller {#34}

分類: アプリ・UI

入力を受け、処理を呼び、結果を応答へ。

```text
OrderController / InputController
```

HTTP や UI の詳細をドメインへ渡さない。

[MVC・MVP・MVVM](/design/notebook/presentation.html)

## Presenter {#35}

分類: アプリ・UI

View の契約を通じて表示を調整。

```text
OrderPresenter / LoginPresenter
```

View と業務モデルの橋渡しへ責務を絞る。

[MVC・MVP・MVVM](/design/notebook/presentation.html)

## ViewModel {#36}

分類: アプリ・UI

表示状態と操作を View へ公開。

```text
OrderViewModel / SearchViewModel
```

Model・DTO と同じものではない。

[MVC・MVP・MVVM](/design/notebook/presentation.html)

## View {#37}

分類: アプリ・UI

画面や表示を担当。

```text
OrderView / MainWindow
```

業務判断をイベントハンドラーへ集中させない。

[MVC・MVP・MVVM](/design/notebook/presentation.html)

## Model {#38}

分類: アプリ・UI

対象を表すモデル。意味は文脈依存。

```text
OrderModel / DocumentModel
```

DB 行、業務型、UI 用モデルのどれか確認。

[MVC・MVP・MVVM](/design/notebook/presentation.html)

## Coordinator {#39}

分類: アプリ・UI

画面遷移や複数処理の進行を調整。

```text
NavigationCoordinator
```

アプリ全体の万能 Manager にしない。

[MVC・MVP・MVVM](/design/notebook/presentation.html)

## Service {#40}

分類: アプリ・UI

特定の機能・操作を提供。

```text
EmailService / PricingService
```

技術処理か業務判断か、名前と配置で伝える。

[クラス名の読み方・付け方](/design/notebook/naming.html)

## Manager / Helper / Utils {#41}

分類: アプリ・UI

管理や補助。意味が広いので要注意。

```text
SessionManager / PathHelper
```

曖昧なら対象と具体的な動詞・役割へ絞る。

[クラス名の読み方・付け方](/design/notebook/naming.html)

## ScopeGuard / Handle {#42}

分類: 言語・基盤

スコープ終了時の処理やリソースを管理。

```text
FileHandle / ScopeGuard
```

C++ なら例外、ムーブ、所有権の契約も考える。

[C++ の所有権と型設計](/design/notebook/cpp.html)

## Impl / Pimpl {#43}

分類: 言語・基盤

公開型から実装詳細を隠す。

```text
Document::Impl
```

不完全型と特殊メンバー関数の定義場所に注意。

[C++ の所有権と型設計](/design/notebook/cpp.html)

## Provider {#44}

分類: 言語・基盤

必要な値や機能の供給元。

```text
TimeProvider / TokenProvider
```

Service Locator 的に何でも取得させない。

[合成・インターフェース・DI](/design/notebook/composition.html)

## Exception / Error {#45}

分類: 言語・基盤

失敗の種類や情報を表す。

```text
OrderNotFoundException / ParseError
```

C# の Exception 語尾と、C++ の失敗表現は区別。

[C# の寿命と非同期設計](/design/notebook/csharp.html)

## EventArgs / EventHandler {#46}

分類: 言語・基盤

C# のイベント情報 / 通知を扱う型名。

```text
OrderChangedEventArgs / EventHandler<T>
```

EventHandler は標準型、独自の語尾は慣例。

[Observer とイベント設計](/design/notebook/events.html)

## Options / Settings / Config {#47}

分類: 言語・基盤

構成や選択可能な設定をまとめる。

```text
ImportOptions / SmtpSettings
```

秘密情報をログへ出さず、設定値も検証する。

[Factory・Builder・Singleton](/design/notebook/creation.html)

## Cache / Pool {#48}

分類: 言語・基盤

結果の再利用 / 資源の貸出と返却。

```text
ProductCache / ConnectionPool
```

無効化、容量、同時利用、返却時の状態を設計。

[C++ の所有権と型設計](/design/notebook/cpp.html)

## Fake / Stub / Mock / Spy {#49}

分類: テスト

本物の代わりに応答・記録・検証する。

```text
FakeRepository / RecordingNotifier
```

何を検証する代役かを先に決める。

[実践課題とレビューの視点](/design/notebook/practice.html)
