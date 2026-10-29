---
title: "メモリバグ図鑑 — dangling pointer・use-after-free・double free・memory leak・buffer overflow・stack overflow"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "C++のメモリバグは種類が有限です。全部未定義動作または資源枯渇であり、症状・原因・予防・検出ツールをセットで覚えれば怖さは激減します。 死んだオブジェクトを指すポインタ・参照(dangling)を使うとUAF。C++バグの王様です。"
---

# メモリバグ図鑑 — dangling pointer・use-after-free・double free・memory leak・buffer overflow・stack overflow

C++のメモリバグは種類が有限です。**全部[未定義動作](/languages/cpp/undefined-behavior.html)または資源枯渇**であり、症状・原因・予防・検出ツールをセットで覚えれば怖さは激減します。

## 1. dangling pointer(宙ぶらりんポインタ)/ use-after-free (UAF)

**死んだオブジェクトを指すポインタ・参照**(dangling)を**使う**とUAF。C++バグの王様です。

```cpp
// 典型3パターン
Enemy* p = &enemies[0];
enemies.push_back(e);        // (1) vectorの再確保で全要素が引っ越し → pは旧番地を指す

auto e = std::make_unique<Enemy>();
Enemy* raw = e.get();
e.reset();                   // (2) 所有者が破棄
raw->hp = 0;                 // UAF

Enemy& r = *GetTarget();     // (3) 敵が今フレーム死亡・削除された後に
r.TakeDamage(10);            // UAF
```

- **症状**: たまにクラッシュ/**別のオブジェクトが化ける**(解放済み領域が再利用され、他人のデータを書き換える)——再現困難バグの筆頭
- **予防**: 所有権設計([前ページ](/runtime/memory/ownership-and-borrowing.html))、weak_ptr/世代ハンドル、イテレータ無効化規則の理解([STL](/languages/cpp/stl.html))
- **検出**: **AddressSanitizer (ASan)** がほぼ一撃で特定(解放箇所・使用箇所の両スタックトレース付き)

## 2. double free(二重解放)

同じメモリを2回deleteする。

```cpp
Enemy* p = new Enemy();
delete p;
delete p;      // ヒープ管理構造の破壊 → 後で無関係な場所でクラッシュ
```

- **原因**: 所有者が2人いる設計(生ポインタのコピー配布)、コピーコンストラクタの浅いコピー([Rule of Three](/languages/cpp/ctor-dtor-copy-move.html)違反)
- **予防**: unique_ptr(コピー不可が型で保証)、Rule of Zero
- **検出**: ASan、デバッグヒープ

## 3. memory leak(リーク)

解放されないメモリが溜まり続ける。**UBではない**が、長時間プレイでメモリ枯渇→クラッシュ。

```cpp
void OnHit() { auto* fx = new Effect(); /* deleteを書き忘れ、ポインタも捨てた */ }
// 現代C++でのリークの主流はむしろ: shared_ptrの循環参照、コンテナに溜め続けて消し忘れ、
// [Observer](../03_design_patterns/observer.md)の購読解除忘れ(リストが伸び続ける)
```

- **予防**: RAII/スマートポインタで「生のnew」を根絶、循環はweak_ptr
- **検出**: ASan(LeakSanitizer)、MSVCのCRTデバッグヒープ(_CrtDumpMemoryLeaks)、長時間プレイのメモリグラフ監視(ライブゲームの定番テスト)

## 4. buffer overflow(バッファオーバーフロー)

確保した領域の外に読み書きする。

```cpp
int table[4];
for (int i = 0; i <= 4; ++i) table[i] = 0;   // i==4 が1個外を破壊(off-by-one)

char name[16];
std::strcpy(name, longInput);                // 入力が16以上なら隣を破壊(C関数の古典)
```

- **症状**: **隣の変数が勝手に変わる**(スタック上の隣=別のローカル変数や戻り先アドレス → [コールスタック](/runtime/cpp-internals/function-calls-and-cpu.html))。セキュリティ脆弱性の古典でもある
- **予防**: 生配列を避け `std::array`/`vector` + `.at()`/範囲for、C文字列関数を避け `std::string`、[std::span](/languages/cpp/arrays-and-strings.html)で範囲を持ち歩く
- **検出**: ASan、MSVC `/RTC`、静的解析

## 5. stack overflow(スタックオーバーフロー)

スタック(典型1〜8MB)を使い切る。

```cpp
void Explore(Node& n) { for (auto& c : n.children) Explore(c); }  // 深い再帰(深いシーングラフで)
float heightmap[2048 * 2048];   // ローカルに16MBの配列(即死)
```

- **予防**: 巨大配列はヒープ(vector)へ、再帰は深さ制限か明示的スタック(ループ+vector)へ
- **検出**: 即クラッシュするので比較的発見しやすい(スタックトレースが同じ関数の繰り返しなら再帰)

## 症状からの逆引き

| 症状 | 疑う順 |
|---|---|
| たまに落ちる・場所が毎回違う | UAF → ヒープ破壊(overflow/double free) |
| 触っていない変数が変わる | buffer overflow(スタック)→ UAF(ヒープ) |
| 長時間で重くなる・落ちる | leak → 断片化([アロケータ](/runtime/memory/allocators-and-pools.html)) |
| 終了時に落ちる | 静的破棄順([記憶域期間](/runtime/memory/storage-duration-and-lifetime.html))→ double free |
| Releaseのみ落ちる | 未初期化・UB([最適化とUB](/runtime/cpp-internals/optimization-and-ub.html)) |

## C#との対応(なぜC#ではこれらが「ない」のか)

- UAF/dangling: GCが「参照が残る限り延命」するので原理的に発生しない(代わりに「消したつもりが生きている」= 論理リーク)
- double free: 解放の概念自体がない
- buffer overflow: 境界チェックで例外化(IndexOutOfRange)
- leak: GCでも起きる(staticに溜める、イベント購読で延命)——形を変えて存在
- **つまりC#は「壊れ方が例外として定義された世界」、C++は「壊れ方が未定義の代わりにチェックコストを払わない世界」**([UB](/languages/cpp/undefined-behavior.html))

## Unity開発者が誤解しやすい点

1. MissingReferenceException(破棄済みGameObjectアクセス)は「エンジンが検出してくれるUAF」。C++では検出されず**静かに壊れる**——同じ設計ミスの結果が桁違いに悪化する
2. 「クラッシュした場所=バグの場所」— メモリ破壊系は**壊した場所と発症する場所が遠い**。ASanは「壊した瞬間」を捕まえるから価値がある
3. 「テストで通ったから大丈夫」— UBは環境・タイミング依存。サニタイザ付きテストで初めて意味がある

## 開発フローへの組み込み(実務の結論)

- 開発ビルドに **ASan/UBSan** を常設(→ [サニタイザ](/tools/build/debugging-and-analysis.html))。「たまに落ちる」を追う時間が桁で減る
- CI でサニタイザ付きテストを回す
- 「生のnew/delete禁止・所有権は型で表現」をコード規約に

## 理解度チェック

1. UAFの3つの典型パターン(再確保・所有者破棄・削除済み参照)を言えますか。
2. 「壊した場所と発症場所が遠い」のはなぜですか。どのツールが縮めてくれますか。
3. C#で「形を変えて存在する」メモリバグは何ですか。

## 演習

samples/memory_bugs_annotated.cpp(**読む教材**: 各バグがコメント付きで再現されている。ビルド可能だが意図的に実行しない)を読み、各バグに対応する予防策(型・規約)と検出ツールの表を完成させてください。可能な環境(WSL等のASan対応環境)があれば、実際にASanで検出してみてください(MinGW GCC 9.2はASan非対応のため本Wikiでは静的確認のみ)。

---

前: [所有権と借用](/runtime/memory/ownership-and-borrowing.html) | [カテゴリ目次](/runtime/memory/) | 次: [並行処理のバグ](/runtime/memory/concurrency-bugs.html)
