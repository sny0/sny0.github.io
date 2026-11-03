---
title: 浮動小数点の比較と誤差の扱い — 絶対許容差・相対許容差を決める
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: math
  summary: 厳密な等値と近似一致の目的を分け、絶対許容差と相対許容差を単位・値域・用途から決める。binary32入力用の比較方針、NaNや無限大、非推移性、到達判定、保存時に失う情報も扱う。
  aliases: [floating point comparison, 浮動小数点比較, 近似一致, approximate equality, absolute tolerance, 絶対許容差, relative tolerance, 相対許容差, epsilon, Single.Epsilon, NaN, 非推移性, ヒステリシス]
  verification: 一次資料照合（2026-11-03）
---

# 浮動小数点の比較と誤差の扱い — 絶対許容差・相対許容差を決める

浮動小数点の値を比べる前に、**同じ数値であることを調べるのか、この用途で十分近いことを調べるのか**を決めます。近似一致は、許した差の範囲に入るという判定です。計算が数学的に正しいことや、ゲームの物理状態が正しいことまで保証する機能ではありません。

この記事はC++20を基準に、**binary32の`float`入力を、binary64の`double`で比較する教材の方針**を示します。型名だけでこれらの形式が保証されるわけではありません。表せる値、丸め、刻み幅と環境の確認方法は[floatの表現と刻み幅](/data/floating-point-spacing.html)へ委ねます。

## 厳密な等値を使う場面

`a == b`は、比較に必要な型変換を行った後の値が等しいかを調べます。例えば、有限値をそのままコピーした結果や、プログラムが明示的に代入した`0.0f`、目標値を代入して完了させた状態を確認したい場合には、厳密な等値が目的に合います。「浮動小数点だから常に`==`を禁止する」という規則にはしません。[C++20草案N4861: expr.eq](https://timsong-cpp.github.io/cppwp/n4861/expr.eq)

一方、異なる計算経路の結果を比べたり、測定や近似計算の結果を期待値と比べたりするときは、完全な一致を要求する理由があるかを確認します。表示が同じでも内部の値が同じとは限らず、逆に、丸めによって元は異なる値が同じ保存値になる場合もあります。

また、IEEE形式の`==`は、ビット列の同一性を調べる操作でもありません。＋0と−0は等しく、NaNは自分自身とも等しくありません。これらの値を使うなら、特殊値をどう扱うかも比較の仕様に含めます。[Microsoft: /fp — special values](https://learn.microsoft.com/en-us/cpp/build/reference/fp-specify-floating-point-behavior?view=msvc-170)

## 許容差は、用途ごとに決める予算

**許容差**（tolerance）は、その判定で許す差の予算です。次の三つは区別します。

| 調べたいもの | 意味 |
| --- | --- |
| 比較の許容差 | 二つの保存値の差を、どこまで受け入れるか |
| 演算誤差の上限 | 入力や計算手順を分析し、真の値とのずれをどこまで保証できるか |
| 物理・製品上の要求 | 到着半径、測定精度、画面上で許すずれなどの仕様 |

許容差を大きくして判定が通っても、誤差の原因を除いたことにはなりません。分析や計測から比較の予算を決めることはできますが、**近いと判定された事実だけから、演算誤差の上限を逆に証明することはできません。**

## 絶対許容差と相対許容差

二つの有限値をa、bとし、差を`diff = |a − b|`とします。

| 許容差 | 判定 | 単位と役割 |
| --- | --- | --- |
| 絶対許容差`absTol` | `diff ≤ absTol` | a、bと同じ単位。何m、何秒までという予算 |
| 相対許容差`relTol` | `diff ≤ relTol × max(abs(a), abs(b))` | `relTol`は無次元の比率。値の大きさに応じた予算 |

絶対許容差は、値が大きくても小さくても同じ量です。説明用に`absTol = 0.25`、1unit＝1mとすると、0mと0.125mは受け入れ、0mと0.5mは受け入れません。この0.25mを、すべてのゲームで使う推奨値にはしません。

相対許容差では、双方の絶対値の大きい方を基準にします。説明用の`relTol = 1/1024`は約0.0977%です。a＝1024、b＝1025なら、差は1、基準は1025、許す差は`1025/1024 = 1.0009765625`なので受け入れます。aとbを入れ替えても同じ判定になる、対称な基準です。

### 組み合わせるときはORとして読む

本教材では、二つの予算を次のように組み合わせます。

```text
diff  = |a − b|
scale = max(|a|, |b|)
limit = max(absTol, relTol × scale)
近似一致: diff ≤ limit
```

`max`を使うので、これは**絶対条件または相対条件のどちらかを満たせば受け入れるOR判定**です。両方を同時に満たす必要はありません。この対称な組合せはPEP 485でも説明されています。本記事の入力型や許容差の制限、実装条件は後述する教材独自の契約です。[PEP 485: Proposed Implementation](https://peps.python.org/pep-0485/)

<figure class="study-figure">
  <img src="/images/math/comparison-tolerances.svg" alt="絶対許容差0.25で0と0.125を受け入れ、0と0.5を受け入れない例。相対許容差1/1024では1024と1025を受け入れるが、0と0.125は受け入れない。二つの条件をmaxで組み合わせるとOR判定になる。" width="760" height="1510" />
  <figcaption><strong>絶対許容差は同じ量、相対許容差は値の尺度に応じた量。</strong> 数値は仕組みを示す例で、実製品の推奨値ではありません。<a href="/study/images/math/comparison-tolerances.svg" target="_blank" rel="noopener noreferrer">二つの許容差の図を拡大</a></figcaption>
</figure>

### ゼロ付近で相対条件だけでは足りない理由

a＝0、b＝0.125の場合、相対許容差1/1024で許す差は`0.125/1024 = 0.0001220703125`です。実際の差0.125には届きません。0と非ゼロの値を比べると、差と基準の大きさが同じになるため、`relTol < 1`の相対条件だけでは受け入れられません。ゼロ付近をどこまで受け入れるかは、同じ単位の絶対予算で決めます。[PEP 485: Behavior near zero](https://peps.python.org/pep-0485/)

反対に、絶対予算だけなら大きな値でも許す差は変わりません。`absTol = 0.25`では1024と1025の差1を受け入れませんが、上の相対条件では受け入れます。二つを組み合わせる理由は、このような目的の違いにあります。

## 本教材の比較関数の契約

対象はbinary32の`float`入力二つです。許容差は`double`として受け取り、計算側もbinary64の`double`で行います。**任意の`double`入力まで扱う万能な比較関数という契約ではありません。**

| 処理する順序 | 方針 |
| --- | --- |
| 1. 許容差の検査 | `absTol`は有限かつ0以上。`relTol`は有限かつ0以上1未満。違反は例外 |
| 2. NaN | a、bのどちらかがNaNなら`false` |
| 3. 厳密な等値 | `a == b`なら`true`。＋0と−0、同符号の無限大も含む |
| 4. 残る非有限値 | 無限大と有限値、異符号の無限大などは`false` |
| 5. 有限値の計算 | 先に`double`へ拡張し、上の`diff ≤ limit`を評価 |

相対許容差を1未満にするのは、教材での意図を明確にするための選択です。一般の数値ライブラリがすべて同じ契約を採るわけではありません。許容差の検査を先に行うため、**aとbが同じ値でも、不正な許容差を渡せば例外**になります。

NaNは計算不成立などを示し得る値なので、今回の「近い」に含めません。同符号の無限大を受け入れるのは、等値の分岐を含めるという今回の方針です。すべての計測や物理判定で無限大を受け入れてよいという意味ではなく、有限入力を必須にする用途なら、その要件を別に検査します。`std::isfinite`は有限値と無限大・NaNを区別するAPIです。[Microsoft: isfinite](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/finite-finitef?view=msvc-170)

### 差を計算する前にdoubleへ拡張する

次は、許容差と特殊値の検査が済んだ後の計算部分です。`<algorithm>`と`<cmath>`を使い、a、bは`float`、許容差は`double`とします。

```cpp
const double da = static_cast<double>(a);
const double db = static_cast<double>(b);
const double diff = std::fabs(da - db);
const double scale = std::max(std::fabs(da), std::fabs(db));
const bool close = diff <= std::max(absTol, relTol * scale);
```

`float`から`double`への昇格は値を保存します。binary32の有限値二つの差はbinary64の値域に収まるので、**`float`のまま差を求める際のオーバーフローを避けられます**。`static_cast<double>(a - b)`では引き算を先に`float`で行うため、この目的を満たしません。[N4861: conv.fpprom](https://timsong-cpp.github.io/cppwp/n4861/conv.fpprom)、[Microsoft: IEEE Floating-Point Representation](https://learn.microsoft.com/en-us/cpp/build/ieee-floating-point-representation?view=msvc-170)

ただし、その後の差や積が数学的な実数として常に厳密になるという意味ではありません。判定の境界にも`double`の丸めが関わります。C++20の型名だけからbinary32／binary64だと決めず、実践記事では型の性質と実行条件を確認します。

## epsilonという名前だけで許容差を決めない

| 名前 | 意味 | binary32での値 |
| --- | --- | --- |
| C++の`numeric_limits<float>::epsilon()` | 1と、1より大きい最小の表現可能値との差 | 2⁻²³、約1.19×10⁻⁷ |
| C#の`Single.Epsilon`／`float.Epsilon` | 最小の正の`Single`値 | subnormalを保持する通常の条件で2⁻¹⁴⁹、約1.40×10⁻⁴⁵ |

この二つは同じ量ではありません。C++の定義は1付近の刻み幅で、C#の定義はゼロの直上の最小値です。`.NET`の資料にも、`Single.Epsilon`を一般的な精度の尺度として使わないことや、プラットフォームによる扱いの注意があります。どちらも、名前だけから全域共通の比較予算にはできません。[N4861: epsilon](https://timsong-cpp.github.io/cppwp/n4861/numeric.limits.members#25)、[Microsoft: Single.Epsilon](https://learn.microsoft.com/en-us/dotnet/api/system.single.epsilon?view=net-10.0)

## 保存済みの値から、失った差は復元できない

binary32の2²⁴付近では、大きい側の隣までの間隔が2です。数学上の16,777,217を最近接偶数で保存すると、16,777,216になります。その後で二つを比べれば、厳密な等値も近似一致も`true`になり得ます。

比較側で`double`に拡張しても、**保存前に失った1という差は戻りません**。1unit＝1mなら、失った情報は1mです。問題が入力の表現や座標の持ち方にある場合、比較の許容差を変更するだけでは解決できません。丸めの具体例は[刻み幅の記事](/data/floating-point-spacing.html)を参照してください。

## 近似一致は推移しない

絶対許容差1、相対許容差0で、a＝0、b＝0.75、c＝1.5を考えます。aとbの差、bとcの差はそれぞれ0.75なので受け入れます。しかしaとcの差1.5は受け入れません。**aがbに近く、bがcに近くても、aがcに近いとは限りません。**

これは、等値に期待する推移性を満たさない例です。近似一致をそのままキーの同値関係に使ったり、差が小さければ同順位とする比較器を組み立てたりしてはいけません。C++の並べ替え用の比較には厳密弱順序、ハッシュコンテナのキー比較には同値関係など、別の契約があります。本記事の関数はその代替ではありません。[N4861: ordering requirements](https://timsong-cpp.github.io/cppwp/n4861/alg.sorting)、[unordered container requirements](https://timsong-cpp.github.io/cppwp/n4861/unord.req)

<figure class="study-figure">
  <img src="/images/math/comparison-pitfalls.svg" alt="許容差1で0と0.75、0.75と1.5は近いが0と1.5は近くない非推移性の例。floatへの保存時に失った1を比較では復元できないこと、特殊値の方針や到達判定は別に決めることも示す。" width="760" height="1400" />
  <figcaption><strong>「近い」は、数学上の等値や状態遷移の規則をそのまま置き換えない。</strong> 例の値と予算は説明用です。<a href="/study/images/math/comparison-pitfalls.svg" target="_blank" rel="noopener noreferrer">比較の落とし穴の図を拡大</a></figcaption>
</figure>

## ゲームの到達判定は、目的から別に設計する

位置への到達を知りたいなら、「座標の二つの数が近い」だけでなく、**目標までの距離を、許す到達半径と比べる**という仕様を決めます。ワールド座標そのものに相対許容差を掛けると、原点から遠いほど同じ実距離の差を受け入れやすくなります。

一更新で0→0.75→1.5と進むものは、目標1を通り過ぎても、狭い一致範囲へ一度も入りません。通過を検出する、残り距離を超える移動なら目標にclamp（制限）する、といった動作を設計します。到達後に目標値そのものを代入するなら、その後の厳密な等値にも明確な意味があります。

境界の前後で状態が頻繁に切り替わるなら、入る距離より出る距離を大きくし、その間では前の状態を保つ**ヒステリシス**が別の設計候補です。許容差を大きくすること、通過への対応、状態を安定させることは、それぞれ目的が異なります。

## 用途・単位・値域から選ぶ

比較する量と単位、想定する値域、どこまでの差を受け入れるかを先に定めます。ゼロ付近の予算は何unitか、大きな値では何割の差までよいか、境界での判定が状態にどう影響するかを確認します。ここに載せた`0.25`や`1/1024`を、そのまま共通定数として採用することはしません。

コンパイラがNaNや丸めを省略・変更できる設定では、特殊値を含む契約も再確認が必要です。本教材の実践ではMSVCの`/fp:strict`など、浮動小数点の扱いを確認した条件で観察します。[Microsoft: /fp](https://learn.microsoft.com/en-us/cpp/build/reference/fp-specify-floating-point-behavior?view=msvc-170)

[C++とC#で浮動小数点の比較を観察する](/practice/math/float-comparison-observation.html)には、この契約を具体化したサンプルを置きます。表現の土台は[floatの表現と刻み幅](/data/floating-point-spacing.html)、分野全体の案内は[情報表現の学習ガイド](/guide/low-level/computer-and-data.html)を参照してください。
