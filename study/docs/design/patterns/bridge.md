---
title: "Bridge"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "独立に変化する2つの軸(抽象=何をするか/実装=どうやるか)を1つの継承階層に押し込むと、組み合わせの数だけクラスが爆発する。2軸を別々の階層に分け、参照(橋)で繋ぎたい。"
---

# Bridge

## 解決する問題

**独立に変化する2つの軸**(抽象=何をするか/実装=どうやるか)を1つの継承階層に押し込むと、組み合わせの数だけクラスが爆発する。2軸を別々の階層に分け、参照(橋)で繋ぎたい。

## 登場人物と責務

- **Abstraction**: 上位の概念の階層(例: UIウィジェットの種類)。Implementorへの参照を持つ
- **RefinedAbstraction**: Abstractionの派生(ボタン、スライダー)
- **Implementor**: 実装側のインターフェース(例: 描画バックエンド)
- **ConcreteImplementor**: 具体実装(DirectX描画、テキスト描画)

## 最小構成図

```
Widget階層(何を)            Renderer階層(どうやって)
  Widget ────────橋(参照)────────> IRenderer
   ├ Button                        ├ GpuRenderer
   └ Slider                        └ DebugTextRenderer
組み合わせはクラスではなく「参照の差し替え」で表現
```

## パターンなしの実装

```cpp
// C++20(問題例)— 2軸を1階層に押し込むと積で増える
class Button { /* ... */ };
class GpuButton : public Button {};        // ボタン×GPU描画
class DebugTextButton : public Button {};  // ボタン×デバッグ文字描画
class GpuSlider;        // スライダー×GPU
class DebugTextSlider;  // スライダー×文字
// ウィジェット5種 × 描画3種 = 15クラス。軸の追加で掛け算が育つ
```

## 問題点

- クラス数が2軸の**積**で増える
- 同じ描画コードが各ウィジェット派生に複製される
- 実行時に描画方式を切り替えられない(型に焼き付いている)

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>
#include <string>

// Implementor: 「どうやって描くか」の軸
class IRenderer {
public:
    virtual ~IRenderer() = default;
    virtual void DrawRect(float x, float y, float w, float h) = 0;
    virtual void DrawText(const std::string& text, float x, float y) = 0;
};
class GpuRenderer : public IRenderer {
public:
    void DrawRect(float, float, float, float) override { /* GPU描画 */ }
    void DrawText(const std::string&, float, float) override { /* GPU文字 */ }
};
class DebugTextRenderer : public IRenderer {
public:
    void DrawRect(float, float, float, float) override { /* コンソールに記号 */ }
    void DrawText(const std::string&, float, float) override { /* コンソール出力 */ }
};

// Abstraction: 「何を描くか」の軸。Rendererへの参照が「橋」
class Widget {
public:
    explicit Widget(IRenderer& renderer) : renderer_(renderer) {}
    virtual ~Widget() = default;
    virtual void Draw() = 0;
protected:
    IRenderer& renderer_;   // 橋。所有せず参照(描画系の寿命はアプリが管理)
};

class Button : public Widget {
public:
    using Widget::Widget;
    void Draw() override {
        renderer_.DrawRect(0, 0, 100, 30);
        renderer_.DrawText("OK", 40, 8);
    }
};
// ウィジェット5種 + 描画3種 = 8クラス(積が和になる)
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_bridge.cpp">samples/pattern_bridge.cpp</a>

## C#またはUnityでの実装

```csharp
public interface IHapticsBackend { void Pulse(float strength, float duration); }
public class PsHaptics : IHapticsBackend { public void Pulse(float s, float d) { /* DualSense */ } }
public class GenericRumble : IHapticsBackend { public void Pulse(float s, float d) { /* XInput */ } }

// 「振動演出の種類」階層は、バックエンド階層への参照(橋)を持つ
public abstract class HapticEffect {
    protected readonly IHapticsBackend backend;
    protected HapticEffect(IHapticsBackend backend) { this.backend = backend; }
    public abstract void Play();
}
public class ExplosionHaptic : HapticEffect {
    public ExplosionHaptic(IHapticsBackend b) : base(b) {}
    public override void Play() { backend.Pulse(1f, 0.3f); /* 減衰など演出はここ */ }
}
```

## ゲームでの具体例

- ウィジェット種類 × 描画バックエンド(上の例。UIフレームワークの古典的用途)
- 演出の種類 × プラットフォーム機能(振動、LED、実績)
- AIの行動 × 移動方式(地上/飛行/水中): 行動階層が移動インターフェースへの橋を持つ

## 利点

- クラス数が積から和になる
- 2軸を独立に拡張・変更できる(描画方式の追加でウィジェットは無変更)
- 実行時に実装側を差し替えられる

## 欠点

- 事前に「2軸である」と見抜く必要がある(軸の切り方を誤ると再設計)
- 間接参照が1枚入り、単純な階層より追いにくい
- 軸が1つしか変化しないなら、ただの回り道

## 適用条件

- 独立に変化する2軸が**実際に確認できる**(両軸とも2種類以上ある、または追加が確定)
- 実装側を実行時に切り替えたい

## 避けるべき条件

- 軸が1つ(普通のポリモーフィズムで十分)
- 「いつか2軸になるかも」の段階(→ [YAGNI](/design/foundations/yagni-kiss-dry.html)。2軸目が現れてから分離しても間に合う)

## 似たパターンとの違い

- [Adapter](/design/patterns/adapter.html): 既存の合わないものを事後に繋ぐ。Bridgeは**設計時から**分離を計画する
- [Strategy](/design/patterns/strategy.html): 構造はほぼ同じ(振る舞いを参照で差し替え)。違いは意図——Strategyは「アルゴリズムの交換」、Bridgeは「抽象階層と実装階層の分離」。Strategyの参照先が階層を持ち、参照元も階層を持つとBridgeと呼べる形になる
- [Abstract Factory](/design/patterns/abstract-factory.html): Bridgeの実装側一族を生成する係として併用されることがある

## 実務でよく見かける変形

- pimplイディオム(ポインタで実装を隠す)は「コンパイル依存を切る」目的のBridgeの縮退形とよく説明される(→ [翻訳単位とヘッダー](/runtime/cpp-internals/translation-units-and-headers.html))
- レンダリング抽象化層(RHI: UEのRender Hardware Interface)は大規模なBridge(→ 実装軸: D3D12/Vulkan/Metal)

## 過剰設計になる例

モバイル専用タイトルで「描画バックエンドの軸」を用意する(実装は永遠にOpenGL ES 1つ)——2軸目が存在しないBridgeは、全コードに間接参照を強いるだけです。

## 関連項目

- [Strategy](/design/patterns/strategy.html) / [Adapter](/design/patterns/adapter.html)
- [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)

## 理解度チェック

1. Bridgeが解決する「クラス爆発」はどんな掛け算で起きますか。
2. StrategyとBridgeの違いは構造ではなく何にありますか。
3. Bridgeを導入すべきでないのはどんな状況ですか。

## 演習

「エフェクト(爆発/回復/バフ)× 表示品質(高品質/簡易/オフ)」という2軸の要件を、(a) 単一継承階層、(b) Bridge、で設計し、「新エフェクト追加」「品質モード追加」それぞれの変更コストを比較してください。

---

前: [Adapter](/design/patterns/adapter.html) | [カテゴリ目次](/design/patterns/) | 次: [Composite](/design/patterns/composite.html)
