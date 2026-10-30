---
title: main.cpp から CPU命令までの旅
study:
  source: C++ Wiki
  status: published
  summary: g++ main.cpp と打ってからゲームが動くまで、コードは7つの姿を経ます。この1本の旅を通しで理解すれば、ビルドエラー・リンクエラー・実行時クラッシュが「どの段階の問題か」を切り分けられるようになります。
  section: reference
  format: article
  domain: compilers
---

# main.cpp から CPU命令までの旅

## 一言で言うと

`g++ main.cpp` と打ってからゲームが動くまで、コードは**7つの姿**を経ます。この1本の旅を通しで理解すれば、ビルドエラー・リンクエラー・実行時クラッシュが「どの段階の問題か」を切り分けられるようになります。

## 全体地図

```
main.cpp(あなたが書いたテキスト)
   │  ①プリプロセッサ(textの変形: #include展開・#define置換)
   ▼
翻訳単位(1つの巨大なC++ソース)
   │  ②コンパイラ(C++の意味を解析し、最適化して、アセンブリへ)
   ▼
main.s(アセンブリ: 人間可読なCPU命令表記)
   │  ③アセンブラ(機械語への変換)
   ▼
main.o(オブジェクトファイル: 機械語+未解決の参照+シンボル表)
   │  ④リンカ(複数の.oとライブラリを結合、参照を解決)
   ▼
game.exe(実行ファイル: 完成した機械語+配置情報)
   │  ⑤OSローダー(メモリへ配置、DLL解決、開始点へジャンプ)
   ▼
プロセス(メモリ空間+スレッド)
   │  ⑥ランタイム初期化 → main()呼び出し
   ▼
CPU命令の実行(フェッチ→デコード→実行の繰り返し)
```

以下、この例で各段階を追います。

```cpp
// main.cpp(C++20)
#include <cstdio>
#define MAX_HP 100

int Damage(int hp, int amount) { return hp - amount; }

int main() {
    int hp = MAX_HP;
    hp = Damage(hp, 30);
    std::printf("hp=%d\n", hp);
    return 0;
}
```

## ① プリプロセッサ — テキストの変形

コンパイル**前**の純粋な文字列処理です。C++の文法を知りません。

- `#include <cstdio>` → cstdioファイルの中身を**その場に貼り付け**(数万行に膨れる)
- `#define MAX_HP 100` → 以後の `MAX_HP` を文字通り `100` に置換(型もスコープもない → だから[constexpr推奨](/languages/cpp/auto-and-constexpr.html))
- `#ifdef` によるコードの選別(プラットフォーム分岐)

結果は**翻訳単位(translation unit)**: 1つの.cppから作られた、includeがすべて展開された巨大なソース(→ [詳細](/runtime/cpp-internals/translation-units-and-headers.html))。`g++ -E main.cpp` で実物が見られます。

## ② コンパイラ — 意味の解析と機械語化

翻訳単位を字句解析→構文解析→意味解析(型検査、オーバーロード解決、テンプレート実体化)し、中間表現に落として**最適化**し、ターゲットCPUのアセンブリを出します。

- **1つの翻訳単位しか見ない**のが重要ポイント。`Damage` の定義がここに無ければ「あるはず」と信じて呼び出しだけ書く(後でリンカが解決)
- 最適化の例: この程度のコードなら `Damage` はインライン化され、さらに `hp=70` が**コンパイル時に計算済み**になる(定数畳み込み → [最適化](/runtime/cpp-internals/optimization-and-ub.html))

```
# g++ -O2 -S main.cpp の出力(x86-64の抜粋、実際の出力は環境で変わる)
main:
    sub   rsp, 8
    mov   esi, 70          # ← hp-30すら実行しない。答えの70を直接埋め込み
    lea   rdi, .LC0[rip]   # "hp=%d\n"のアドレス
    xor   eax, eax
    call  printf
    ...
```

## ③ アセンブラ — 機械語へ

アセンブリ(`mov esi, 70`)を機械語バイト列(`be 46 00 00 00`)へ1対1変換します。知的な処理はほぼなく、②と一体化していることが多い段階です。

## ④ オブジェクトファイル → リンカ

`main.o` の中身は「機械語の断片+**シンボル表**」です。

```
main.o のシンボル表(概念図):
  提供するもの: main, Damage(int,int) → _Z6Damageii(名前修飾 → 第3節)
  必要なもの:   printf(未解決 — どこにあるか知らない)
```

**リンカ**が全.oとライブラリ(libc等)を突き合わせ、「必要なもの」を「提供するもの」で埋めます(→ [シンボル](/runtime/cpp-internals/symbols-and-linkage.html))。

- 見つからない → **未解決外部シンボル**エラー(→ [リンクエラー](/tools/build/link-errors.html))
- 2つ見つかる → **多重定義**エラー([ODR](/runtime/cpp-internals/translation-units-and-headers.html)違反)
- コンパイルエラーとリンクエラーは**別の段階の別の病気**——これが分かるとエラーメッセージが読めるようになります

## ⑤ 実行ファイルとOSローダー

`game.exe`(Windows: PE形式 / Linux: ELF形式)は「機械語+データ+**どうメモリに配置するかの指示書**」です。ダブルクリックすると:

1. OSがプロセス(仮想アドレス空間)を作る
2. ローダーが実行ファイルの各セクション(.text=コード、.data=初期化済みデータ等)をメモリへマップ(→ [メモリレイアウト](/runtime/cpp-internals/memory-layout.html))
3. 依存するDLL(d3d12.dll等)をロードし、そのシンボルを解決(**動的リンク** → [ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html))
4. スタックを用意し、エントリポイントへジャンプ

## ⑥ ランタイム初期化 → main()

mainの前に仕事があります: CRT(Cランタイム)の初期化、**グローバル/静的オブジェクトのコンストラクタ実行**(→ この順序が[未規定なのがstatic initialization order fiasco](/runtime/memory/storage-duration-and-lifetime.html))。それから `main()` が呼ばれます。

## ⑦ 関数呼び出しとCPU命令

`Damage(hp, 30)` の実行時の姿(インライン化されなかった場合):

1. 引数をレジスタに置く(x64の呼出規約: 最初の引数はrcx/rdi等 → [呼出規約](/runtime/cpp-internals/function-calls-and-cpu.html))
2. `call` 命令: 戻り先アドレスをスタックに積み、Damageの先頭へジャンプ
3. Damage内で計算し、結果をraxレジスタに置いて `ret`(スタックから戻り先を取り出しジャンプ)

CPUは「命令を取ってくる(フェッチ)→解読(デコード)→実行」を1秒に数十億回繰り返します。その速度を支えるのが[キャッシュと分岐予測](/runtime/cpp-internals/cache-branch-simd.html)です。

## この地図の使い方(エラーの切り分け)

| 症状 | 段階 | 行き先 |
|---|---|---|
| `'Enemy' was not declared` | ②コンパイル(宣言が見えていない) | [ヘッダーと前方宣言](/runtime/cpp-internals/translation-units-and-headers.html) |
| `undefined reference to ...` | ④リンク(定義を持つ.o/libがない) | [リンクエラー](/tools/build/link-errors.html) |
| `multiple definition of ...` | ④リンク(ODR違反) | [ODR](/runtime/cpp-internals/translation-units-and-headers.html) |
| DLLが見つからず起動しない | ⑤ローダー | [DLL](/runtime/cpp-internals/object-files-and-libraries.html) |
| mainの前にクラッシュ | ⑥静的初期化 | [記憶域期間](/runtime/memory/storage-duration-and-lifetime.html) |

## Unity/C# との対応

C#は「コンパイル→IL(中間言語)→実行時にJIT/事前にAOT」という2段構え。C++は**実行前にすべて機械語まで落とす**(JITなし)。UnityのIL2CPPは「IL→C++→この旅」という変換で、まさにこのページの旅に合流します(→ [ネイティブビルドと IL2CPP](/languages/csharp/il2cpp.html))。アセンブリ(.dll)のロードは⑤の動的リンクに相当します。

## 理解度チェック

1. プリプロセッサとコンパイラの決定的な違い(何を知っているか)は?
2. コンパイルエラーとリンクエラーはそれぞれどの段階で、何が原因ですか。
3. mainの前に何が実行されますか。

## 演習

手元で旅を目視してください: `g++ -E main.cpp | wc -l`(プリプロセス後の行数)、`g++ -O2 -S main.cpp`(アセンブリ)、`g++ -c main.cpp && nm main.o`(シンボル表 — MinGWではnm付属)。検証済みサンプル: <a href="/study/samples/cpp/journey_main.cpp">samples/journey_main.cpp</a>

---

関連項目：[学習ガイド](/runtime/cpp-internals/) / [翻訳単位・ヘッダー・ODR](/runtime/cpp-internals/translation-units-and-headers.html)
