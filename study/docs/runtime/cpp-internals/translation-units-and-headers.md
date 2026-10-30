---
title: 翻訳単位・ヘッダー・include・前方宣言・ODR
study:
  source: C++ Wiki
  status: published
  summary: C++のビルドは「.cppごとに独立してコンパイルし、後でリンクで合体」する方式です。この「独立してコンパイルされる単位」が翻訳単位で、ヘッダーファイルは「複数の翻訳単位に同じ宣言を配るためのコピペ機構」にすぎません。C#にはこの仕組みが丸ごと存在しないため、Unity経験者の最初の壁になります。
  section: reference
  format: article
  domain: compilers
---

# 翻訳単位・ヘッダー・include・前方宣言・ODR

## 一言で言うと

C++のビルドは「**.cppごとに独立してコンパイル**し、後でリンクで合体」する方式です。この「独立してコンパイルされる単位」が**翻訳単位**で、ヘッダーファイルは「複数の翻訳単位に**同じ宣言を配る**ためのコピペ機構」にすぎません。C#にはこの仕組みが丸ごと存在しないため、Unity経験者の最初の壁になります。

## 翻訳単位とは

```
enemy.cpp + (includeされた enemy.h, vector, ...) = 翻訳単位A → enemy.o
player.cpp + (includeされた player.h, enemy.h, ...) = 翻訳単位B → player.o
```

- コンパイラは**1度に1つの翻訳単位しか見ない**。enemy.cppのコンパイル中、player.cppの存在すら知らない
- だから「他の.cppにある関数」を呼ぶには、**宣言**(こういう関数が存在する、という約束)が必要で、それを配るのがヘッダー

## 宣言と定義

```cpp
// 宣言(declaration): 存在と型だけ知らせる。何度書いてもよい
int CalcDamage(int atk, int def);      // 関数宣言
class Enemy;                            // クラスの前方宣言
extern int g_score;                     // 変数の宣言

// 定義(definition): 実体を作る。プログラム全体で原則1つ
int CalcDamage(int atk, int def) { return atk - def; }   // 関数定義
class Enemy { int hp_; };                                 // クラス定義
int g_score = 0;                                          // 変数定義
```

## ヘッダーファイルの役割

```cpp
// enemy.h — 「宣言の配布物」
#pragma once
#include <string>

class Enemy {
public:
    void TakeDamage(int amount);      // 宣言だけ
    int Hp() const { return hp_; }    // クラス内定義は暗黙inline(配ってよい)
private:
    int hp_ = 100;
    std::string name_;
};
```

```cpp
// enemy.cpp — 定義(実体)は1か所
#include "enemy.h"
void Enemy::TakeDamage(int amount) { hp_ -= amount; }
```

`#include` は**ただの貼り付け**(→ [プリプロセッサ](/runtime/cpp-internals/build-pipeline-journey.html))なので、ヘッダーに書いたものは「includeした全翻訳単位に書いたのと同じ」になります。ここからODR問題が生まれます。

## ODR(One Definition Rule、単一定義規則)

**定義はプログラム全体で1つ**、という規則です。

```cpp
// utils.h(問題例)
int Add(int a, int b) { return a + b; }   // ヘッダーに非inline関数の「定義」
// → a.cpp と b.cpp が両方includeすると、Add の定義が2つ → リンクエラー(多重定義)
```

対処(どれか):

1. 定義は.cppへ移し、ヘッダーは宣言だけ
2. `inline` を付ける(「複数翻訳単位に現れてよい、リンカが1つにまとめる」→ [inline](/languages/cpp/static-inline-friend.html))
3. テンプレート・クラス内定義は暗黙にこの扱い

なお**クラス定義**はヘッダー経由で各翻訳単位に現れてよい(内容が完全一致している限り)特例です。内容が翻訳単位間で食い違うと「診断不要のODR違反」(=リンカも検出しない未定義動作)という最悪の形になります——ヘッダーの中身を`#ifdef`で条件分岐させるときの罠。

## include guard と #pragma once

同じヘッダーが1つの翻訳単位に2回貼り付くと、クラスの再定義エラーになります。防止策:

```cpp
// 方法1: include guard(標準保証。全処理系で動く)
#ifndef ENEMY_H_INCLUDED
#define ENEMY_H_INCLUDED
// ... 中身 ...
#endif

// 方法2: #pragma once(非標準だがMSVC/GCC/Clangすべて対応。タイプミスがなく実務は大抵こちら)
#pragma once
```

## 前方宣言 — includeを減らす道具

```cpp
// radar.h
#pragma once
class Enemy;                       // 前方宣言: 「Enemyというクラスが存在する」とだけ

class Radar {
public:
    void Track(Enemy* target);     // ポインタ/参照ならこれで足りる(サイズ・中身を知らなくてよい)
private:
    Enemy* target_ = nullptr;      // OK
    // Enemy value_;               // NG: 実体を置くには定義(サイズ)が必要 → includeが要る
};
```

前方宣言で済ませる利点:

1. **ビルド時間**: enemy.hの変更でradar.h経由の再コンパイル連鎖が起きない(→ [ビルド速度](/tools/build/build-speed.html))
2. **循環include**の解消(A.hとB.hが互いにincludeするとコンパイル不能 → 片方を前方宣言に)

ヘッダーでは「ポインタ・参照・関数シグネチャにしか使わない型は前方宣言、実体・継承・メンバ呼び出しに使う型はinclude」が原則です。

## C#との対応(なぜC#にはヘッダーがないのか)

C#のコンパイラは**アセンブリ内の全ソースを一度に見る**+参照アセンブリのメタデータから型情報を読むため、宣言の配布が不要です。C++が分割コンパイル方式なのは、歴史(1970年代のメモリ制約)と、巨大コードベースの並列・差分ビルドという実利のためです。C++20の**モジュール**がこの構造を近代化しますが、普及は途上です(→ [ヘッダーとAssembly Definitionの対比](/languages/csharp/headers-vs-asmdef.html))。

## Unity開発者が誤解しやすい点

1. 「includeはusingのようなもの」— usingは名前解決の楽をするだけ。includeは**物理的な貼り付け**で、ビルド時間・ODRに直結する
2. 「クラスは1ファイルに書けば見える」— C++では**ヘッダーに書いて配らないと他の.cppから見えない**
3. ヘッダーに書いてよいもの/だめなものの区別(宣言・inline・テンプレート=OK、非inline定義・可変グローバル変数の定義=NG)

## ゲーム開発での使用例

- エンジン規模ではヘッダー設計=ビルド時間設計。前方宣言の徹底、pimplイディオム(実装をポインタの向こうに隠す)でinclude連鎖を切る
- 「1行直したら5分待ち」の原因の大半はヘッダーの依存設計(→ [ビルドが遅い理由](/tools/build/build-speed.html))

## 理解度チェック

1. 翻訳単位とは何ですか。コンパイラは何を見えていませんか。
2. 宣言と定義の違いと、ODRが許す・許さないものは?
3. 前方宣言で済む場合とincludeが必要な場合の境界は?

## 演習

検証済みサンプル [samples/tu_demo/](/tools/build/samples/tu-demo.html)(main.cpp + enemy.h/.cpp + radar.h/.cpp の最小マルチファイル構成)をビルドし、(a) enemy.hの関数定義からinlineを外して多重定義エラーを再現、(b) radar.h のincludeを前方宣言に置き換えてビルドが通ることを確認してください。

---

関連項目：[main.cppからCPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html) / [学習ガイド](/runtime/cpp-internals/) / [シンボル・名前修飾・リンケージ・ABI](/runtime/cpp-internals/symbols-and-linkage.html)
