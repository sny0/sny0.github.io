---
title: LLVM IRとSSA — 分岐で選ばれる値を追う
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: compilers
  summary: LLVM IRの基本ブロックと制御フローを読み、SSAの値が分岐とphiを通じてどうつながるかを調べる。
  aliases: [LLVM, LLVM IR, 中間表現, IR, SSA, 静的単一代入, phi, φ, CFG, 制御フローグラフ, 基本ブロック, mem2reg]
  verification: LLVM 14.0.6でIRのアセンブル・検証・実行とClangのIR出力を確認し、LLVMの言語仕様に照合（2026-11-06）
---

# LLVM IRとSSA — 分岐で選ばれる値を追う

ソース上の変数に二つの分岐から別々の値を入れる場合、最適化では、合流後に使う値がどちらの経路から来たかを調べます。**LLVM IR（Intermediate Representation、中間表現）**では、命令を実行する順序と、値を作る命令から値を使う命令へのつながりを、型付き命令で表せます。テキスト形式の `.ll` は人が読める表現で、対応するバイナリ形式をビットコードと呼びます。[LLVM IRの概要](https://llvm.org/docs/LangRef.html#abstract) · [トークン・AST・型検査](/compilers/tokens-ast-and-type-checking.html)

## 基本ブロックと分岐

次のC++関数は、`keep` の値で異なる計算をして、その結果を2倍します。`unsigned` は32ビットの環境を想定します。

```cpp
extern "C" unsigned choose_offset(bool keep, unsigned base) {
    unsigned offset;
    if (keep) {
        offset = base + 4u;
    } else {
        offset = base - 1u;
    }
    return offset * 2u;
}
```

LLVM IRで、関数内の命令をまとめる単位が**基本ブロック（basic block）**です。ブロック内は先頭から順に進み、末尾の命令で次のブロックに進むか、関数から戻るかを決めます。`br` や `ret` が末尾を決める終端命令です。どのブロックからどこへ進めるかを矢印で結んだ図が **CFG（制御フローグラフ）** です。[LLVM IRの関数と基本ブロック](https://llvm.org/docs/LangRef.html#functions) · [終端命令](https://llvm.org/docs/LangRef.html#terminator-instructions)

<figure class="study-figure">
  <img src="/images/compilers/llvm-ir-and-ssa.svg" alt="entryからkeepの値でtake_upまたはtake_downへ分岐する。take_upがup、take_downがdownを定義する。joinのphiは直前のブロックに対応する値を選んでoffsetを定義する。" width="760" height="352" loading="lazy">
  <figcaption>合流点では、どちらの矢印を通って来たかで選ばれる値が変わります。<a href="/study/images/compilers/llvm-ir-and-ssa.svg" target="_blank" rel="noopener noreferrer">制御フローグラフを拡大</a></figcaption>
</figure>

## SSAで合流点に値を渡す

**SSA（Static Single Assignment、静的単一代入）**では、各SSA値の定義箇所が一つです。上の関数に対応する手書きのIRでは、C++の `offset` に入る候補に `%up` と `%down` という別々の名前を付けます。`%keep` や `%base` のような関数引数も、IRでは値として使えます。[LLVM IRの言語仕様](https://llvm.org/docs/LangRef.html)

```llvm
define i32 @choose_offset(i1 %keep, i32 %base) {
entry:
  br i1 %keep, label %take_up, label %take_down

take_up:
  %up = add i32 %base, 4
  br label %join

take_down:
  %down = sub i32 %base, 1
  br label %join

join:
  %offset = phi i32 [ %up, %take_up ], [ %down, %take_down ]
  %result = mul i32 %offset, 2
  ret i32 %result
}
```

`phi` は、直前に通ったブロックに対応する値を選びます。`take_up` からなら `%up`、`take_down` からなら `%down` です。SSAの規則では、各入力値を使う地点は、対応する先行ブロックから合流点へ入る**辺**にあるとみなします。その経路で用意できる値を渡し、`phi` が合流後に使う `%offset` を定義します。例えば `%base` が10なら、真の経路で `(10 + 4) * 2 = 28`、偽の経路で `(10 - 1) * 2 = 18` を返します。[LLVMのphi命令の仕様](https://llvm.org/docs/LangRef.html#phi-instruction)

ループでは、同じ命令を通るたびに異なる値を得ることがあります。SSAの「一つ」は、コードに書かれた定義箇所の数です。ループ先頭の `phi` には、初回の入口から渡す値と、ループ末尾から戻ったときに渡す値を指定できます。[LLVMのループ表現](https://llvm.org/docs/LoopTerminology.html#loop-definition)

## メモリに置いた変数とSSA値

LLVM IRでは、`alloca` で関数内の領域を取り、`store` で書いて `load` で読み出す形も使えます。一つのアドレスに何回も書けます。アドレスを表すSSA値の定義は一つで、メモリの中身は書き換えられます。`mem2reg` は、アドレスを関数外に渡さず直接読み書きするローカル変数など、条件を満たす領域をSSA値に変え、必要な合流点に `phi` を置きます。[LLVMの可変変数とmem2reg](https://llvm.org/docs/tutorial/MyFirstLanguageFrontend/LangImpl07.html#memory-in-llvm)

## IRを検証し、Clangの出力と見比べる

手書きのIRを `choose-offset.ll` として保存し、LLVMのツールを使える端末で実行します。`llvm-as` はテキストIRをビットコードに変換し、`opt` の `verify` パスはIRの整合性を検査します。例えば `phi` から一方の先行ブロックの組を消すと、構造の不整合を検出できます。[llvm-asの仕様](https://llvm.org/docs/CommandGuide/llvm-as.html) · [optの仕様](https://llvm.org/docs/CommandGuide/opt.html)

```powershell
llvm-as choose-offset.ll -o choose-offset.bc
opt -passes=verify -disable-output choose-offset.bc
```

C++の例を `choose-offset.cpp` として保存すると、Clangが生成したIRも読めます。最適化を有効にすると、この例のような分岐は `select` などを使う形に変わる場合があります。出力を読むときは、コンパイラの版と最適化設定をそろえます。[ClangのLLVM IR出力](https://clang.llvm.org/docs/Toolchain.html#clang) · [コンパイラ最適化と未定義動作](/runtime/cpp-internals/optimization-and-ub.html)

```powershell
clang++ -std=c++17 -S -emit-llvm -O0 choose-offset.cpp -o before.ll
clang++ -std=c++17 -S -emit-llvm -O1 choose-offset.cpp -o after.ll
```

機械語を格納したオブジェクトファイルでは、別ファイルで定義される関数やデータへの参照をリンカーに渡します。[COFFの再配置](/compilers/coff-relocations.html)
