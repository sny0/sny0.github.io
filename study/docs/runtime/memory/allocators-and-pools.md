---
title: placement new・allocator・memory pool・arena allocator・fragmentation
study:
  source: C++ Wiki
  status: published
  summary: placement new、固定サイズプール、アリーナ、STL allocatorの役割と、断片化・寿命・計測による選択を整理します。
  section: reference
  format: article
  domain: runtime
---

# placement new・allocator・memory pool・arena allocator・fragmentation

## なぜ自前のメモリ管理が要るのか

通常の `new T` 等のnew式は、記憶域の確保とオブジェクトの構築を行います。確保関数の実装は処理系や置換によって異なり、`malloc` と同一とは限りません。汎用アロケータにも高速な経路があり、常に遅い、あるいは特化すれば必ず大幅に速くなるとは言えません。ゲームでは「同サイズを大量に扱う」「同じ境界で領域を再利用する」等の条件を利用できるため、**時間・メモリ使用量・寿命の要件を計測して**確保戦略を選びます。

## fragmentation(断片化)

```
ヒープ: [A使用][ 空き8KB ][B使用][ 空き4KB ][C使用][ 空き6KB ]
要求: 12KBの確保 → 空き合計18KBあるのに、連続12KBがなく失敗(外部断片化)
```

- 長時間プレイ(ライブゲーム・常駐サーバー)でじわじわ効く。「合計は足りてるのに確保失敗」「アロケータ内の管理コスト増で徐々に遅くなる」
- 対策の方向: **同サイズは固定サイズプールに**してブロック間の外部断片化を抑え、**同寿命はアリーナに**して領域をまとめて再利用する。ただしプールの未使用ブロック、ブロック内の余り、アラインメントや管理情報、アリーナの使い残し等の消費は残る

## placement new(場所を指定して構築)

```cpp
// C++20 — 「メモリ確保」と「オブジェクト構築」を分離する低レベル道具
alignas(Enemy) std::byte buffer[sizeof(Enemy)];   // 確保は自分で済ませた
Enemy* e = new (buffer) Enemy();    // placement new: このbufferの上にコンストラクタだけ実行
e->~Enemy();                        // 破棄も分離: デストラクタだけ明示的に呼ぶ(deleteしない!)
```

すべての自前アロケータの基礎部品です(vectorの内部も「確保→placement new構築」の分離でできている)。`std::destroy_at` はC++17、`std::construct_at` はC++20で導入された道具です。[GCC libstdc++の `stl_construct.h` の版数条件](https://gcc.gnu.org/pipermail/libstdc%2B%2B/2024-March/058504.html)でも両者を区別できます。

## memory pool(同サイズ特化)

[Object Pool](/game/patterns/object-pool.html)の下位層版: **同サイズのブロック**をフリーリストで貸し借りします。空きブロックがある状態でのフリーリスト操作はO(1)にできますが、領域の追加確保や構築・破棄のコストは別です。固定サイズブロック間の外部断片化を抑えられても、内部の余りや未使用容量までゼロになるわけではありません。弾・ノード・メッセージなど「同じ型を大量に出し入れ」する対象に。

```
プール: [■][□][■][□][□][■]...(全ブロック同サイズ)
        フリーリスト: 空きブロックを鎖で繋ぐ → Acquire=先頭を外す、Release=先頭に繋ぐ
```

## arena allocator(同寿命特化。bump allocatorとも)

<a href="/study/samples/cpp/arena_allocator.cpp" download>アリーナのコード全体</a>では、実際のアドレスを基準にアラインメントを合わせ、ゼロサイズ・不正なalignment・容量不足を失敗として扱います。クラス部分を同じ配布ファイルから掲載します（`<memory>`等のincludeと実行例は全体のコードを参照）。

<<< @/public/samples/cpp/arena_allocator.cpp#arena-class

2026年11月2日、Windows x64・MSVC 19.35.32217.1・C++20・Release・`/W4 /WX /permissive- /EHsc /utf-8`で、配布コードのビルドと実行を確認しました。警告はなく、実行例の終了コードは0です。別の検査では、実アドレスの64/256byte整列、領域の非重複、容量不足・巨大な要求・不正なalignment・ゼロサイズ、`Reset()`後の再利用など27項目を確認しています。他の処理系やマルチスレッド対応は、この検証の対象外です。

`std::align`は、指定した領域の中に要求サイズとアラインメントを満たす場所を見つけます。[作業草案の契約](https://eel.is/c++draft/ptr.align)も参照してください。オフセットだけを丸める方法では、先頭アドレス自体の整列を無条件には保証できません。

- **確保はアラインメント調整・容量確認・ポインタ更新**が中心です。汎用確保との速度差は負荷や実装に依存し、固定の倍率や最速を保証しません。個別解放はせず、`Reset()` はデストラクタを呼ばずに領域を再利用可能にします
- 用途: **フレームアロケータ**(毎フレームの一時データ→フレーム末尾でReset)、ロード時アロケータ(レベルの全データ→アンロードでReset)
- 制約: デストラクタが必要な型は置けない(Resetはデストラクタを呼ばない)or 別途登録して呼ぶ仕組みが要る。**「同寿命でPOD的なデータ」**が最適な獲物

## allocator(STLへの注入口)

STLコンテナは確保戦略を差し替えられます: `std::vector<T, MyAllocator<T>>`。C++17の **polymorphic memory resource (pmr)** が現代の形:

```cpp
#include <cstddef>
#include <memory_resource>
#include <vector>
std::byte buf[4096];
std::pmr::monotonic_buffer_resource arena(buf, sizeof(buf));   // 標準のアリーナ実装
std::pmr::vector<int> v(&arena);    // 確保要求をarenaへ渡す(型は同じpmr::vectorのまま)
```

この例の`buf`は初期領域です。不足すると`monotonic_buffer_resource`は上流のresourceへ追加の確保を要求するため、「4096byteを超えると必ず失敗する固定容量アリーナ」ではありません。[標準の確保手順](https://eel.is/c++draft/mem.res.monotonic.buffer.mem)も参照してください。

配布サンプルは自作Arenaで概念を示します。STLへの注入と、OSからページを取得する操作は別の層です。

## 全体地図(どの層の話か)

[malloc/newからOSへ至る経路](/runtime/memory/allocation-journey.html)と[仮想メモリの状態](/os/virtual-memory.html)は別記事で掘り下げます。[Windowsの観察サンプル](/practice/memory/windows-memory-observation.html)では、予約・コミット・常駐を分けて確認できます。

```
[Object Pool]  ゲームオブジェクトの再利用(リセット・ハンドル管理込み)
[memory pool / arena]   バイト供給の戦略(このページ)
[malloc / new]          汎用ヒープ(OSから貰った領域を管理)
[OS(VirtualAlloc/mmap)] ページ単位の供給
```

## C#/Unityとの対応

- C#の通常の管理オブジェクトはGC管理下に置かれ、その確保先をC++のコンテナ用allocatorのように任意に差し替えるわけではありません。一方、`stackalloc` や、対応する.NETでの [NativeMemory](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.nativememory) 等によるネイティブ確保もあるため、GCヒープ一択ではありません。プールや `ArrayPool<T>` 等による再利用と、構造体/`Span<T>` の利用は、実際にどの確保が減るかを確認して使います
- Unityの `NativeArray` 等では、`Allocator.Temp` / `TempJob` / `Persistent` によって使用可能な寿命・スレッド・解放規則等が異なります。すべてを同じフレームアリーナと見なさず、[Collections 2.1のAllocator overview](https://docs.unity3d.com/Packages/com.unity.collections@2.1/manual/allocator-overview.html)等で対象の版の契約を確認します
- UEには `FMemStack`(フレームアロケータ)、各種プールが内蔵(→ [Unreal Engineと標準C++をつなぐ学習ガイド](/game/unreal/))

## Unity開発者が誤解しやすい点

1. 「メモリ確保はいつも同じ時間」— 汎用アロケータにはキャッシュ等で済む経路もあり、探索・ロック・OSからの領域取得等が必要な経路もあります。大量確保の影響はサイズ・寿命・スレッド・実装で異なるため、フレーム時間とメモリ使用量を計測します。C++の確保とC#のGC停止は別の処理として観察します
2. フレーム単位の再利用が有効かは、データの寿命と実測で判断します。短い実装例でも、整列、容量不足、スレッド、破棄、保持量の設計は必要です。
3. UnityのAllocatorの寿命・解放規則は、使用するCollectionsの版とAPIで確認します。すべてが自作アリーナと同じResetモデルではありません。

## 使う場面 / 使わない場面

- **使う**: 計測で確保がボトルネック/スパイク源と判明。同サイズ大量(プール)・同寿命大量(アリーナ)のパターンがある。断片化が問題になる長時間運用
- **使わない**: 起動時に確保して以後触らないデータ(汎用newで十分)。パターンのない雑多な確保。**計測前**

## 理解度チェック

1. 断片化への2大対策(同サイズ→プール/同寿命→アリーナ)の理屈を説明できますか。
2. placement newが分離する2つのステップは?
3. アリーナに「デストラクタが必要な型」を置くと何が問題ですか。

## 演習

samples/arena_allocator.cpp を拡張し、「フレームの一時文字列組み立て」をアリーナ上で行い、Reset で使い回すデモを書いてください。汎用newとの速度比較(100万回確保)も計測してみてください。

---

関連項目：[キャッシュ局所性とAoS/SoA](/runtime/memory/cache-locality-aos-soa.html) / [学習ガイド](/runtime/memory/) / [GCとの違い(C#管理ヒープ)](/runtime/memory/gc-and-csharp-comparison.html)
