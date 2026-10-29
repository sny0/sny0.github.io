---
title: "Gameplay Framework・Subsystem・Slate/UMG・DataAsset/DataTable"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "UEは「ゲームには大抵これがある」という役割クラス群を最初から提供します。Unityが白紙(全部自作)なのと対照的な設計思想です。 Controller と Pawn の分離が肝: 「乗り物に乗り換える」「観戦する」「AIに操作を渡す」が Possess の切り替えで表現できる——Strategy/"
---

# Gameplay Framework・Subsystem・Slate/UMG・DataAsset/DataTable

## Gameplay Framework — 「ゲームの骨格」の既製品

UEは「ゲームには大抵これがある」という役割クラス群を最初から提供します。Unityが白紙(全部自作)なのと対照的な設計思想です。

| クラス | 役割 | Unityでの対応(自作していたもの) |
|---|---|---|
| GameMode | ルールの審判(勝敗、スポーン管理)。サーバーにのみ存在 | GameManager(自作) |
| GameState | 全員が知る試合状態(スコア、残り時間) | 自作+同期処理 |
| PlayerController | プレイヤーの意志(入力→Pawnへの指示)。**憑依(Possess)**の主体 | 自作の入力ハンドラ |
| Pawn / Character | 操作される身体(Characterは歩行機能つき) | Player Prefab+CharacterController |
| PlayerState | プレイヤーごとの公開情報(名前、スコア) | 自作 |
| HUD / Widget | 画面表示 | Canvas+自作UI管理 |

- **Controller と Pawn の分離**が肝: 「乗り物に乗り換える」「観戦する」「AIに操作を渡す」が Possess の切り替えで表現できる——[Strategy](/design/patterns/strategy.html)/[Command](/design/patterns/command.html)的な「操作者と身体の分離」をエンジンが規定した形
- ネットワーク前提の役割分担(GameModeはサーバーのみ等)が最初から織り込まれている——後からマルチ対応する苦しみ(Unityで経験しがち)への回答
- 代償: **枠に沿わないゲーム**(ボードゲーム、シミュレーション)では枠が邪魔に感じることもある。その場合も最低限のGameMode等は要るが、中身は薄くてよい

## Subsystem — UE公式のService Locator

```cpp
// 「ゲーム全体で1つのサービス」を、Singletonを自作せずに置ける仕組み
UCLASS()
class UQuestSubsystem : public UGameInstanceSubsystem {
    GENERATED_BODY()
public:
    void CompleteQuest(FName QuestId);
};
// 利用側: GetGameInstance()->GetSubsystem<UQuestSubsystem>()->CompleteQuest("first_boss");
```

- 寿命の種類ごとに基底が用意される(GameInstance=ゲーム全体 / World=レベル / LocalPlayer=プレイヤーごと)——**寿命管理をエンジンに任せたSingleton代替**([Singletonの問題点](/design/patterns/singleton.html)のうち生成・破棄順と重複をエンジンが解決。全域アクセスと隠れ依存は残る → [Service Locator](/game/patterns/service-locator-and-di.html)の性質)
- Unity対応: 自作Singleton+DontDestroyOnLoadでやっていたことの公式版

## Slate と UMG — 2層のUIシステム

| | Slate | UMG |
|---|---|---|
| 正体 | C++の宣言的UIフレームワーク(**非UObject**・[TSharedPtr管理](/game/unreal/smart-pointers.html)) | Slateの上のUObjectラッパ+エディタ(Widget Blueprint) |
| 書き方 | C++で `SNew(SButton)...` を合成 | デザイナーがGUIで組む+BP/C++ロジック |
| 用途 | エディタ拡張、エンジンUI、性能が要る低レベルUI | **ゲームUIの主戦場** |

- 実務は「UMGで組み、C++親クラス(UUserWidget派生)にロジック」が定石——[MVP/MVVM](/game/patterns/mvc-mvp-mvvm.html)のView=Widget BP、Presenter=C++親クラス、という対応で設計できる(UE5にはMVVMプラグインもある)
- Unity対応: uGUI(GameObjectベース)⇔UMG、UI Toolkit(宣言的)⇔Slateが思想的に近い

## DataAsset と DataTable — データ駆動の受け皿

| | DataAsset(UPrimaryDataAsset等) | DataTable |
|---|---|---|
| 形 | 1アセット=1つの構造化データ(継承・参照可) | 表形式(行構造体×N行。CSV/JSONインポート可) |
| 向く | 「種類」の定義(武器データ、敵タイプ) | 大量の均質な行(ドロップ率表、レベルテーブル) |
| Unity対応 | ScriptableObject | ScriptableObjectの配列/自作テーブル+CSV |

- どちらも[Type Object](/game/patterns/type-object-and-sandbox.html)/[Flyweight](/design/patterns/flyweight.html)の実装先。「種類の追加をデータ作業にする」([OCP](/design/solid/ocp.html)のデータ駆動形)というこのWiki全体のテーマがUEでもここに着地する
- ソフト参照([TSoftObjectPtr](/game/unreal/smart-pointers.html))と組み合わせ、データテーブルからアセットを遅延ロードするのが大規模タイトルの定石

## Unity開発者が誤解しやすい点

1. 「GameModeは自作GameManagerと同じ」— ネットワーク上の存在場所(サーバーのみ)などの規約があり、**枠の意味を知らずに使うと同期で壊れる**
2. 「UIはUMGだけ覚えればいい」— 実務ではSlate層の存在(非UObject・TSharedPtr)を知らないと、寿命バグやエディタ拡張で詰む
3. ScriptableObjectの感覚でDataAssetを実行時に書き換える——共有データの書き換えは全参照者に波及([Flyweightの罠](/design/patterns/flyweight.html)と同じ)。実行時の可変状態は別オブジェクトへ

## 理解度チェック

1. ControllerとPawnの分離は何を可能にする設計ですか。
2. SubsystemはSingletonの問題のうち何を解決し、何を解決しませんか。
3. DataAssetとDataTableの使い分けは?

## 演習

自分の(または想像上の)Unityプロジェクトの「GameManager+UIManager+データのScriptableObject群」を、UEの語彙(GameMode/GameState/Subsystem/UMG/DataAsset)に対応づける移植表を作ってください。対応がきれいに付かない部分(=自作が必要な部分)がどこかを特定するのが狙いです。

---

前: [UEのDelegateとInterface](/game/unreal/delegates-and-interfaces.html) | [カテゴリ目次](/game/unreal/) | 次: [演習](/game/unreal/exercises.html)
