---
title: Proxy
study:
  source: C++ Wiki
  status: published
  summary: あるオブジェクトへのアクセスを制御したい——重いものを必要になるまで作らない(仮想プロキシ)、アクセス権を確認する(保護プロキシ)、遠隔のものを手元にあるように見せる(リモートプロキシ)。利用側には本物と同じインターフェースのまま、間に代理を挟む。
  section: reference
  format: article
  domain: design
---

# Proxy

## 解決する問題

あるオブジェクトへのアクセスを**制御**したい——重いものを必要になるまで作らない(仮想プロキシ)、アクセス権を確認する(保護プロキシ)、遠隔のものを手元にあるように見せる(リモートプロキシ)。利用側には**本物と同じインターフェース**のまま、間に代理を挟む。

## 登場人物と責務

- **Subject**: 本物と代理の共通インターフェース
- **RealSubject**: 本物(重い・遠い・保護したい対象)
- **Proxy**: Subjectを実装し、本物へのアクセスを管理(生成遅延・チェック・転送)

## 最小構成図

```
[利用側] ──> ITexture(Subject)
               ├── RealTexture(本物: 50MBのVRAM)
               └── TextureProxy(代理: パスだけ保持。Draw時に初めて本物をロード)
```

## パターンなしの実装

```cpp
// C++20(問題例)— 全アセットを起動時に全ロード
class Level {
public:
    void Load() {
        for (const auto& path : allTexturePaths_)
            textures_.push_back(LoadTextureFromDisk(path));   // 使うか分からない物も全部
    }
    // ロード時間もメモリも爆発。「使うときにロード」をやりたいが、
    // 利用側に if (!loaded) Load(); を書かせると全箇所に漏れる
};
```

## 問題点

- 起動時間・メモリのピークが全アセット合計になる
- 遅延ロードを利用側の責任にすると、チェック漏れ・ロード競合が散在する

## パターン適用後のC++コード

```cpp
// C++20
#include <memory>
#include <string>

class ITexture {
public:
    virtual ~ITexture() = default;
    virtual void Bind() = 0;      // 描画に使う
    virtual int Width() const = 0;
};

class RealTexture : public ITexture {
public:
    explicit RealTexture(const std::string& path) { /* ディスクからロード(重い) */ }
    void Bind() override { /* GPUにバインド */ }
    int Width() const override { return width_; }
private:
    int width_ = 0;
};

class LazyTextureProxy : public ITexture {     // 仮想プロキシ
public:
    explicit LazyTextureProxy(std::string path) : path_(std::move(path)) {}
    void Bind() override {
        EnsureLoaded();            // 初アクセス時に初めて本物を作る
        real_->Bind();
    }
    int Width() const override {
        const_cast<LazyTextureProxy*>(this)->EnsureLoaded();  // constでも遅延ロードが必要な例。
        return real_->Width();     // 実務ではmutableメンバにするのが素直(ここでは説明のため明示)
    }
private:
    void EnsureLoaded() { if (!real_) real_ = std::make_unique<RealTexture>(path_); }
    std::string path_;
    std::unique_ptr<RealTexture> real_;   // 本物の所有はプロキシ
};
// 利用側は ITexture としか付き合わない。ロード済みかを気にするコードが消える
```

検証済みサンプル: <a href="/study/samples/cpp/pattern_proxy.cpp">samples/pattern_proxy.cpp</a>

## C#またはUnityでの実装

```csharp
// Unityの Addressables の AssetReference は事実上のプロキシ
public class EnemySpawner : MonoBehaviour {
    [SerializeField] private AssetReferenceGameObject enemyRef;  // 実体ではなく参照(軽い)
    public async void Spawn() {
        // 使う瞬間に初めてロード(仮想プロキシの動き)
        GameObject prefab = await enemyRef.LoadAssetAsync<GameObject>().Task;
        Instantiate(prefab);
    }
}
```

UEの `TSoftObjectPtr` も同じ役割(パスだけ保持し、要求時にロード)です(→ [UEのスマートポインタ — TSharedPtr・TUniquePtr・TWeakPtr・TSoftObjectPtr](/game/unreal/smart-pointers.html))。

## ゲームでの具体例

- アセットの遅延ロード/ストリーミング(仮想プロキシ): テクスチャのミップストリーミング、遠景の低LODは「品質を落とした代理」
- ネットワーク対戦のリモートプレイヤー(リモートプロキシ): 入力は向こう、見た目はこちらの代理オブジェクト
- チート対策・権限チェック(保護プロキシ): デバッグコマンドの実行権確認
- 参照カウント・アクセスログなどの横断的処理の挿入

## 利点

- 利用側のコードを変えずに、生成タイミング・アクセス制御を差し込める(インターフェース同一が肝)
- 遅延・キャッシュ・チェックのロジックが1か所に集まる

## 欠点

- 間接層のコスト(呼び出し1段+プロキシの状態管理)
- 「いつ本物が作られるか」が見えにくくなる(初アクセスのスパイク: ゲームでは**フレーム落ちの原因**になるので、事前ロードAPIとの併用が普通)
- インターフェースが大きいと転送メソッドだらけになる

## 適用条件

- 生成・アクセスが高価または制御が必要で、それを利用側から隠したい
- 本物と同じ型として振る舞う必要がある

## 避けるべき条件

- 生成が安価・制御が不要(ただの転送クラスになる)
- 遅延のタイミング制御をゲーム側が細かく管理したい場合、隠蔽が逆に邪魔になる(明示的なロードAPIの方が向く)

## 似たパターンとの違い

- [Decorator](/design/patterns/decorator.html): 同じ「包む」でも、Decoratorは**機能を足す**(何段も重ねる)、Proxyは**アクセスを管理する**(通常1枚)
- [Adapter](/design/patterns/adapter.html): インターフェースを**変える**。Proxyは**同じまま**
- [Facade](/design/patterns/facade.html): 多数のクラスへの新しい窓口。Proxyは1つの対象の代理

## 実務でよく見かける変形

- スマートポインタは「ポインタのプロキシ」(`unique_ptr` は所有管理を差し込む → [スマートポインタ](/languages/cpp/smart-pointers.html))
- ハンドルシステム: 生ポインタの代わりに世代付きID(ハンドル)を配り、使用時に解決する——danglingを防ぐ保護プロキシ的構造(→ [Object Pool](/game/patterns/object-pool.html))

## 過剰設計になる例

数KBの設定データに遅延ロードプロキシを被せる——起動時に読めば済むものへの遅延化は、初アクセスのスパイクという欠点だけ持ち込みます。

## 関連項目

- [Decorator](/design/patterns/decorator.html) / [Adapter](/design/patterns/adapter.html) / [Flyweight](/design/patterns/flyweight.html)
- [スマートポインタ](/languages/cpp/smart-pointers.html) / [TSoftObjectPtr](/game/unreal/smart-pointers.html)

## 理解度チェック

1. ProxyとDecoratorの目的の違いは?
2. 仮想プロキシの「初アクセスのスパイク」はゲームで何を引き起こし、どう緩和しますか?
3. スマートポインタをProxyとみなせる理由は?

## 演習

「ボイスライン(数百ファイル、合計2GB)」の再生システムを設計してください。要件: メモリ上限256MB、再生要求から遅延なく鳴らしたいものと、多少の遅延が許されるものがある。プロキシ+事前ロードAPIの組み合わせで、どのボイスをどちらで扱うか方針を書いてください。

---

関連項目：[Flyweight](/design/patterns/flyweight.html) / [学習ガイド](/design/patterns/) / [Chain of Responsibility](/design/patterns/chain-of-responsibility.html)
