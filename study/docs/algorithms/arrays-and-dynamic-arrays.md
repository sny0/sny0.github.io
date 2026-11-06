---
title: 配列と動的配列 — 添字、容量、再確保
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: algorithms
  summary: 要素が連続する配列で、添字から位置が分かる理由と、動的配列の容量拡張にかかる処理を調べる。
  aliases: [配列, 動的配列, array, dynamic array, std::vector, List<T>, size, capacity, reserve, 償却計算量, 再確保, イテレータ無効化]
  verification: C++作業草案とMicrosoft Learnに照合し、C++20の例をMSVCで実行（2026-11-06）
---

# 配列と動的配列 — 添字、容量、再確保

ゲーム中の弾を毎フレーム更新するなら、弾の位置と速度を順に読み出せる形で持っておくと都合がよくなります。**配列**は同じ型の要素をメモリ上に連続して並べます。**動的配列**はこの配置を保ったまま、要素が増えると必要に応じて大きい領域へ移ります。

## 添字から位置を計算する

0から始まる添字 `i` の要素は、先頭から `i × sizeof(T)` バイト先にあります。たとえば1要素4バイトなら、添字3の要素は先頭から12バイト先です。C++で有効範囲内の位置を表すなら `data + i` で、前の要素を一つずつたどる必要がありません。範囲は要素数を `n` とすると `0 ≤ i < n` です。[C++の配列型](https://eel.is/c++draft/dcl.array) · [C++のポインタ加算](https://eel.is/c++draft/expr.add)

C++の `T[N]` や `std::array<T, N>` は長さが固定です。`std::vector<T>` は要素数を変えられ、通常の `T` では要素を連続して置きます。`std::vector<bool>` は特殊化で、この配置の保証がありません。C#の `T[]` も長さが固定で、`List<T>` は内部の配列を取り替えられます。`List<Enemy>` の `Enemy` がクラスなら、並ぶのはオブジェクトへの参照です。オブジェクト本体の位置まで連続するとは限りません。[C++のstd::array](https://eel.is/c++draft/array#array.overview) · [C++のstd::vector](https://eel.is/c++draft/vector.overview) · [MicrosoftのListクラスの実装](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/List.cs)

## 要素数と容量を分ける

動的配列がいま持つ要素の数はC++では `size()`、C#では `Count` です。**容量**は、今の領域で収められる要素の上限で、`capacity()` または `Capacity` で調べられます。たとえば要素数3、容量4なら、添字で使えるのは0〜2です。末尾への追加は空いている1枠を使えます。[C++のvector.capacity](https://eel.is/c++draft/vector.capacity) · [MicrosoftのList.Capacity](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.capacity)

<figure class="study-figure">
  <img src="/images/algorithms/arrays-and-dynamic-arrays.svg" alt="4枠にAからDが入った状態でEを追加する。8枠の新しい領域にAからDを移し、続けてEを入れる。追加後は要素数5、容量8で、3枠が空いている。" width="760" height="320" loading="lazy">
  <figcaption>容量を4から8に増やすモデルです。移動後も元の要素の並びを保ちます。<a href="/study/images/algorithms/arrays-and-dynamic-arrays.svg" target="_blank" rel="noopener noreferrer">配列の拡張図を拡大</a></figcaption>
</figure>

容量が足りないときは、新しい領域を確保し、既存の要素を移してから追加します。たとえば容量を倍にするモデルで最初の容量が1なら、9個目までの追加で既存要素を移す回数は `1 + 2 + 4 + 8 = 15` 回です。一般に、幾何的に増やした場合は、空から `n` 個を末尾に追加する間の移動回数が合計 `O(n)` に収まります。これを1回あたりに均して **償却 `O(1)`** と呼びます。容量を拡張する1回に限れば、全要素を移す `O(n)` の処理が発生します。`std::vector` は末尾への単一追加の償却定数時間を保証しますが、倍増という比率は指定していません。[C++のvector.overview](https://eel.is/c++draft/vector.overview) · [MicrosoftのList.Add](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.add?view=net-10.0)

## 操作にかかる仕事

`n` を操作前の要素数とし、要素1個の構築、移動、破棄を定数時間として数えます。

| 操作 | かかる仕事 |
| --- | --- |
| 添字 `i` で読む・書く | 位置を計算してアクセスする。`O(1)` |
| 末尾へ1個追加 | 空きがあれば `O(1)`。拡張する回は `O(n)` |
| 位置 `i` に1個挿入 | 再確保がなければ後ろの `n − i` 個をずらす。再確保があれば全体の移動がかかる |
| 位置 `i` を1個削除し、順序を保つ | 後ろの `n − i − 1` 個を詰める。先頭付近なら `O(n)`、末尾なら `O(1)` |
| 全要素を先頭から走査 | 要素数に比例して `O(n)`。連続した領域を順に読み出せる |

同じ `O(n)` の走査でも、連続した小さい値なら同じキャッシュラインに複数要素が入る場合があります。弾やパーティクルのように、全部を順に処理する場面と相性がよい理由です。[データ局所性](/game/patterns/optimization-patterns.html)

## 追加・削除のあとに、どの参照が使えるか

- **C++の `std::vector`** で再確保が起きると、元の要素へのポインター・参照・イテレーターと、旧 `end()` が無効になります。再確保しない挿入では挿入位置より前が有効で、挿入位置以降は旧 `end()` も含めて無効です。再確保しない末尾追加なら既存要素を参照し続けられますが、`end()` は取り直します。`erase` では削除位置以降を指していたイテレーター・参照が無効になります。添字で持ち直しても、途中で挿入や削除があれば同じ要素を指すとは限りません。[C++のvector.modifiers](https://eel.is/c++draft/vector.modifiers)
- **C#の `List<T>`** では、`list[i]` が返すのは `T` の値です。`T` が構造体なら構造体の値を、クラスなら同じオブジェクトへの参照をコピーします。コピーした値や参照は、リストの内部配列が拡張されたあとも使えます。`foreach` が使う列挙子は、要素の追加・削除や添字での置き換えで無効になり、次の `MoveNext()` で `InvalidOperationException` が発生します。`CollectionsMarshal.AsSpan` で内部配列を見ている間は、要素の追加や削除、容量の変更を避けます。[MicrosoftのList.Enumerator.MoveNext](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.enumerator.movenext?view=net-10.0) · [MicrosoftのCollectionsMarshal.AsSpan](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.collectionsmarshal.asspan)

## 弾の状態をまとめて更新する例

次のC++20例では、更新フェーズで全要素を1回ずつ訪ね、そのあと画面外の弾をまとめて除きます。`reserve(128)` は容量を少なくとも128へ増やし、その時点の要素数は0のままです。`resize(128)` は要素数を128へ変えます。C#でも `new List<Bullet>(128)` の128は初期容量を表し、`Count` は0です。[C++のvector.capacity](https://eel.is/c++draft/vector.capacity) · [C++のvector向けerase_if](https://eel.is/c++draft/vector.erasure) · [MicrosoftのListコンストラクター](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.-ctor?view=net-10.0)

```cpp
#include <iostream>
#include <vector>

struct Bullet {
    float x;
    float speed;
};

int main() {
    std::vector<Bullet> bullets;
    bullets.reserve(128);
    bullets.push_back({10.0f, 20.0f});
    bullets.push_back({98.0f, 10.0f});

    const float dt = 0.5f;
    for (Bullet& bullet : bullets) {
        bullet.x += bullet.speed * dt;
    }
    std::erase_if(bullets, [](const Bullet& bullet) { return bullet.x >= 100.0f; });

    std::cout << bullets.size() << ' ' << bullets.front().x << '\n';  // 1 20
}
```

頻繁に中間の要素を外す設計では、並び順を保つ必要があるかも考えます。順序が不要で対象位置が分かっていれば、末尾の要素で穴を埋めて末尾を削ると移動は1個以下です。IDから位置を引けるようにする例は[スパースセット](/algorithms/sparse-sets.html)で扱います。両端の追加・削除が中心なら[キューとデック](/algorithms/queues-and-deques.html)、各要素の位置を保持したままつなぎ替えるなら[連結リスト](/algorithms/linked-lists.html)も比べられます。[STLコンテナ](/languages/cpp/stl.html)
