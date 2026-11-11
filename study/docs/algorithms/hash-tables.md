---
title: ハッシュテーブル — 同じ場所に来たキーをどう探すか
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: ハッシュと等値比較の役割を分け、衝突、削除済みの印、負荷率、再ハッシュを図とリソースキャッシュの例で追う。
  aliases: [hash table, ハッシュテーブル, ハッシュ表, ハッシュマップ, bucket, バケット, 衝突, chain, オープンアドレス法, tombstone, 負荷率, rehash, unordered_map, Dictionary]
  verification: C++の順不同連想コンテナ、.NETのDictionary、CPythonの削除済みスロットの公式資料に照合し、C++20の例を実行（2026-11-06）
---

# ハッシュテーブル — 同じ場所に来たキーをどう探すか

ゲームで読み込んだテクスチャを、アセットIDを使って探すとします。**ハッシュテーブル**は、キーから計算した整数を使って探し始める場所を絞り、そこで候補のキーを比較します。例えば表が7枠なら、説明用の規則として `key % 7` を開始位置にできます。10、17、24はすべて添字3から探すので、同じ場所に来た候補を区別する処理が必要です。

## ハッシュで場所を絞り、等値比較で見つける

ハッシュ関数が返す**ハッシュ値**と、表の中で探し始める**バケット番号**は別の値です。違うハッシュ値でも、表の大きさに合わせて番号を求めた結果、同じバケットを指すことがあります。バケットを絞ったあと、目的のキーと等しいかを等値比較で確かめます。

キーの比較とハッシュには、**等しいと判定する二つのキーには、同じハッシュ値を返す**という契約があります。例えばファイル名を大文字・小文字を区別せずに比較するなら、ハッシュも同じ規則に合わせます。格納中のキーについて、等値比較やハッシュに使う値は変えずに扱います。[C++規格草案の順不同連想コンテナ](https://eel.is/c++draft/unord.req.general) · [.NETのDictionary](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2)

## 衝突した候補をチェインに置くか、表の中で探すか

**チェイン法**では、各バケットに入った要素をそのバケットから順にたどれます。例えば3番のバケットなら10、17、24を順に比較して探します。チェインはポインターでノードをつないだり、配列内の次の添字を保持したりして実装できます。

**オープンアドレス法**では、すべての要素を表の枠に置きます。衝突したときに次の候補を調べることを**プローブ**と呼びます。線形プローブの例では、開始位置から1枠ずつ進み、末尾の次は先頭へ戻ります。10、17、24をこの順に入れると、添字3、4、5を使います。

<figure class="study-figure">
  <img src="/images/algorithms/hash-tables.svg" alt="キー10、17、24の開始位置はいずれも添字3。チェイン法ではバケット3の候補を10、17、24とたどる。線形プローブでは17を削除した後も添字4に削除済みの印を残すので、添字5の24まで検索を続けられる。" width="760" height="390" loading="lazy">
  <figcaption>24の検索は、3番の10と4番の削除済みの印を通り、5番で一致します。<a href="/study/images/algorithms/hash-tables.svg" target="_blank" rel="noopener noreferrer">衝突とプローブの図を拡大</a></figcaption>
</figure>

### 削除済みの印と空欄を区別する

この線形プローブ方式で17を消すとき、添字4を最初から空いていた枠と同じ状態にすると、24の探索が添字4で止まり、5にある24を見落とします。削除済みの枠には **tombstone（墓標）** と呼ぶ印を残せます。

| 検索中に見た枠 | 次の動き |
| --- | --- |
| 使用中 | キーが等しければ発見。異なれば進む |
| 削除済み | その枠にあった要素は消えているが、後ろに候補があるため進む |
| 未使用 | 挿入でもここまでに配置できたはずなので、検索を打ち切る |

一周しても一致がなければ、検索を終えます。新規挿入時は削除済みの枠を候補として覚え、同じキーが先に格納されていないか調べたうえで使います。この表では削除済み印が増えても検索が続くため、ライブな件数に加え、削除済みを含む枠の占有も調整の手掛かりになります。実装例として、CPythonの辞書は削除済みを `DKIX_DUMMY` として区別します。[CPythonの辞書実装](https://github.com/python/cpython/blob/v3.14.0/Objects/dictobject.c)

## 負荷率と再ハッシュ

**負荷率**は、要素数をバケット数または枠数で割った値です。チェイン法で1を超えると、バケット当たり平均1件より多い状態です。オープンアドレス法では、表が埋まるにつれて空き枠に届くまでのプローブが長くなりやすくなります。

バケット数を変えると、同じキーでも格納先が変わります。**再ハッシュ**では、格納中の要素を新しい表の対応する位置へ移します。オープンアドレス法では、削除済みの印を取り除くために表を作り直すこともあります。分布と負荷を管理できる条件では、検索は平均 O(1) が目安です。衝突が一箇所に集中すれば、検索は最悪 O(n) です。ここでの計算量はハッシュ計算とキーの比較を1操作として数えています。長い文字列をキーにすると、ハッシュ計算と比較にも時間がかかります。[C++規格草案の検索・再ハッシュの規定](https://eel.is/c++draft/unord.req.general)

## 反復順と無効化はコンテナごとに確認する

| コンテナ | 反復順と変更時の扱い |
| --- | --- |
| C++ `std::unordered_map` | キーの整列順や挿入順は保証されない。再ハッシュでイテレーターは無効になるが、残る要素への参照とポインターは保たれる |
| .NET `Dictionary<TKey,TValue>` | 列挙順は契約で定められていない。列挙中に新しい要素を追加すると列挙子は無効になる。.NET Core 3.0以降の `Remove` と `Clear` は、列挙子が保たれる例外 |

再現性のために順序が必要なら、キーを整列した列を作るか、順序を維持する[探索木](/algorithms/search-trees.html)などを使います。[C++規格草案のイテレーターと参照](https://eel.is/c++draft/unord.req.general) · [.NETのDictionary](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2) · [.NETのDictionary列挙子](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2.enumerator?view=net-10.0)

## リソースキャッシュのキーを作る

同じ画像でも、色用のsRGBテクスチャと計算用の線形テクスチャは、別のリソースとして読み分けることがあります。このC++20例では、IDと色空間の両方を等値比較とハッシュに入れます。値は説明用のテクスチャハンドルです。[ゲームのアセットロード](/game/asset-loading.html)

```cpp
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <unordered_map>

struct TextureKey {
    std::uint32_t assetId;
    bool srgb;

    bool operator==(const TextureKey&) const = default;
};

struct TextureKeyHash {
    std::size_t operator()(const TextureKey& key) const noexcept {
        const auto packed = static_cast<std::uint64_t>(key.assetId) * 2 + key.srgb;
        return std::hash<std::uint64_t>{}(packed);
    }
};

int main() {
    std::unordered_map<TextureKey, int, TextureKeyHash> cache;
    const TextureKey color{42, true};
    const TextureKey linear{42, false};
    cache.emplace(color, 7);
    cache.emplace(linear, 8);
    assert(cache.at(color) == 7);
    assert(cache.at(linear) == 8);
}
```

画像を作り直す条件に圧縮形式やミップの設定も含まれるなら、それらも同じキーの契約に反映します。テーブルから消す時点と、GPUがテクスチャを使い終えて解放できる時点は、それぞれ管理します。[GPUリソースの寿命](/graphics/optimization/gpu-resource-lifetime.html)
