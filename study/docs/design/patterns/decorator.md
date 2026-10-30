---
title: Decorator
study:
  source: C++ Wiki
  status: published
  summary: "オブジェクトに機能を動的に・組み合わせ自由に追加したい。継承で「機能付きサブクラス」を作ると組み合わせの数だけクラスが爆発し、実行時の付け外しもできない。 Component: 共通インターフェース(例: IDamageCalculator)"
  section: reference
  format: article
  domain: design
---

# Decorator

## 解決する問題

オブジェクトに機能を**動的に・組み合わせ自由に**追加したい。継承で「機能付きサブクラス」を作ると組み合わせの数だけクラスが爆発し、実行時の付け外しもできない。

## 登場人物と責務

- **Component**: 共通インターフェース(例: `IDamageCalculator`)
- **ConcreteComponent**: 素の実装(基本ダメージ計算)
- **Decorator**: Componentを**包み**、同じインターフェースを実装。処理の前後に何かを足して内側へ委譲
- **ConcreteDecorator**: 具体的な追加機能(クリティカル、属性強化)

## 最小構成図

```
呼び出し ──> [CriticalDecorator] ──> [FireBoostDecorator] ──> [BaseDamage]
              (1.5倍にして委譲)        (+10して委譲)            (素の計算)
同じインターフェースの入れ子。外から見ると1個のComponent
```

## パターンなしの実装

```cpp
// C++20(問題例)— 機能の組み合わせをクラスで表現
class Damage {};
class CriticalDamage : public Damage {};
class FireDamage : public Damage {};
class CriticalFireDamage : public Damage {};       // 組み合わせ爆発
class CriticalFirePoisonDamage : public Damage {}; // バフが1種増えるたび倍々に…
```

あるいはフラグ地獄:

```cpp
int Calc(int base, bool crit, bool fire, bool poison, bool berserk /* 増え続ける */) {
    // 全組み合わせの適用順をこの1関数が知る羽目になる
}
```

## 問題点

- 組み合わせがクラス数(積)またはフラグ引数(条件分岐の網)として爆発
- 実行時の付け外し(バフが切れる)を型で表現できない
- 適用順の制御(乗算を先に? 加算を先に?)が1か所に密集する

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>

class IDamageCalculator {
public:
    virtual ~IDamageCalculator() = default;
    virtual int Calc(int baseAttack) const = 0;
};

class BaseDamage : public IDamageCalculator {          // 素の計算
public:
    int Calc(int baseAttack) const override { return baseAttack; }
};

class DamageDecorator : public IDamageCalculator {     // Decorator共通部
public:
    explicit DamageDecorator(std::unique_ptr<IDamageCalculator> inner)
        : inner_(std::move(inner)) {}
protected:
    std::unique_ptr<IDamageCalculator> inner_;   // 内側を所有する
};

class CriticalBoost : public DamageDecorator {
public:
    using DamageDecorator::DamageDecorator;
    int Calc(int baseAttack) const override {
        return static_cast<int>(inner_->Calc(baseAttack) * 1.5f);   // 内側の結果に足す
    }
};
class FlatBuff : public DamageDecorator {
public:
    FlatBuff(std::unique_ptr<IDamageCalculator> inner, int bonus)
        : DamageDecorator(std::move(inner)), bonus_(bonus) {}
    int Calc(int baseAttack) const override { return inner_->Calc(baseAttack) + bonus_; }
private:
    int bonus_;
};

// 組み立て: バフの組み合わせと順序を実行時に決められる
// std::unique_ptr<IDamageCalculator> calc = std::make_unique<BaseDamage>();
// calc = std::make_unique<FlatBuff>(std::move(calc), 10);      // まず+10
// calc = std::make_unique<CriticalBoost>(std::move(calc));     // その結果を1.5倍
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_decorator.cpp">samples/pattern_decorator.cpp</a>

## C#またはUnityでの実装

C#では `System.IO` の `new BufferedStream(new FileStream(...))` が標準ライブラリのDecoratorの実例です。ゲームでは入れ子オブジェクトより**修飾のリスト**として書くことが多いです(下の変形も参照)。

```csharp
public interface IDamageModifier { int Apply(int damage); }

public class DamagePipeline {
    private readonly List<IDamageModifier> modifiers = new();   // 入れ子の代わりにリスト
    public void Add(IDamageModifier m) => modifiers.Add(m);
    public void Remove(IDamageModifier m) => modifiers.Remove(m);  // バフ切れ = 取り外し
    public int Calc(int baseDamage) {
        int d = baseDamage;
        foreach (var m in modifiers) d = m.Apply(d);
        return d;
    }
}
```

## ゲームでの具体例

- バフ・デバフによるステータス/ダメージ修飾(最頻出)
- 武器の改造パーツ(サイレンサー→音量修飾、拡張マガジン→装弾数修飾)
- ストリームの加工(圧縮+暗号化してセーブ → C#のStream構成そのまま)

## 利点

- 機能の組み合わせが実行時に自由(クラス数は機能の**和**)
- 各修飾が独立したクラスに凝集(1バフ=1クラス、[SRP](/design/solid/srp.html))
- 元のクラス(BaseDamage)は無変更([OCP](/design/solid/ocp.html))

## 欠点

- 小さいクラスが大量にでき、**実行時の実体が入れ子で追いにくい**(デバッガで見ると玉ねぎ)
- 適用順で結果が変わる(+10→×1.5 と ×1.5→+10 は別の値)。順序の管理は結局自分でルール化が必要
- 同一性の問題: 包んだ後の `this` は元のオブジェクトではない(比較・キャストで罠)

## 適用条件

- 追加機能が**組み合わせで**効く(バフが複数同時に乗る)
- 実行時に付け外しがある(時限バフ)
- 元クラスを変更できない・したくない

## 避けるべき条件

- 修飾が1種類か、排他的(同時に1つ)→ ただの分岐かStrategyで十分
- 適用順のルールが複雑(「乗算は全加算の後」等)→ 入れ子の順序に任せず、**フェーズ分けした計算式**(全加算を合計→全乗算を合計→適用)の方が仕様に忠実になりやすい([ケーススタディ: ダメージ計算](/design/case-studies/damage-calculation.html))

## 似たパターンとの違い

- [Proxy](/design/patterns/proxy.html): 同じ「包む」でも目的がアクセス制御・遅延で、機能追加ではない
- [Composite](/design/patterns/composite.html): 子が複数(集合)か、内側が1つ(修飾)か
- [Chain of Responsibility](/design/patterns/chain-of-responsibility.html): 鎖のどこかが**処理して止まる**。Decoratorは**全員が処理に参加**する
- [Strategy](/design/patterns/strategy.html): 中身の**交換**(1つ選ぶ)vs 外への**積み増し**(複数重ねる)

## 実務でよく見かける変形

- **修飾リスト方式**(上のC#例): ゲームのバフ処理はほぼこちら。付け外し・イテレーション・UI表示が楽
- 関数合成版: `std::function<int(int)>` を合成していく軽量形

## 過剰設計になる例

「ログ出力を足すかもしれない」とすべてのマネージャをDecorator対応にする——実際に重ねる修飾が現れるまで、包む仕組みは不要です。

## 関連項目

- [Strategy](/design/patterns/strategy.html) / [Proxy](/design/patterns/proxy.html) / [Chain of Responsibility](/design/patterns/chain-of-responsibility.html)
- [ケーススタディ: ダメージ計算](/design/case-studies/damage-calculation.html) / [ステート異常](/design/case-studies/status-effects.html)

## 理解度チェック

1. Decoratorがクラス爆発を「積から和」に変える仕組みは?
2. 入れ子方式とリスト方式、バフ管理にはどちらが向くことが多い? 理由は?
3. 適用順の問題に対して、Decoratorの入れ子より仕様に忠実な代替は?

## 演習

「攻撃力+10(装備)」「攻撃力1.2倍(バフ、10秒)」「クリティカル時2倍」の3修飾を、リスト方式のパイプラインで実装してください。その後「乗算系は加算系の後にまとめて適用」という仕様変更に対応し、入れ子Decoratorだったら何が起きたか考察してください。

---

関連項目：[Composite](/design/patterns/composite.html) / [学習ガイド](/design/patterns/) / [Facade](/design/patterns/facade.html)
