---
title: 整数をビット列・16進数・バイト列で読む
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: data
  summary: 整数の値・基数による表記・型のビット表現・メモリのバイト列を分けて読む。unsignedの剰余、2の補数、C++20の変換規則、整数昇格、エンディアンと保存形式を区別する。
  aliases: [bit, ビット, byte, バイト, octet, オクテット, binary, 2進数, hexadecimal, 16進数, unsigned, signed, 2の補数, two's complement, integer promotion, 整数昇格, endianness, エンディアン, little-endian, big-endian, CHAR_BIT, uint32_t]
  verification: 一次資料照合（2026-11-03）
---

# 整数をビット列・16進数・バイト列で読む

整数を調べるときは、**値、数字の書き方、型のビット表現、アドレス順のバイト列**を分けます。同じ`0xFF`でも、数として255と書くことと、8bitの符号付き整数を構成する全ビットが1であることは、読み方が異なります。

ここでは**C++20**を主対象にします。版で変わる規則はC++17以前と区別し、C言語の規格の話へそのまま広げません。規則の出典には[公開C++20草案N4861のHTML表示](https://timsong-cpp.github.io/cppwp/n4861/)を使います（[WG21公開PDF](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2020/n4861.pdf)）。図とバイト列の具体例では、特に断らない限り**1byte＝8bit、余分なビットのない整数表現**を前提にします。

## 値と基数による表記

**bit（ビット）**は0か1で表す一桁です。**基数**は位取りの基準で、2進数なら各桁の重みが右から1、2、4、8……、16進数なら1、16、256……になります。

| 表記 | 同じ値の書き方 |
| --- | --- |
| 10進数 | `18` |
| 2進数 | `0b0001'0010` |
| 16進数 | `0x12` |

`0x`は16進、`0b`は2進を示すC++の接頭辞です。16進の`A`〜`F`は10〜15を表します。桁を区切る`'`や先頭側のゼロは、この例の数値を変えません。ただしC++の整数リテラルの**型**は、接頭辞・接尾辞・値に関する規則で決まるため、あらゆる表記が同じ型になるという意味ではありません。[N4861: lex.icon](https://timsong-cpp.github.io/cppwp/n4861/lex.icon)

**16進1桁は4bitに対応**します。`16 = 2⁴`なので、4bitの`0000`〜`1111`を16進の`0`〜`F`一桁で書けます。8bitなら16進2桁、32bitなら8桁です。例えば、値305,419,896は次のように読めます。

```text
16進:       1    2    3    4    5    6    7    8
2進:     0001 0010 0011 0100 0101 0110 0111 1000
表記:    0x12345678
```

この左から右への数字の並びは、**上位桁から書いた表記**です。まだ、メモリの先頭からどのバイトが置かれるかを示してはいません。

## byteと型の幅の前提

通信やファイル形式では、8bitを明確に**オクテット（octet）**と呼ぶことがあります。一方、C++のbyteは基本的な記憶単位で、ビット数は実装に依存し、`<climits>`の`CHAR_BIT`で確認します。少なくとも8bitですが、一般規格として常に8とは決めません。[N4861: intro.memory](https://timsong-cpp.github.io/cppwp/n4861/intro.memory)

`sizeof(T)`は**C++のbyte単位**の大きさで、`sizeof(char)`は1です。したがって`sizeof(T) * CHAR_BIT`は、その型のオブジェクトが占めるビット数になります。型一般では、そのすべてが値を表すビットとは限りません。余分なビットや構造体の配置の詳細は[メモリレイアウト](/runtime/cpp-internals/memory-layout.html)で扱います。[N4861: expr.sizeof](https://timsong-cpp.github.io/cppwp/n4861/expr.sizeof)、[basic.types](https://timsong-cpp.github.io/cppwp/n4861/basic.types)

`int`の幅もC++全体で32bit固定ではありません。MSVCの通常の32bit／64bit向け環境では4byteですが、これは処理系の具体的な性質です。ファイルの32bit整数欄を、説明なしに`int`の生データへ置き換えることはできません。[Microsoft: Data Type Ranges](https://learn.microsoft.com/en-us/cpp/cpp/data-type-ranges?view=msvc-170)

`<cstdint>`の`std::uint32_t`は、提供される場合には**幅がちょうど32bitで、値に使わない余分なビットがない符号なし整数型**です。すべての処理系に必ず存在する名前ではなく、その条件に合う型の提供と結び付いています。本記事の32bitコード例は、この型が利用できる環境を対象にします。`std::uint_least32_t`の「少なくとも32bit」は別の条件です。[N4861: cstdint.syn](https://timsong-cpp.github.io/cppwp/n4861/cstdint.syn)、[現行草案: exact-width型の提供条件](https://eel.is/c++draft/cstdint.syn)

## unsignedの範囲と剰余

値の表現幅がNbitのunsigned（符号なし整数）の範囲は、**0〜2ᴺ−1**です。各ビットに重みを付けて足し、8bitの`1111'1111`なら128＋64＋32＋16＋8＋4＋2＋1＝255になります。

**演算の型がそのNbitのunsigned型であるとき**、計算結果は2ᴺを法とする剰余になります。「法」は同じ余りを持つ値をひとまとまりにする基準です。8bitの数の輪で考えると、255の次は0、0の一つ前は255です。[N4861: basic.fundamental](https://timsong-cpp.github.io/cppwp/n4861/basic.fundamental)

これは、C++の`uint8_t`同士を足した式が必ず8bitで計算されるという意味ではありません。実際の式の型は、後述の整数昇格でも変わります。また、unsignedの剰余が定義されていても、ゲームの所持数などで意図せず255から0へ戻ることが正しい仕様とは限りません。

## signedと2の補数

Nbitの2の補数では、最上位ビットの重みを**−2ᴺ⁻¹**、残りを正の重みとして読みます。8bitなら最上位が−128、その下が64、32、16、8、4、2、1です。「符号を示す一桁と、残りの桁で絶対値を持つ」表現とは異なります。

| 8bitの表現 | 16進 | unsignedとして読む | 2の補数のsignedとして読む |
| --- | --- | ---: | ---: |
| `0000 0000` | `00` | 0 | 0 |
| `0111 1111` | `7F` | 127 | 127 |
| `1000 0000` | `80` | 128 | −128 |
| `1111 1011` | `FB` | 251 | −5 |
| `1111 1111` | `FF` | 255 | −1 |

signedの範囲は**−2ᴺ⁻¹〜2ᴺ⁻¹−1**で、8bitなら−128〜127です。負の側が一つ多いので、最小値の符号を反転した正の値は同じ幅に収まりません。C++20では、対応するsigned／unsignedのビット表現の関係が2の補数として定められています。[N4861: basic.fundamental](https://timsong-cpp.github.io/cppwp/n4861/basic.fundamental)

<figure class="study-figure">
  <img src="/images/data/twos-complement.svg" alt="8bitモデルで同じビット列をunsignedと2の補数のsignedとして読む図。全ビット1はunsignedでは255、signedでは最上位の重みマイナス128に下位の127を加えてマイナス1になる。実際のC++式の型は整数昇格も確認する。" width="760" height="1200" />
  <figcaption><strong>同じビット列でも、整数型の読み方で値が変わる。</strong> 8bitの表現モデルであり、C++の小型整数演算が8bitのまま行われることを表しません。<a href="/study/images/data/twos-complement.svg" target="_blank" rel="noopener noreferrer">2の補数の図を拡大</a></figcaption>
</figure>

負数の表現を手で求める方法に、Nbitの枠内で「正の値のビットをすべて反転して1を足す」があります。8bitの−5なら、`0000 0101` → `1111 1010` → `1111 1011`です。これは表現を作る手順の説明で、後述するC++の小型整数に`~`を付けた式の型まで8bitになるという意味ではありません。

### C++17以前との違いと、オーバーフロー

C++17以前の一般の符号付き整数型は、2の補数だけに固定されていませんでした。古いコードや解説を読むときは、対象の規格版と処理系を確認します。[C++17草案N4659: basic.fundamental](https://timsong-cpp.github.io/cppwp/n4659/basic.fundamental)

**C++20で2の補数になっても、符号付き演算のオーバーフローは未定義動作です。** 例えば`int`の最大値に1を足す式に、最小値へ戻る動作を期待できません。未定義動作は「結果だけが不明な値になる」という契約でもありません。ビットの格納形式、unsigned演算、範囲外の整数変換を別の規則として読みます。[N4861: expr.pre](https://timsong-cpp.github.io/cppwp/n4861/expr.pre)

## 整数変換は、同じビットの再解釈ではない

`static_cast`で整数型へ変換するときは、**行き先の型の値を求めます**。元のメモリを同じ大きさの別の型として見直す操作や、バイト順の交換ではありません。C++20の整数変換では、`bool`などの別規則を除き、行き先の幅Nに対して元の値と2ᴺを法として合同になる、行き先の値を選びます。[N4861: conv.integral](https://timsong-cpp.github.io/cppwp/n4861/conv.integral)

次は`<cstdint>`の8bit・32bitの型が利用できる環境の例です。

```cpp
constexpr auto u = static_cast<std::uint8_t>(-5);  // 251
constexpr auto s = static_cast<std::int8_t>(u);   // -5（C++20）
constexpr auto w = static_cast<std::uint32_t>(s); // 4294967291 = 0xFFFF'FFFB
```

最初の二つでは同じ8bitの表現になりますが、最後は32bitへ変換するので、単に`FB`の前へゼロを並べる結果にはなりません。C++17以前では、signedの行き先に値が収まらない整数変換の結果は実装定義でした。この変換規則の版による違いも、符号付きの加算オーバーフローとは区別します。[N4659: conv.integral](https://timsong-cpp.github.io/cppwp/n4659/conv.integral)

## 小型整数の演算では整数昇格を確認する

**整数昇格（integral promotion）**は、`int`より低い変換順位の整数型などを、演算前に`int`または`unsigned int`へ変換する規則です。元の型の全値を`int`で表せれば`int`へ昇格します。[N4861: conv.prom](https://timsong-cpp.github.io/cppwp/n4861/conv.prom)

```cpp
std::uint8_t a = 250;
std::uint8_t b = 10;
auto total = a + b;                            // intの260
auto low = static_cast<std::uint8_t>(total);   // 4
```

`uint8_t`が提供されるこの例では、0〜255を`int`で表せるため、加算は`int`で行います。`auto`は式の型を受け取るので、`total`は8bitの変数になりません。`low`への変換で初めて256を法とする値になります。`~a`やシフトにも整数昇格が関わるため、**保存先の型だけで演算の幅を判断しない**ことが必要です。[N4861: expr.unary.op](https://timsong-cpp.github.io/cppwp/n4861/expr.unary.op)、[expr.shift](https://timsong-cpp.github.io/cppwp/n4861/expr.shift)

## バイト順と保存形式

32bitの値`0x12345678`を、1byte＝8bitの環境で考えます。次の表は**アドレスや格納位置が増える順**に並べたバイトを、各々16進2桁で書いています。

| 32bitの格納順 | 先頭＋0 | ＋1 | ＋2 | ＋3 |
| --- | --- | --- | --- | --- |
| リトルエンディアン（LE） | `78` | `56` | `34` | `12` |
| ビッグエンディアン（BE） | `12` | `34` | `56` | `78` |

LEは下位バイトから、BEは上位バイトから置く順序です。**バイト内のビットを逆にすることではありません。** `78`の中身はどちらも`0111 1000`で、`0001 1110`へ反転しません。C++20の`std::endian`は実行環境のスカラー型のバイト順を表します。`native`が必ず`little`と等しいことは、C++全体の保証ではありません。[C++ draft: bit.endian](https://eel.is/c++draft/bit.endian)

<figure class="study-figure">
  <img src="/images/data/integer-representations.svg" alt="値305419896を、16進0x12345678、32bitのビット列、LEとBEのアドレス昇順のバイト列へ対応させる図。nativeなオブジェクトの並びと、明示した保存順序を区別する。" width="760" height="1460" />
  <figcaption><strong>上位桁から書く数値の表記と、先頭から置くバイト順は別。</strong> 8bit byteのモデルです。LEとBEの表が示すのは格納順で、ビットの反転ではありません。<a href="/study/images/data/integer-representations.svg" target="_blank" rel="noopener noreferrer">整数表現とバイト順の図を拡大</a></figcaption>
</figure>

### nativeなオブジェクトと、明示する保存形式

**nativeなオブジェクトのバイト列**は、その実行環境が変数を表す並びです。例えば初期化済みの`uint32_t`の`sizeof`分の内容を、`unsigned char`配列へ`std::memcpy`して調べられます。これはオブジェクト表現の観察です。型の違うポインタへ付け替えて読み書きする必要はありません。[N4861: basic.types](https://timsong-cpp.github.io/cppwp/n4861/basic.types)

一方、**明示LE／BEの保存形式**は、ファイルや通信の仕様として並びを決めたものです。値から8bitずつ取り出して決めた順に格納し、読む側も同じ幅・順序で値を復元します。たまたまnativeの順序と一致していても、変数の生データを書いたことと、保存形式を定義したことを同一視しません。

通信の「ネットワークバイトオーダー」はIP関連のアドレス・ポートなどでBEを使いますが、「すべてのネットワーク上のデータがBE」という意味ではありません。個々のプロトコルやファイル形式に従います。[Microsoft: Byte Ordering](https://learn.microsoft.com/en-us/windows/win32/winsock/byte-ordering-2)

## unsignedを使う最小のフラグ例

**マスク**は、調べたり変えたりするビットを指定する値です。ゲームの状態フラグでは、各ビットを別々のオン／オフとして使えます。次は関数内の断片で、すべて`unsigned int`の範囲内です。

```cpp
constexpr unsigned CanShoot = 1u << 0;
constexpr unsigned Invincible = 1u << 3;
unsigned flags = 0u;

flags |= CanShoot;                       // 指定ビットを1にする
bool canShoot = (flags & CanShoot) != 0u; // 指定ビットが1か調べる
flags &= ~CanShoot;                      // 指定ビットを0にする
flags ^= Invincible;                     // 指定ビットを反転する
```

`|`は各ビットのOR、`&`はAND、`^`はXOR、`~`は反転です。`&&`や`||`の論理演算とは役割が異なります。シフト量は、昇格後の左辺の型の幅より小さく、非負でなければなりません。ここでは`1u`でunsignedを使い、0と3だけずらします。「32bitのつもりで`1 << 32`」のように、幅と型を確認しない式へ広げません。[N4861: expr.bit.and](https://timsong-cpp.github.io/cppwp/n4861/expr.bit.and)、[expr.shift](https://timsong-cpp.github.io/cppwp/n4861/expr.shift)

## 関連項目と観察

[整数とバイト列をC++で観察する](/practice/data/integer-byte-observation.html)では、値の表記、nativeなバイト列、明示LE／BEの保存を比較します。[情報表現の学習ガイド](/guide/low-level/computer-and-data.html)は分野全体への案内、[メモリレイアウト](/runtime/cpp-internals/memory-layout.html)は型の整列や配置の解説です。浮動小数点、Unicode、構造体のパディングは別のテーマとして読み分けます。
