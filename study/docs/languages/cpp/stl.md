---
title: "STLコンテナ・イテレータ・アルゴリズム・ranges"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "STL(標準テンプレートライブラリ)は「コンテナ(入れ物)」「イテレータ(位置)」「アルゴリズム(処理)」を分離した設計で、任意の組み合わせで使えます。C#のSystem.Collections.Generic+LINQに相当しますが、実行時コストの見え方が大きく違います。"
---

# STLコンテナ・イテレータ・アルゴリズム・ranges

## 一言で言うと

STL(標準テンプレートライブラリ)は「**コンテナ(入れ物)**」「**イテレータ(位置)**」「**アルゴリズム(処理)**」を分離した設計で、任意の組み合わせで使えます。C#のSystem.Collections.Generic+LINQに相当しますが、**実行時コストの見え方**が大きく違います。

## 主要コンテナと使い分け

| コンテナ | 構造 | 得意 | 苦手 | ゲームでの用途 |
|---|---|---|---|---|
| `vector<T>` | 連続配列 | 末尾追加、走査(キャッシュ最強)、添字 | 先頭・中間の挿入削除 | **既定。9割これ** |
| `array<T,N>` | 固定長配列 | スタック配置、サイズ静的 | サイズ変更不可 | 固定スロット(装備欄) |
| `deque<T>` | ブロック連結 | 両端追加 | 中間操作、局所性はvector以下 | キュー実装の下請け |
| `list<T>` | 双方向リスト | 中間挿入削除(位置既知) | 走査(キャッシュ最悪)、添字なし | ほぼ出番なし(思ったより遅い) |
| `unordered_map<K,V>` | ハッシュ表 | キー検索 平均O(1) | 順序なし、ハッシュコスト、局所性 | ID→データ表 |
| `map<K,V>` | 赤黒木 | ソート済み走査、範囲検索 | 検索はunordered_mapより遅め | 順序が要る辞書 |
| `unordered_set` / `set` | 上と同様 | 存在チェック | 同上 | 訪問済み管理 |
| `priority_queue` | ヒープ | 最大/最小の取り出し | それ以外 | A*のオープンリスト |

**選び方の実践**: 迷ったらvector。「検索が多いからmap」の前に、**要素数が少なければ(目安〜数十)vectorの線形検索の方が速い**ことが多い(キャッシュの勝利 → [Data Locality](/game/patterns/optimization-patterns.html))。計測で決める。

## イテレータ

「コンテナ内の位置」の抽象で、ポインタのように動きます(→ [Iterator](/design/patterns/iterator.html))。

```cpp
// C++20
std::vector<int> v{1, 2, 3};
for (auto it = v.begin(); it != v.end(); ++it) { /* *itで要素 */ }
for (int x : v) { }   // range-for(内部でbegin/endを使う糖衣)
```

### 最重要注意: イテレータ無効化

| 操作 | 無効になるもの |
|---|---|
| vectorのpush_back(再確保時) | **全**イテレータ・参照・ポインタ |
| vectorのerase | 削除点以降すべて |
| unordered_mapのinsert(リハッシュ時) | 全イテレータ(参照は有効) |
| map/list/setの挿入 | なし(削除はその要素のみ) |

```cpp
// 頻出事故: 走査しながら削除
for (auto it = enemies.begin(); it != enemies.end(); ) {
    if (it->IsDead()) it = enemies.erase(it);   // eraseは次の有効イテレータを返す
    else ++it;
}
// C++20ならこれで済む:
std::erase_if(enemies, [](const Enemy& e) { return e.IsDead(); });
```

## アルゴリズム

```cpp
#include <algorithm>
#include <numeric>

std::sort(v.begin(), v.end(), [](const Enemy& a, const Enemy& b) { return a.hp < b.hp; });
auto it = std::find_if(v.begin(), v.end(), [](const Enemy& e) { return e.IsBoss(); });
int total = std::accumulate(dmg.begin(), dmg.end(), 0);
auto& top = *std::max_element(v.begin(), v.end(), byScore);
```

- 手書きループより意図が明確(「これはソートだ」と一語で伝わる)+ 実装がテスト済み
- **テンプレート+ラムダはインライン化される**ため、qsortのような関数ポインタ版より速いことが多い(→ [テンプレート](/languages/cpp/templates-and-concepts.html))

## ranges(C++20)

イテレータのペア渡しを廃し、コンテナ(範囲)を直接渡す+パイプ合成ができる新流儀です。

```cpp
// C++20 ranges(GCC 10+/MSVC 16.10+。検証環境GCC 9.2では未検証 — 構文はcppreference準拠)
#include <ranges>

std::ranges::sort(enemies, {}, &Enemy::hp);          // 射影: hpでソート(ラムダ不要)

// ビューの合成(遅延評価: この行ではまだ何も計算されない)
auto strongAlive = enemies
    | std::views::filter([](const Enemy& e) { return !e.IsDead(); })
    | std::views::take(5);
for (const auto& e : strongAlive) { /* 走査時に初めてfilterが動く */ }
```

- **ビューはコピーを作らない**(LINQと似た遅延評価だが、ヒープ確保もしない)
- 注意: ビューは元のコンテナへの参照を持つ——元より長生きさせるとdangling(string_viewと同じ罠)

## C#との違い(LINQとの比較が誤解の源)

| | C# LINQ | C++ ranges/algorithm |
|---|---|---|
| 遅延評価 | あり | ビューはあり |
| ヒープ確保 | **列挙子などでAllocが発生しがち**(Unityで嫌われる理由) | ビューはゼロAlloc。ToVector相当をしない限り確保なし |
| 実行速度 | デリゲート呼び出し(インライン化は限定的) | ラムダがインライン化(手書きループ相当まで最適化されうる) |
| 辞書の既定 | Dictionary(挿入順は保証されない) | unordered_map(順序不定を明示した名前) |

**「LINQは重いから禁止」というUnityの経験則をC++ rangesにそのまま当てはめない**こと。コスト構造が違います(それでも計測は必要)。

## Unity開発者が誤解しやすい点

1. `List<T>` はC++の `std::list` ではなく **`std::vector`** に対応(C++のlistは連結リスト)。名前の罠の代表
2. `Dictionary<K,V>` ≒ `unordered_map`。ただしC++版は要素へのポインタ・参照が(リハッシュ後も)有効という違いがある
3. `v[i]` は範囲チェックなし(C#は例外)。デバッグ時は `at()` や各実装のデバッグイテレータ(MSVCの `_ITERATOR_DEBUG_LEVEL` 等)を活用
4. foreachでの削除はC#では例外、C++では**未定義動作**(黙って壊れる)

## ゲーム開発での使用例

- エンティティリスト: `vector<unique_ptr<Entity>>` or プール+ハンドル
- ID→マスタデータ: `unordered_map<ItemId, ItemData>`(ロード時構築、実行中は読み取りのみ)
- ソート付きスコアボード: `vector`+`sort`(挿入のたびsetを使うより、まとめてsortが速いことが多い)
- A*: `priority_queue`+`unordered_set`

## 使う場面 / 使わない場面

- STLは**既定で使う**。自作コンテナはSTLで測って足りないと分かってから(固定容量vector、侵入型リスト等のゲーム特化コンテナはエンジン規模で登場)
- リアルタイム性がシビアな箇所では、**確保が起きる操作**(push_backの再確保、mapのノード確保)をフレーム中に置かない設計にする(事前reserve、プール → [allocator](/runtime/memory/allocators-and-pools.html))

## よくある誤解

- 「STLは遅い(ゲームでは使わない)」— 90年代〜EASTL時代の記憶の残響。現代の実装は高品質で、まず使って計測が正解。ただし**デバッグビルドが遅い**のは事実(→ [Debug/Release](/tools/build/build-configurations.html))
- 「listは挿入が速いから有利」— 挿入位置に到達する走査が遅く、キャッシュ的にほぼ常にvectorが勝つ。計測すると驚くやつ

## 関連項目

- [配列と文字列](/languages/cpp/arrays-and-strings.html) / [Iterator](/design/patterns/iterator.html) / [Data Locality](/game/patterns/optimization-patterns.html)
- [判断ガイド: 配列かvectorか](/design/decisions/cpp-choices.html)

## 理解度チェック

1. vectorのイテレータ無効化はいつ起き、何が無効になりますか。
2. C#のList/DictionaryはC++の何に対応しますか(名前の罠込みで)。
3. 「検索が多いならmap」が早計である理由は?

## 演習

samples/stl_basics.cpp(検証済み)で、(a) erase_ifによる安全な走査中削除、(b) sort+ラムダ、(c) unordered_mapの構築と検索を確認してください。時間があれば要素数を変えてvector線形検索とunordered_map検索の速度を比較してください。

---

前: [スマートポインタ](/languages/cpp/smart-pointers.html) | [カテゴリ目次](/languages/cpp/) | 次: [未定義動作・実装定義・未規定動作](/languages/cpp/undefined-behavior.html)
