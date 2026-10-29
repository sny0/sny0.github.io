---
title: "抽象化・カプセル化・情報隠蔽"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "抽象化(abstraction): 使う側にとって重要なことだけを残し、詳細を削ぎ落とすこと。「何をするか」を残し「どうやるか」を消す。 カプセル化(encapsulation): データとそれを操作するコードを1つにまとめること。"
---

# 抽象化・カプセル化・情報隠蔽

## 一言で言うと

- **抽象化(abstraction)**: 使う側にとって重要なことだけを残し、詳細を削ぎ落とすこと。「何をするか」を残し「どうやるか」を消す。
- **カプセル化(encapsulation)**: データとそれを操作するコードを1つにまとめること。
- **情報隠蔽(information hiding)**: 変わりそうな決定(内部表現・アルゴリズム)を外から見えなくすること。

3つは混同されがちですが、**カプセル化はまとめる話、情報隠蔽は見せない話、抽象化は考えなくて済むようにする話**です。

## 解決したい問題

内部の決定(データの持ち方、計算方法)が外部に見えていると、**内部を変えただけで利用側が全部壊れる**。利用側が知るべきことが多いと、**使うたびに全詳細を理解する必要がある**。

## 問題のある実装

```cpp
// C++20(問題例)
struct Inventory {
    // 内部表現がむき出し。「配列で持つ」という決定に全利用者が依存する
    std::vector<int> itemIds;
    std::vector<int> counts;   // itemIds[i]の個数がcounts[i]、という暗黙の対応
};

// 利用側のあちこちにこういうコードが書かれる
void AddPotion(Inventory& inv) {
    for (std::size_t i = 0; i < inv.itemIds.size(); ++i) {
        if (inv.itemIds[i] == 42) { inv.counts[i]++; return; }
    }
    inv.itemIds.push_back(42);
    inv.counts.push_back(1);
}
```

## 何が問題になるか

- 「2本のvectorの対応関係」という**約束事を全利用者が守る**必要がある。1か所でも崩すとデータ破損。
- 内部を `std::unordered_map<int,int>` に変えたくなったら、**全利用箇所を書き換え**。
- 「上限チェック」「所持イベント通知」を追加したくても、追加し忘れる利用箇所が必ず出る。

## 改善した実装

```cpp
// C++20
#include <unordered_map>

class Inventory {
public:
    // 「何ができるか」だけを公開(抽象化されたインターフェース)
    void Add(int itemId, int count = 1) {
        counts_[itemId] += count;      // ルール(上限、通知)を将来ここに足せる
    }
    bool Remove(int itemId, int count = 1) {
        auto it = counts_.find(itemId);
        if (it == counts_.end() || it->second < count) return false;
        it->second -= count;
        if (it->second == 0) counts_.erase(it);
        return true;
    }
    int CountOf(int itemId) const {
        auto it = counts_.find(itemId);
        return it == counts_.end() ? 0 : it->second;
    }
private:
    std::unordered_map<int, int> counts_;  // 内部表現は隠蔽。いつでも変えられる
};
```

- **カプセル化**: データ(counts_)と操作(Add/Remove)が1つのクラスにまとまった。
- **情報隠蔽**: 「mapで持つ」という決定は private に隠れた。vector2本に戻しても利用側は無傷。
- **抽象化**: 利用側は「追加できる・減らせる・数を聞ける」とだけ考えればよい。

## 何が改善されたか

- 内部表現の変更が Inventory 内で完結する。
- 整合性のルール(負の個数にならない等)を1か所で保証できる。

## 代わりに何を失ったか

- 直接いじるより手数が増えた。単純なデータの入れ物で十分な場面(純粋な設定データなど)では、publicなstructの方が正直で読みやすい。
- getter/setterを機械的に全フィールドに生やすと、**隠蔽したつもりで何も隠せていない**(内部表現と1:1のsetterは実質public)。公開するのは「操作の意図」(Add/Remove)であって「フィールドへのアクセス」ではありません。

## 「漏れる抽象」という限界

抽象化は完全にはなりません。例えば `std::vector` は「伸びる配列」という抽象ですが、伸びるときに要素が**メモリ上で引っ越す**という詳細は、イテレータ無効化という形で漏れてきます(→ [STLコンテナ](/languages/cpp/stl.html))。**抽象の下で何が起きているかをいつでも覗ける**ことが、C++プログラマの強みになります(第6部・第7部)。

## ゲーム開発での例

- 物理エンジンの `Raycast(origin, dir)` は、内部の空間分割構造(→ [Spatial Partition](/game/patterns/optimization-patterns.html))を完全に隠した抽象。
- 「HPを直接いじらせず `TakeDamage()` を通す」ことで、無敵判定・ダメージ軽減・死亡判定のルールを1か所に保てる。

## Unity/C# との対応

- C#の `private` + プロパティが同じ役割。`public int hp;` をインスペクタに出したいがために全部publicにするのは情報隠蔽の放棄です(`[SerializeField] private` を使う)。
- C# には `internal`(アセンブリ内公開)があり、C++にはこれに直接対応するものがない(→ [第9部](/languages/csharp/headers-vs-asmdef.html))。

## Unreal Engine との対応

- `UPROPERTY(EditAnywhere)` 等でエディタ公開とコード上のアクセス制御を別々に指定できます。エディタに見せることとコードに見せることは別の決定です(→ [第10部](/game/unreal/reflection-and-uht.html))。

## よくある誤解

- 「カプセル化 = privateにすること」— privateは手段の一つ。本質は**変わりそうな決定を外に約束しない**ことです。
- 「抽象化 = 基底クラスを作ること」— 継承は抽象化の一手段にすぎません。関数を1つ切り出すのも立派な抽象化です。

## 使う場面 / 使わない場面

- **使う場面**: 整合性ルールがあるデータ(HP、所持金、インベントリ)。内部表現を変える可能性がある部分。利用者が多い部分。
- **使わない場面**: ただのデータの運び屋(POD的なstruct、設定値)。この場合 public メンバの方が意図が明確です(→ [構造体とクラス](/languages/cpp/structs-and-classes.html))。

## 関連項目

- [依存関係と依存の方向](/design/foundations/dependency.html)
- [ポリモーフィズムとインターフェース](/design/foundations/polymorphism-interface.html)
- [構造体・クラス・アクセス指定子](/languages/cpp/structs-and-classes.html)

## 理解度チェック

1. カプセル化と情報隠蔽の違いを一文ずつで言えますか。
2. 「全フィールドにgetter/setterを生やす」ことが情報隠蔽にならないのはなぜですか。
3. 抽象が「漏れる」例を1つ挙げてください。

## 演習

`public float x, y; public float speed;` だけの `Missile` struct に「速度上限」「移動は毎フレームUpdateで」というルールを追加することになりました。どのメンバをどう隠し、何を公開しますか。改善前後のコードを書いてください。

---

前: [依存関係と依存の方向](/design/foundations/dependency.html) | [カテゴリ目次](/design/foundations/) | 次: [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)
