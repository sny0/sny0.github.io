---
title: "Strategy"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "同じ目的を達成するアルゴリズムが複数あり(移動経路の探し方、難易度ごとのAI、ソート順)、それを使うコードから選択と実装を分離したい。アルゴリズムを差し替え可能な部品にする。"
---

# Strategy

## 解決する問題

同じ目的を達成する**アルゴリズムが複数**あり(移動経路の探し方、難易度ごとのAI、ソート順)、それを使うコードから**選択と実装を分離**したい。アルゴリズムを差し替え可能な部品にする。

## 登場人物と責務

- **Strategy**: アルゴリズムの共通インターフェース(`FindPath(from, to)`)
- **ConcreteStrategy**: 個々のアルゴリズム実装
- **Context**: Strategyを保持して使う側。どの実装かを知らない

## 最小構成図

```
[EnemyMove(Context)] ──委譲──> [IMoveStrategy]
                                 ├ DirectChase(直進)
                                 ├ AStarPath(経路探索)
                                 └ KeepDistance(距離維持)
外部(生成時・難易度設定)がどれを使うか決めて注入する
```

## パターンなしの実装

```cpp
// C++20(問題例)
class Enemy {
public:
    void UpdateMove(const Vec2& playerPos) {
        switch (moveType_) {
            case MoveType::Direct:   /* 直進処理 20行 */ break;
            case MoveType::AStar:    /* 経路探索 50行 */ break;
            case MoveType::Keep:     /* 距離維持 30行 */ break;
        }
    }
private:
    MoveType moveType_;
    // 各アルゴリズム専用の作業変数が全部Enemyに同居(AStar用のopenListなど)
};
```

## 問題点

- 各アルゴリズムの**作業データまでContextに同居**し、Enemyが肥大化
- アルゴリズム追加のたびにEnemyを修正([OCP](/design/solid/ocp.html))
- アルゴリズム単体のテスト・他の敵での再利用ができない

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>

struct Vec2 { float x = 0, y = 0; };

class IMoveStrategy {
public:
    virtual ~IMoveStrategy() = default;
    virtual Vec2 NextStep(const Vec2& self, const Vec2& target) = 0;
};

class DirectChase : public IMoveStrategy {
public:
    Vec2 NextStep(const Vec2& self, const Vec2& target) override {
        // targetへ向かう単位ベクトル×速度(実装略)
        return {};
    }
};
class KeepDistance : public IMoveStrategy {
public:
    explicit KeepDistance(float distance) : distance_(distance) {}
    Vec2 NextStep(const Vec2& self, const Vec2& target) override { return {}; }
private:
    float distance_;   // アルゴリズム固有のデータは自分で持つ(Enemyから消える)
};

class Enemy {
public:
    explicit Enemy(std::unique_ptr<IMoveStrategy> move) : move_(std::move(move)) {}
    void Update(const Vec2& playerPos) { pos_ = move_->NextStep(pos_, playerPos); }
private:
    Vec2 pos_;
    std::unique_ptr<IMoveStrategy> move_;   // 所有。実行時差し替えも可能
};
// Enemy sniper(std::make_unique<KeepDistance>(8.0f));
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_strategy.cpp">samples/pattern_strategy.cpp</a>

### 現代C++の軽量形

状態(固有データ)を持たない戦略は `std::function` で十分です。

```cpp
// using MoveFn = std::function<Vec2(const Vec2&, const Vec2&)>;
// Enemy e{ [](const Vec2& s, const Vec2& t) { /* 直進 */ return Vec2{}; } };
```

またコンパイル時に戦略が決まるならテンプレート引数にする手もあります(仮想呼び出しゼロ、ただし型が分岐 → [テンプレートか仮想関数か](/design/decisions/cpp-choices.html))。

## C#またはUnityでの実装

```csharp
public interface IMoveStrategy { Vector2 NextStep(Vector2 self, Vector2 target); }

// ScriptableObjectにすると「戦略をアセットとして差し替え」できる(Unityの定石)
public abstract class MoveStrategySO : ScriptableObject, IMoveStrategy {
    public abstract Vector2 NextStep(Vector2 self, Vector2 target);
}

[CreateAssetMenu(menuName = "AI/KeepDistance")]
public class KeepDistanceSO : MoveStrategySO {
    [SerializeField] private float distance = 8f;   // 企画がインスペクタで調整できる
    public override Vector2 NextStep(Vector2 self, Vector2 target) { /* 実装略 */ return default; }
}

public class Enemy : MonoBehaviour {
    [SerializeField] private MoveStrategySO moveStrategy;   // 敵Prefabごとに差す
    private void Update() => transform.position += (Vector3)moveStrategy.NextStep(transform.position, PlayerPos());
}
```

## ゲームでの具体例

- 移動・攻撃・照準のアルゴリズム差し替え(敵の個性 → [ケーススタディ: 敵AI](/design/case-studies/enemy-ai.html)、[照準制御](/design/case-studies/aim-control.html))
- 難易度: EasyAI / NormalAI / HardAI を同じContextに注入
- ダメージ計算式・ドロップ抽選方式の差し替え
- ソート・フィルタ(インベントリの並び順)— C++の `std::sort` に比較関数を渡すのは標準ライブラリのStrategy

## 利点

- アルゴリズムごとにクラスが凝集(固有データも一緒に隔離)
- 追加が新クラスのみ([OCP](/design/solid/ocp.html))、単体テスト・再利用が容易
- 実行時差し替え(難易度変更、バフによる行動変化)

## 欠点

- クラス/ファイル数の増加。2種で固定ならswitchで十分
- Contextと戦略の間の**情報の受け渡し設計**が難所: 戦略が必要とする情報(視界、地形)をどう渡すか。引数が肥大するならContext参照を渡すが、結合が戻ってくる
- 呼び出しは仮想関数経由(ホットループでは考慮 → [vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html))

## 適用条件

- 同じ役割のアルゴリズムが3つ以上、または増える見込みが確実
- 実行時・データ駆動で選びたい
- アルゴリズム単体をテストしたい

## 避けるべき条件

- 実装が1つしかない(「いつか増えるかも」は[YAGNI](/design/foundations/yagni-kiss-dry.html))
- 分岐がアルゴリズムの差ではなく数値の差(速度が違うだけ)→ パラメータで済ませる

## 似たパターンとの違い

- [State](/design/patterns/state.html): 構造は同一。**誰が差し替えるか**が違う——Strategyは外部が選ぶ(自分では替わらない)、Stateは自分の判断で遷移する。詳細比較は[第4部: ステートマシン](/game/patterns/state-machines.html)
- [Template Method](/design/patterns/template-method.html): 差し替えの手段が継承(サブクラスがフックを上書き)か、コンポジション(部品を注入)か。現代はStrategy優勢(→ [継承かコンポジションか](/design/foundations/inheritance-delegation-composition.html))
- [Command](/design/patterns/command.html): 「操作の実体化」(発行して運ぶ)vs 「やり方の差し替え」(装着して使う)

## 実務でよく見かける変形

- ScriptableObject戦略(上記。データ駆動+エディタ調整)
- 関数オブジェクト/ラムダ注入(C++)、delegate注入(C#)
- ポリシーベース設計(C++テンプレートのコンパイル時Strategy)

## 過剰設計になる例

「将来AIを差し替えるかもしれない」と1種類しかない移動処理をIMoveStrategy化——実装1つの抽象は追跡コストだけを生みます。2つ目が現れてから抽出しても数時間の作業です。

## 関連項目

- [State](/design/patterns/state.html) / [Template Method](/design/patterns/template-method.html) / [Bridge](/design/patterns/bridge.html)
- [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)

## 理解度チェック

1. StrategyとStateの「差し替えの主体」の違いを説明できますか。
2. 戦略クラスに移すべき「データ」は何ですか(パターンなし版で何が問題だったか)。
3. Strategyを導入すべきでない状況を2つ挙げてください。

## 演習

「ボスの攻撃パターン(近距離連打/遠距離弾幕/突進)」をStrategyで実装し、HP50%以下で戦略を差し替える処理を書いてください。その後、「これはStateパターンで書くべきだったか?」を差し替えの主体の観点から考察してください。

---

前: [State](/design/patterns/state.html) | [カテゴリ目次](/design/patterns/) | 次: [Template Method](/design/patterns/template-method.html)
