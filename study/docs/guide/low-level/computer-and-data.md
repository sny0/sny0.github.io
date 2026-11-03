---
title: 第1章 コンピュータと情報の表現
study:
  source: IT教本
  status: outline
  summary: ビット・整数・浮動小数点・文字の表現を学ぶ順序と演習を案内し、整数表現と浮動小数点の辞典本文・観察例へつなぐ。
  verification: 一次資料照合（2026-11-03）
  section: learning
  format: path
  domain: data
  collection: low-level
  order: 2
---

<div id="第1章-コンピュータとは何か-──-情報の表現" class="study-legacy-anchor" aria-hidden="true"></div>

# 第1章 コンピュータと情報の表現

## このページで案内すること

ビット列から整数・浮動小数点・文字・ファイル表現へ進むための**学習計画・概要**です。表現の違いを小さなプログラムで観察する題材を選びます。Unicodeやファイル形式などの専用の辞典本文は、まだ整備していません。

## 関連する辞典本文・実践

- [ビット・バイト・整数表現](/data/integer-bits-and-bytes.html)で、整数の幅、符号、型変換、バイト順を調べられます。
- [整数とバイト列の観察](/practice/data/integer-byte-observation.html)で、小さなC++プログラムによる確認へ進めます。
- [浮動小数点と値の間隔](/data/floating-point-spacing.html)で、binary32の表現、丸め、値の大きさと刻み幅の関係を調べられます。
- [浮動小数点の間隔を観察する](/practice/data/float-spacing-observation.html)で、0.1、2^24、大きな座標の例を確認できます。
- [メモリレイアウト・エンディアン](/runtime/cpp-internals/memory-layout.html)では、構造体の整列・パディングと、バイト順を区別します。
- [セーブデータのケーススタディ](/design/case-studies/save-data.html)では、表現の知識を保存形式の設計へつなげられます。

## 学ぶ理由

すべてのゲームデータ ── 座標、HP、テクスチャ、サウンド、セーブデータ ── は
最終的に**ビット列**である。「floatの精度でキャラがガタつく」「色が変」
「セーブデータが壊れた」といった実務のバグは、ビットレベルの表現を
知らないと原因にたどり着けない。ここは全20章の土台の土台。

## 到達目標

- 任意の整数を2進数・16進数で読み書きできる
- 2の補数による表現と、符号付き・符号なしの間の値の変換を区別できる
- IEEE 754浮動小数点の構造(符号・指数・仮数)を説明できる
- 「floatで0.1が正確に表せない」「大きな座標で精度が落ちる」理由が分かる
- 文字コード(ASCII/UTF-8)とエンディアンを説明できる

## 前提知識

なし。ここが出発点。

整数のC++例は**C++20**を対象にします。C++の1バイトは`sizeof`が数える単位で、ビット数は`CHAR_BIT`で確認します。以下の32ビット整数の観察例では、**`CHAR_BIT == 8`で`std::uint32_t`が提供される環境**を前提にします。`int`が常に32ビットとは限らず、固定幅型もすべての処理系で提供されるわけではありません。[C++20草案のメモリモデル](https://timsong-cpp.github.io/cppwp/n4861/intro.memory)と[固定幅整数型](https://timsong-cpp.github.io/cppwp/n4861/cstdint.syn)を参照してください。

## 学ぶ内容

1. **2進数・16進数**
   - ビット、バイト、ワード。なぜ16進数を使うか(4bit=1桁でビットと相性が良い)
   - ビット演算: AND/OR/XOR/NOT、シフト。フラグ管理 `flags |= JUMPING`
2. **整数の表現**
   - 符号なし整数と2の補数。C++20の符号付き整数では、対応する符号なし整数と2の補数の関係で値を表す。これは古いC/C++のすべてにそのまま当てはまる前提ではない
   - 演算が幅Nの符号なし整数型で行われる場合、結果は2^Nを法とする。符号付き整数の算術で結果がその型の表現範囲を超えると未定義動作になる。[C++20草案の整数型](https://timsong-cpp.github.io/cppwp/n4861/basic.fundamental)を参照
   - ただし、小さい符号なし整数型は演算前に`int`などへ**整数昇格**する。8ビット型の変数同士でも、加算が8ビット幅で行われるとは限らない。格納先への変換と、演算に使われる型を分ける。[整数昇格](https://timsong-cpp.github.io/cppwp/n4861/conv.prom)と[通常の算術型変換](https://timsong-cpp.github.io/cppwp/n4861/expr.arith.conv)を参照
   - 例えば`(int)-1 == (unsigned)0xFFFFFFFF`は、`unsigned int`が32ビットの環境では真になるが、比較時の値の変換による結果であり、メモリ表現を調べる式ではない。幅が異なれば結果も変わり得る。2の補数の証明としては使わない。[整数変換](https://timsong-cpp.github.io/cppwp/n4861/conv.integral)を参照
   - 固定小数点数(昔のゲーム機や、演算の再現性を設計したい場面で使う)。
     これを選ぶだけで決定性が保証されるわけではなく、丸め・溢れ・処理順も揃える
3. **浮動小数点 (IEEE 754)**
   - 本章では一般的なIEEE 754 binary32のfloatを例にする:
     符号1 + 指数8 + 格納する仮数部23bit。正規化数では先頭の1を含めて有効精度24bitとなる。C/C++の型名だけでこの形式が保証されるわけではない
   - 正規化数では、絶対値が大きくなると隣の表現可能な値までの**絶対的な間隔**が段階的に広がる。大座標で小さな移動が丸められる理由の一つであり、カメラ相対の計算や原点移動を検討する。0近くの非正規化数（subnormal）の領域では間隔は一定で、相対精度は下がる。[MSVCのIEEE表現と非正規化数](https://learn.microsoft.com/en-us/cpp/build/ieee-floating-point-representation?view=msvc-170)を参照
   - 特殊値: NaN, Inf, ±0。NaNと自身の`==`比較は偽になるなど、通常の有限値とは扱いが異なる。すべての関数や最適化設定で同じ伝播をすると決めつけない
   - `0.1 + 0.2 != 0.3`は、例えば`double`がbinary64で、各段階をその精度の最近接・偶数丸めで評価する場合の例。表現できない10進数の変換と、加算時の丸めを分けて読む。`float`版でも常に不一致になる、という規則ではない。中間精度・丸めモード・コンパイラ設定も確認する。[MSVCの浮動小数点設定](https://learn.microsoft.com/en-us/cpp/build/reference/fp-specify-floating-point-behavior?view=msvc-170)を参照
   - 比較方法は用途で選ぶ。`numeric_limits<float>::epsilon()`は1とその次の表現可能な値の差であり、任意の値の誤差上限や万能な許容値ではない。近似一致には値の規模に応じた相対許容誤差と、0付近の絶対許容誤差を検討する。厳密一致が必要な場面やNaN/Infも別途扱う。[C++20草案のepsilon](https://timsong-cpp.github.io/cppwp/n4861/numeric.limits.members)と[浮動小数点の本文](/data/floating-point-spacing.html)へ
4. **文字と色の表現**
   - ASCII、Unicode、UTF-8/UTF-16。OSやエンジンの名前だけで文字列の形式を決めず、使用するAPIやファイル形式の仕様を確認する
   - 色: RGBA8888、リニア色空間とsRGB(第12章で再訪)
5. **エンディアン**
   - リトル/ビッグエンディアンは、複数バイトの値をアドレス順に並べるときのバイト順。バイト内のビットを反転する話ではない
   - 実行環境のバイト順と、アセット・セーブデータ・通信プロトコルが定めるバイト順を区別する。ARMやGPUを一括して同じ順序と決めつけない。詳しくは[整数表現の本文](/data/integer-bits-and-bytes.html)へ
6. **ノイマン型アーキテクチャの概観**
   - 「命令もデータもメモリに保持し、CPUが命令を読み出して処理する」という説明モデル
   - 現代CPUが内部でも常に1命令ずつ順番に完了させる、という意味ではない

## 重要概念

- **ビット列の意味は形式と解釈で決まる。** 同じ32ビットでも、整数、binary32の浮動小数点、色など、選んだ形式によって意味が変わる。値を変換するキャストと、表現のバイトを調べる操作は別であり、任意の型のポインタで読み替えてよいわけではない。
- **2の補数**: 加算の仕組みを使って減算も扱える整数表現
- **浮動小数点には表現と演算の丸めがある**: 許容できる誤差と、その扱いを設計する
- **値の間隔と許容誤差を区別する**: binary32の正規化数の精度は10進数で約7桁が目安だが、10進小数がその桁まで正確に格納されるという意味ではない。非正規化数では相対精度も下がる

## ゲーム開発との関係

| 現場の事象 | この章の知識 |
|---|---|
| ビットフラグでの状態管理 | ビット演算 |
| 座標が大きいと物理・アニメが暴れる | floatの値の間隔と演算時の丸め |
| リプレイ再現が環境でズレる | 演算順・コンパイラ設定・乱数・更新順の再現性。固定小数点も選択肢 |
| セーブデータ/アセットのバイナリ解析 | 16進ダンプ、エンディアン |
| 日本語ファイル名/テキストの文字化け | UTF-8/UTF-16 |
| HDR対応で色が変わった | 色の数値表現・色空間 |

## 演習

1. 電卓を使わず 0xDEADBEEF を10進・2進に変換せよ。
2. `float`がbinary32で、加算結果をその精度の最近接・偶数丸めで格納する環境で、`float f = 16777216.0f; f += 1.0f;` を観察せよ。`std::nextafter`で2^24の次の値も調べ、間隔2の中間にある2^24+1が元の値へ丸められる理由を、有効精度24bitと併せて説明せよ。まずは[実践の条件と確認手順](/practice/data/float-spacing-observation.html)を使う。
3. `CHAR_BIT == 8`、`sizeof(float) == sizeof(std::uint32_t) == 4`、`float`がbinary32の環境で、`memcpy`により`float`の表現を`std::uint32_t`へ写し、符号・指数・仮数を分解せよ（1.0f、-2.5f、0.1f）。整数と浮動小数点のバイト順が対応することも確認する。サイズが合わない状態でコピーしない。保存された表現と加算時の丸めは別々に観察する。
4. プレイヤー状態(ジャンプ中/無敵/ダッシュ中...)を1つの`std::uint32_t`の
   ビットフラグで管理する関数群(set/clear/test)を書け。
5. バイナリエディタ(VSの「バイナリで開く」やHxD)でBMPファイルを開き、
   ヘッダの幅・高さをリトルエンディアンで読み取れ。

## おすすめ書籍

- 『プログラムはなぜ動くのか』矢沢久雄 ── 最初の1冊として最適
- 『コンピュータシステムの理論と実装(Nand2Tetris)』── 第2章と併読
- 『Land of Lisp』…は不要。寄り道しないこと
- (英語余裕があれば)"Computer Systems: A Programmer's Perspective (CS:APP)"
  第2章 ── 情報表現の決定版。邦訳『コンピュータ・システム』

## おすすめOSS

- [float.exposed](https://float.exposed) / [IEEE754 Visualizer] ── 浮動小数を
  ビット単位でいじれるWebツール(OSSではないが実験場として最高)
- stb_image (GitHub: nothings/stb) ── 画像=バイト列であることが分かる
  1ファイルCライブラリ。読むのは第5章以降でよいが存在を知っておく

## おすすめ動画

- Ben Eater "How do computers read binary?" ほか (YouTube, 英語・字幕可)
- 「浮動小数点数」で検索して出るCEDECの数値精度系講演
- Computerphile "Floating Point Numbers"

## 読むべきソースコード

- UE5 `Engine/Source/Runtime/Core/Public/Math/Float16.h` ── 半精度floatの
  ビット操作の実例(第17章で戻ってきたときに読めるようになっている)
- Quake III `q_math.c` の高速逆平方根(0x5f3759df)── 「ビットの再解釈」の
  最も有名な実例。今は雰囲気だけ眺め、第4章後に再読

## 理解度チェック

1. なぜコンピュータは2進数なのか?(電気的な理由で)
2. 2の補数で値を表す8ビット符号付き整数の範囲が -128〜127 と非対称なのはなぜ?
3. floatの `0.1f` が正確に0.1でないのはなぜ? どう比較すべき?
4. 座標(100000.0f, 0, 0)付近でキャラが小刻みに震える。原因と対策を述べよ。
5. 8ビットの1バイトが0x41のとき、符号なし整数として・ASCII文字として何を表すか?
6. `CHAR_BIT == 8`のリトルエンディアン環境で、`std::uint32_t x = 0x12345678;` の4バイトは、アドレスの小さい側からどう並ぶか?

---

## この章がゲームのどこで使われているか

```
ボタン → OS → ゲームループ → エンジン → GPU → 画面
                  │            │        │
                  ▼            ▼        ▼
           HP,座標,フラグ   Transform  頂点データ,色
           = int/float     = float×16  = float/半精度/sRGB
           ─────────── すべて「ビット列+解釈」───────────
     セーブデータ・アセットファイル・ネットパケットも全部バイト列
```

## 記述の確認資料

- [C++20草案 N4861: 基本型と整数表現](https://timsong-cpp.github.io/cppwp/n4861/basic.fundamental)
- [C++20草案 N4861: 整数昇格](https://timsong-cpp.github.io/cppwp/n4861/conv.prom)・[整数変換](https://timsong-cpp.github.io/cppwp/n4861/conv.integral)・[通常の算術型変換](https://timsong-cpp.github.io/cppwp/n4861/expr.arith.conv)
- [WG14 N1570: C11 committee draft (5.1.2.3, 6.2.4, 6.5, 6.7.2.1)](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)
- [Microsoft: Single.Equals — comparison tolerance](https://learn.microsoft.com/en-us/dotnet/api/system.single.equals?view=net-10.0)
- [MSVC: /fp floating-point behavior](https://learn.microsoft.com/en-us/cpp/build/reference/fp-specify-floating-point-behavior?view=msvc-170)
- [MSVC: IEEE Floating-Point Representation](https://learn.microsoft.com/en-us/cpp/build/ieee-floating-point-representation?view=msvc-170)
- [C++20草案 N4861: numeric_limits](https://timsong-cpp.github.io/cppwp/n4861/numeric.limits.members)
- [Box2D: Determinism](https://box2d.org/posts/2024/08/determinism/)

整数に関するC++20の説明と、浮動小数点の表現・実行条件・epsilonの説明を2026-11-03に一次資料と照合しました。N4861へのリンクは規格草案本文のHTML表示です。このページの演習は学習題材であり、今回すべての環境で実行したものではありません。
