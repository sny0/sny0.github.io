---
title: floatが表せる値と丸め — binary32の表現と刻み幅
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: data
  summary: binary32の符号・指数・小数部から値を読み、normalとsubnormalの刻み幅、最近接偶数への丸め、0.1fと大きな座標の精度を調べる。C++20の保証とMSVCの実行条件、epsilonとnextafterの役割も区別する。
  aliases: [float, floating point, 浮動小数点, binary32, IEEE 754, IEC 559, significand, 仮数, 指数, 丸め, 最近接偶数, round to nearest ties to even, normal, subnormal, 非正規化数, epsilon, nextafter, bit_cast, numeric_limits]
  verification: 一次資料照合（2026-11-03）
---

# floatが表せる値と丸め — binary32の表現と刻み幅

浮動小数点数は、一定範囲のすべての実数を保存する型ではありません。**表せる値が離れた点として並び、その間の値は丸めて表します。** binary32のnormalでは、絶対値の桁が上がると点の間隔が広くなります。ゲームの座標や時間を読むときも、値の範囲と、その周辺の刻み幅を分けて考えます。

ここではC++20を主対象に、IEEE 754の32bit形式である**binary32**を説明します。C++の型名`float`だけから、必ずこの形式であるとは決まりません。[公開C++20草案N4861: basic.fundamental](https://timsong-cpp.github.io/cppwp/n4861/basic.fundamental)

## floatという型と、観察する環境

具体例は**通常のMSVC・Windows x64の`float`**です。MSVCは`float`に4byteのIEEE単精度形式を使います。これをC++規格の全処理系に対する保証とは分けます。[Microsoft: IEEE Floating-Point Representation](https://learn.microsoft.com/en-us/cpp/build/ieee-floating-point-representation?view=msvc-170)

別環境で同じビットの図を使う前に、次の性質を確認します。`std::numeric_limits<float>`は`<limits>`で調べる型の性質です。

| 確認するもの | 今回の具体例の前提 | 読み方 |
| --- | --- | --- |
| `CHAR_BIT`と`sizeof(float)` | 8、4 | 1byte＝8bitで、格納全体は32bit |
| `is_iec559` | `true` | IEC 60559／IEEE 754に従う型であることの指標 |
| `radix` | 2 | 基数が2 |
| `digits` | 24 | normalの有効桁数が2進24桁 |
| `min_exponent` | −125 | 最小normalは2の「この値−1」乗 |
| `max_exponent` | 128 | 最大のnormalの指数に1を加えた値 |

**最小normalの指数−126と、`min_exponent`の−125は同じ数値ではありません。** メンバーの定義に1の差があります。また、`is_iec559`だけを確認して、任意の処理系のビット配置やコンパイラの最適化条件まで同一と判断するものではありません。[N4861: numeric.limits.members](https://timsong-cpp.github.io/cppwp/n4861/numeric.limits.members)

以下の演算結果は、特に断らない限り、binary32へ**最近接偶数**で丸め、subnormalを保持する条件で読みます。実行時の丸めモードやMSVCの`/fp`設定は、型の格納形式とは別に確認します。

## binary32の三つのフィールド

binary32は、符号1bit、格納された指数8bit、小数部23bitからなります。ここでは符号をS、指数フィールドを整数として読んだ値をE、小数部フィールドを整数として読んだ値をFとします。上位ビットから説明しており、アドレス順のバイト列とは別です。

**normal（正規化数）**の範囲では、値は次の式になります。

```text
値 = (−1)^S × (1 + F / 2^23) × 2^(E − 127)
条件: 1 ≦ E ≦ 254、0 ≦ F < 2^23
```

指数に127を足して格納する仕組みを**バイアス**と呼びます。`1 + F / 2^23`は、2進数では`1.xxxxx…`の形です。先頭の1は格納を省略できるので、**小数部23bitと、隠れた1bitを合わせて有効桁は24bit**になります。この隠れた1はnormalの規則です。[Microsoft: IEEE Floating-Point Representation](https://learn.microsoft.com/en-us/cpp/build/ieee-floating-point-representation?view=msvc-170)

例えば1.5は、2進で`1.1 × 2^0`です。S＝0、E＝127、F＝2²²となり、この環境の32bit表現を16進で書くと`0x3FC00000`です。Fは小数そのものを格納した整数ではなく、`2^23`で割って小数部として読むフィールドです。

<figure class="study-figure">
  <img src="/images/data/binary32-layout.svg" alt="binary32を符号1bit、指数8bit、小数部23bitに分け、1.5の表現0x3FC00000を読む図。normalには隠れた1があり、指数フィールドが0または255のときは別の規則になる。" width="760" height="1410" />
  <figcaption><strong>格納する小数部は23bit、normalの精度は24bit。</strong> ビットの役割の図であり、メモリのバイト順を示すものではありません。<a href="/study/images/data/binary32-layout.svg" target="_blank" rel="noopener noreferrer">binary32の構成図を拡大</a></figcaption>
</figure>

### E＝0とE＝255は別に読む

| E | F | 分類 |
| --- | --- | --- |
| 1〜254 | 任意 | normal |
| 0 | 0以外 | subnormal：隠れた1を使わないゼロ付近の数 |
| 0 | 0 | Sに応じた＋0または−0 |
| 255 | 0 | Sに応じた＋∞または−∞ |
| 255 | 0以外 | NaN：数ではない値を表す分類 |

**subnormal（非正規化数）**では`1.F`ではなく`0.F`として読みます。∞やNaNを、非常に大きい通常の有限値として同じ式へ入れることもできません。ここでは分類までを扱い、例外やNaNの詳細な種類は別テーマとします。[Oracle Numerical Computation Guide: Single Format](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_math.html)

## 表現するときと、演算するときの丸め

10進数の0.1は、数学では正確な1/10です。しかし2進では小数部が循環し、有限の桁で書き切れません。したがってbinary32のどの値とも完全には一致しません。[Oracle: Floating-point Formats](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html)

今回のMSVC環境で`0.1f`を表すと、ビット表現は`0x3DCCCCCD`、その値を正確に10進で書くと次になります。

```text
数学上の値:       0.1
binary32の近似値: 0.100000001490116119384765625
```

これはまず**値を表す段階での近似**です。表示桁数が少ないと`0.1`と表示されても、保存した値が数学上の1/10になったわけではありません。`f`付きリテラルは`float`、付かない`0.1`は`double`です。C++20自体にはリテラルの変換について実装定義の選択があるので、このビット列は対象環境で確かめる具体例として、一般規格の保証と区別します。[N4861: lex.fcon](https://timsong-cpp.github.io/cppwp/n4861/lex.fcon)

さらに、表せる値同士を計算しても、その数学的な結果が表せるとは限りません。その場合には**演算結果を格納する段階でも丸め**が必要になります。入力の近似と、演算に伴う丸めは別の出来事です。「小数を一度読み込んだときだけ誤差が入る」とは考えません。[Oracle: Rounding Error](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html)

### 最近接偶数とは

最近接丸めでは、表せる隣の値のうち近い方を選びます。ちょうど中間なら、**保持する有効桁の最下位bitが0になる方**を選ぶのが最近接偶数です。「10進表示の末尾が偶数」という規則ではありません。MSVCの`FE_TONEAREST`は、この中間値の扱いを持ちます。[Microsoft: fegetround / fesetround](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/fegetround-fesetround2?view=msvc-170)

## normalの刻み幅は指数で変わる

正のnormalで、値が**[2ᵉ, 2ᵉ⁺¹)**にあるとき、次の大きい有限値との間隔は、最大有限値を除いて**2ᵉ⁻²³**です。角括弧は左端を含み、丸括弧は右端を含まないことを示します。ここでのeは、格納フィールドEから127を引いた実際の指数です。

この間隔はnormalの式から求まります。Fを1増やすと小数部が`1 / 2^23`増え、それに`2^e`を掛けるためです。区間内の点は等間隔で、区間を一つ上がると間隔が2倍になります。

| 正の値の周辺 | e | 大きい側の隣までの間隔 |
| --- | ---: | ---: |
| 1 | 0 | 2⁻²³ ≈ 0.00000011920928955 |
| 100,000 | 16 | 2⁻⁷ ＝ 0.0078125 |
| 1,048,576（2²⁰） | 20 | 2⁻³ ＝ 0.125 |
| 8,388,608（2²³） | 23 | 1 |
| 16,777,216（2²⁴） | 24 | 2 |

**2の整数乗ちょうどの点では、前後の間隔が異なります。** 1の小さい側の隣までは2⁻²⁴、大きい側は2⁻²³です。2²⁴では小さい側が1、大きい側が2になります。ただし最小normalの境界では、下側がsubnormalなので、この「下側は半分」という説明を適用しません。

<figure class="study-figure">
  <img src="/images/data/float-spacing.svg" alt="1付近、100000付近、2の24乗付近で、binary32の表せる値の間隔を比較する図。1と2の24乗では前後の間隔が異なり、16777217は表せる二つの値の中間で最近接偶数により16777216へ丸められる。段ごとに縮尺は異なる。" width="760" height="1470" />
  <figcaption><strong>有効桁数が一定でも、値の単位で測った刻み幅は一定ではない。</strong> 各段の縮尺は別です。図の「前」「後」は値の大小であり、メモリの並びではありません。<a href="/study/images/data/float-spacing.svg" target="_blank" rel="noopener noreferrer">刻み幅の図を拡大</a></figcaption>
</figure>

### subnormalの間隔は一定

subnormalの正の値は、`F × 2^-149`です。最小の正の値は2⁻¹⁴⁹、隣との間隔も2⁻¹⁴⁹で一定になります。最小normalの2⁻¹²⁶との境界も同じ間隔でつながります。**ゼロへ近づくほど、いつまでも値に比例して細かくなる仕組みではありません。** 隠れた1を使わない領域では、有効な桁数もnormalの24bitと同じには保てません。[Oracle: Single Format / Subnormal Numbers](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_math.html)

`numeric_limits<float>::min()`は、subnormalがある浮動小数点型では最小の正のnormalです。最小の正のsubnormalを調べる`denorm_min()`、最も負の有限値を調べる`lowest()`と区別します。[Microsoft: numeric_limits](https://learn.microsoft.com/en-us/cpp/standard-library/numeric-limits-class?view=msvc-170)

## 2²⁴＋1が2²⁴へ丸められる理由

2²⁴の直後には2刻みで点が並ぶので、数学上の16,777,217は表せません。表せる16,777,216と16,777,218の**ちょうど中間**です。最近接偶数では、最下位bitが0の16,777,216側を選びます。

```text
表せる値:  16,777,216       16,777,218
                    ↑
数学上の結果:   16,777,217
binary32へ最近接偶数で丸める結果: 16,777,216
```

2²⁴と1はそれぞれ正確に表せるので、この例は「入力が10進小数だから」起きる現象ではありません。正確な二つの入力からでも、結果を保存するときに1が失われます。一方、16,777,218は表せるので、「2²⁴を超えた整数はすべて表せない」という意味でもありません。

## nextafterとepsilonが示すもの

`<cmath>`の`std::nextafter`は、指定した方向にある**次の表現可能な値**を返します。`float`の隣を調べるなら、両引数を`float`にそろえます。次は`<cmath>`と`<limits>`を使う関数内の例です。[Microsoft: nextafter functions](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/nextafter-functions?view=msvc-170)

```cpp
float x = 100000.0f;
float next = std::nextafter(x, std::numeric_limits<float>::infinity());
float gap = next - x; // このbinary32環境では0.0078125f = 1/128
```

`std::numeric_limits<float>::epsilon()`は、**1と、1より大きい最小の表現可能値との差**です。binary32では2⁻²³です。全範囲で隣の値までの距離がこの値になるわけではなく、あらゆる比較にそのまま使える許容誤差でもありません。[N4861: numeric.limits.members — epsilon](https://timsong-cpp.github.io/cppwp/n4861/numeric.limits.members#25)

ゲームの座標なら、刻み幅をゲーム内の単位に読み替えます。例えば1unit＝1mなら、100,000付近の刻みは約7.8mm、2²⁴付近の大きい側は2mです。後者では座標に1mを加えようとしても、丸めた結果が同じ座標になり得ます。必要な最小の変化、座標の大きさ、単位の定義を合わせて評価します。比較の許容誤差をどう設計するかは、この刻み幅の説明とは別の課題です。

## bit_castは表現を読む操作

C++20の`std::bit_cast`は、同じ大きさのtrivially copyableな型（バイト列のコピーで値を移せる種類の型）の間で、ビット表現に対応する値を作ります。次は`<bit>`と`<cstdint>`を使い、上記のMSVC x64の配置と、`uint32_t`が利用可能であることを確認した環境の例です。

```cpp
constexpr auto bits = std::bit_cast<std::uint32_t>(1.5f); // 0x3FC00000
constexpr auto number = static_cast<std::uint32_t>(1.5f); // 数値変換なので1
```

前者は浮動小数点のフィールドを読むため、後者は数値を整数へ変換するための操作です。元の変数の型を変えたり、バイト順を交換したりする機能ではありません。同じ大きさという条件などは`bit_cast`の契約で、`float`が4byteという推測だけで満たしたことにはしません。[N4861: bit.cast](https://timsong-cpp.github.io/cppwp/n4861/bit.cast)

## 観察時の丸めとコンパイラ設定

型の性質がbinary32でも、式の途中の精度や丸めの扱いは、コンパイラと実行条件も確認します。MSVCで実行時の浮動小数点環境を読み書きする観察には`/fp:strict`を使います。`/fp:fast`には演算の並べ替えや丸めの省略を許す最適化があり、同じ実験条件として扱いません。`/fp:strict`でも中間計算が常に保存先の型と同じ精度になる、という説明はしません。[Microsoft: /fp](https://learn.microsoft.com/en-us/cpp/build/reference/fp-specify-floating-point-behavior?view=msvc-170)

`std::fesetround(FE_TONEAREST)`の成功と、`std::fegetround()`の結果を確認し、実行時の計算結果を`float`へ保存して観察します。実行時に設定した丸めモードが、翻訳時のリテラル変換や定数式まで変更するわけではありません。[Microsoft: fegetround / fesetround](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/fegetround-fesetround2?view=msvc-170)

C#、Unity、GPUの結果へ広げるときも、実行基盤と精度の設定を確認します。単に型名が同じだから、この実験の結果がそのまま一致するとは判断しません。

[C++でfloatの刻み幅と丸めを観察する](/practice/data/float-spacing-observation.html)では、型の性質、0.1fの表現、隣の値、2²⁴の中間値を確認します。ビット・16進数・バイト順の土台は[整数をビット列・16進数・バイト列で読む](/data/integer-bits-and-bytes.html)、分野全体の案内は[情報表現の学習ガイド](/guide/low-level/computer-and-data.html)を参照してください。
