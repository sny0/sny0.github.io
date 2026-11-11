---
title: Unicodeと文字コード — コードポイントからUTF-8・UTF-16のバイト列へ
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: data
  summary: コードポイント、Unicodeスカラー値、UTFのコード単位、バイト列、書記素クラスタを区別する。UTF-8とUTF-16、サロゲート、BOM、不正列、C++とC#の文字列の長さを具体例で読む。
  aliases: [Unicode, 文字コード, 文字エンコーディング, code point, コードポイント, Unicode scalar value, Unicodeスカラー値, code unit, コード単位, UTF-8, UTF-16, UTF-16LE, UTF-16BE, ASCII, surrogate, サロゲート, grapheme cluster, 書記素クラスタ, 結合文字, BOM, 文字化け, char8_t, u8string, u16string]
  verification: 一次資料照合（2026-11-03）
---

# Unicodeと文字コード — コードポイントからUTF-8・UTF-16のバイト列へ

テキストの「1文字」が1byteやC++・C#の`char`一個に対応するとは限りません。文字列の長さや文字化けを説明するときは、Unicodeの番号、UTFのコード単位、保存するバイト列、利用者がひとまとまりと感じる文字を区別します。

ここではUnicode 17.0.0と同版の文字分割規則を参照し、安定した基本的なUTFの規則を扱います。言語例はC++20とC#です。バイト列の表では**1byte＝8bit**とし、先頭からの格納順に16進2桁ずつ書きます。整数の表記とバイト順の土台は[整数をビット列・16進数・バイト列で読む](/data/integer-bits-and-bytes.html)を参照してください。

## 番号、コード単位、バイト列を分ける

**Unicode**は、文字に番号や性質を定める標準です。**UTF-8やUTF-16**は、その番号をコード単位の列へ表す方式です。「Unicodeという一種類のバイト列があり、UTF-8は別の文字集合」という関係ではありません。[Unicode: Character Encoding Model](https://www.unicode.org/reports/tr17/)

| 用語 | 何を指すか | 例 |
| --- | --- | --- |
| コードポイント | Unicodeの符号空間にある番号 | `A`は`U+0041`、`あ`は`U+3042` |
| Unicodeスカラー値 | コードポイントからサロゲート用の範囲を除いたもの | `U+1F600`は含むが、`U+D83D`は含まない |
| コード単位 | 符号化方式で使う固定幅の単位 | UTF-8は8bit、UTF-16は16bit |
| バイト列 | コード単位を保存・通信するために並べた8bitの列 | UTF-16の`3042`をLE順にすると`42 30` |
| 書記素クラスタ | 利用者が一文字と感じるまとまりを扱うための単位 | `e`＋結合アクセントを一まとまりにする |

コードポイントは`U+0000`〜`U+10FFFF`の範囲にあります。`U+`の後は16進表記で、メモリ上のバイト順ではありません。**スカラー値**は、このうち`U+D800`〜`U+DFFF`を除いた範囲です。UTF-8とUTF-16はスカラー値を符号化し、サロゲートのコードポイントを独立した文字として符号化するものではありません。[Unicode 17 §3.9: Encoding Forms](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/)

## UTF-8とUTF-16で同じ文字を表す

次はコード単位を16進で書いた表です。UTF-8では一単位が8bitなので、その並びがそのままバイト列になります。UTF-16の欄は**16bit単位の値**で、まだLE／BEの保存順は選んでいません。表には、BOMや終端用に追加するNULを含めません。

| 内容 | コードポイント列 | UTF-8の単位／バイト列 | UTF-16の単位列 |
| --- | --- | --- | --- |
| `A` | `U+0041` | `41` | `0041` |
| `あ` | `U+3042` | `E3 81 82` | `3042` |
| `😀` | `U+1F600` | `F0 9F 98 80` | `D83D DE00` |
| `é`（合成済み） | `U+00E9` | `C3 A9` | `00E9` |
| `e`＋結合acute | `U+0065 U+0301` | `65 CC 81` | `0065 0301` |

UTF-8は一つのスカラー値を1〜4個の8bit単位、UTF-16は1〜2個の16bit単位で表します。ASCIIの範囲`U+0000`〜`U+007F`は、UTF-8でも同じ値の1byteになります。`A`が一致するからといって、日本語や絵文字も1byteになるわけではありません。[Unicode: UTF FAQ](https://www.unicode.org/faq/utf_bom.html)

<figure class="study-figure">
  <img src="/images/data/unicode-to-bytes.svg" alt="A、あ、絵文字のコードポイントからUTF-8とUTF-16のコード単位へ進み、UTF-16をLEとBEのバイト列へ並べる図。絵文字はUTF-16でD83D DE00の二単位になり、BOMと終端NULは省略している。" width="760" height="1450" />
  <figcaption><strong>Unicodeの番号と、保存するバイト列の間に符号化の規則がある。</strong> UTF-16の16bit単位と、それを二つのbyteへ並べる順序を分けて読みます。<a href="/study/images/data/unicode-to-bytes.svg" target="_blank" rel="noopener noreferrer">コードポイントからバイト列への図を拡大</a></figcaption>
</figure>

### UTF-16のサロゲートペア

`U+10000`以上のスカラー値は、UTF-16では**上位サロゲートと下位サロゲートの二単位**で表します。上位は`D800`〜`DBFF`、下位は`DC00`〜`DFFF`です。`😀`の`D83D DE00`も、この順序の組です。

各単位を別々のUnicode文字として読むのではなく、組から一つの`U+1F600`を復元します。「UTF-16は1文字16bit固定」ではありません。一方で`あ`は、BMP（基本多言語面、`U+0000`〜`U+FFFF`）内でサロゲート用範囲の外にある`U+3042`なので一単位です。[Unicode 17 §3.8–3.9: Surrogates / UTF-16](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/)

### UTF-16LEとUTF-16BE

UTF-16の16bitコード単位を、どちらのbyteから保存するかも決める必要があります。**コード単位の順序を保ち、それぞれの単位の中でバイト順を決めます。** サロゲート二単位をひっくり返す処理ではありません。

| 内容 | UTF-16単位列 | UTF-16LEのバイト列 | UTF-16BEのバイト列 |
| --- | --- | --- | --- |
| `A` | `0041` | `41 00` | `00 41` |
| `あ` | `3042` | `42 30` | `30 42` |
| `😀` | `D83D DE00` | `3D D8 00 DE` | `D8 3D DE 00` |

UTF-8は8bit単位の列なので、UTF-16のように一単位をLE／BEで並べ分けません。`F0 9F 98 80`を逆順にするのはUTF-8の別エンディアンではなく、別の不正な並びです。[Unicode 17 §3.10: Encoding Schemes](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/)

## 長さを何の単位で数えるか

次は同じテキストについて、異なる長さを数えた表です。書記素クラスタ欄は、Unicode 17の既定の**拡張書記素クラスタ**によるまとまりを示します。BOMや終端NULは除外しています。

| 内容 | UTF-8のbyte数 | UTF-16の単位数 | スカラー値の個数 | 拡張書記素クラスタ数 |
| --- | ---: | ---: | ---: | ---: |
| `A` | 1 | 1 | 1 | 1 |
| `あ` | 3 | 1 | 1 | 1 |
| `😀` | 4 | 2 | 1 | 1 |
| `é`（`U+00E9`） | 2 | 1 | 1 | 1 |
| `e`＋`U+0301` | 3 | 2 | 2 | 1 |

結合acute（`U+0301`）は、前の`e`と組み合わさってアクセントを表します。この列は二つのスカラー値ですが、この例では一つの書記素クラスタです。**文字数の制限、カーソル移動、保存するbyte数は、同じ数え方で処理できるとは限りません。** 分割規則には言語や用途に応じた調整もあり、書記素クラスタを表示幅や描画する画像の個数と同一視もしません。[Unicode 17 UAX #29: Grapheme Clusters](https://www.unicode.org/reports/tr29/tr29-47.html)

<figure class="study-figure">
  <img src="/images/data/text-lengths.svg" alt="A、あ、絵文字、eと結合acuteについて、UTF-8のバイト数、UTF-16のコード単位数、スカラー値の個数、拡張書記素クラスタ数を比較する図。絵文字は4、2、1、1、結合文字の例は3、2、2、1となる。" width="760" height="1310" />
  <figcaption><strong>lengthやsizeが何を数えるAPIなのかを確認する。</strong> この図の書記素クラスタ数は示した例に対する値で、描画幅やフォントのグリフ数ではありません。<a href="/study/images/data/text-lengths.svg" target="_blank" rel="noopener noreferrer">文字列の長さの図を拡大</a></figcaption>
</figure>

## C++の文字列型が持つ単位

| C++20の型 | 要素の型 | どのように扱うか |
| --- | --- | --- |
| `std::string` | `char` | byte列や文字列を保持する。型名だけではUTF-8などの符号化方式は決まらない |
| `std::u8string` | `char8_t` | UTF-8のコード単位を扱うための型 |
| `std::u16string` | `char16_t` | UTF-16のコード単位を扱うための型 |
| `std::wstring` | `wchar_t` | 処理系のワイド文字型の列。一般規格としてUTF-16固定ではない |

これらは要素列の型です。**型に入っただけで、任意の内容が妥当なUTF列になるわけではありません。** `size()`と`length()`が数えるのも、その文字列が持つ要素の個数です。[N4861: string.syn](https://timsong-cpp.github.io/cppwp/n4861/string.syn)、[string.capacity](https://timsong-cpp.github.io/cppwp/n4861/string.capacity)

```cpp
// C++20、<string>。終端用のNULはsize()に含まない。
std::u8string utf8 = u8"\U0001F600"; // size()は4
std::u16string utf16 = u"\U0001F600"; // size()は2
```

C++20の`u8"..."`は`char8_t`の列、`u"..."`は`char16_t`の列です。終端を含むリテラル配列の大きさと、そこから作った文字列の`size()`も区別します。普通の`"..."`や`std::string`が自動的にUTF-8になるとは考えず、ソースと実行文字列の符号化設定も確認します。[N4861: lex.string](https://timsong-cpp.github.io/cppwp/n4861/lex.string)

通常のMSVCでは`char`は8bit、Windowsの`wchar_t`は16bitで、ワイド文字APIはUTF-16を使います。この環境の`std::wstring`も`😀`には二要素を使います。これを別OSや別処理系の`wchar_t`へ一般化しません。[Microsoft: Character types](https://learn.microsoft.com/en-us/cpp/cpp/char-wchar-t-char16-t-char32-t?view=msvc-170)

## C#のcharとstring.Length

C#の`char`は、16bitのUTF-16コード単位を保持します。`string.Length`は`char`の個数です。したがって、スカラー値や書記素クラスタの個数を直接返すプロパティではありません。[Microsoft: String.Length](https://learn.microsoft.com/en-us/dotnet/api/system.string.length?view=net-10.0)

```csharp
string face = "\U0001F600";
int units = face.Length; // 2
char first = face[0];    // 上位サロゲート一単位。絵文字全体ではない。
string combined = "e\u0301"; // Lengthは2、今回の書記素クラスタは1
```

添字で一個取り出す操作や、一単位だけ削る操作は、サロゲートペアや結合文字のまとまりを切る可能性があります。C#の文字列も、孤立したサロゲートを保持し得るため、入力の妥当性と型を分けて確認します。`.NET`ではスカラー値を扱う`Rune`、テキスト要素を扱う`StringInfo`などがあり、同じ「文字を数える」APIではありません。対応するAPIや分割規則は実行基盤の版も確認し、この表のUnicode参照版と自動的に同じとは見なしません。[Microsoft: Character encoding in .NET](https://learn.microsoft.com/en-us/dotnet/standard/base-types/character-encoding-introduction)

## BOMは先頭の署名として扱う

**BOM（Byte Order Mark）**は、先頭の`U+FEFF`を符号化形式やバイト順の署名として使うものです。UTF-16ではLE順の`FF FE`、BE順の`FE FF`が該当します。UTF-8なら`EF BB BF`ですが、UTF-8にバイト順の違いを追加するものではありません。

BOMを付けるか、受け入れるか、消費するかはファイル形式やAPIの契約で決めます。**UTF-8に必ずBOMがある、またはBOMがなければUTF-8ではない、という判定はできません。** UTF-16LE／BEのように順序を明示する場合も、入力形式の規約を確認します。途中に現れた`U+FEFF`まで一律にBOMとして削除するものではありません。[Unicode: BOM FAQ](https://www.unicode.org/faq/utf_bom.html)

## 不正な列、文字化け、表示できない文字

| 状況 | 何が違うか | 調べるもの |
| --- | --- | --- |
| 不正なUTF列 | 指定したUTFの構造に合わない | 元の単位列、エラー位置、デコーダーの処理方針 |
| 文字化け | 元と異なる符号化方式などで読み、別のテキストになった | 書いた側と読んだ側の符号化指定、変換の経路 |
| フォント・描画側の不足 | 意図したコードポイントでも、対応する形を表示できない | デコード後の番号、フォント、描画環境 |

UTF-8の継続byteだけの`80`、途中で切れた`E3 81`、UTF-16の孤立した上位サロゲートなどは不正な列の例です。任意のbyte列をUTF-8と呼べるわけではありません。不正列に対しては、エラーを返すか、`U+FFFD`（置換文字）へ置き換えるかなど、デコーダーの契約を確認します。置換した後の列だけから元のbyteを完全には復元できません。[Unicode 17 §3.9: Well-Formed / Ill-Formed Sequences](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/)

画面に置換文字を示す記号や四角が見えたことだけでは、どの段階の問題かは確定しません。`U+FFFD`自体が入力に含まれている場合もあれば、正しい文字に対してフォントが代替のグリフ（字形）を表示している場合もあります。**元のbyte列、解釈したスカラー値、表示する字形を別々に確かめます。** 字形と文字の対応は一対一とも限りません。[Unicode: Display of Unsupported Characters](https://www.unicode.org/faq/unsup_char.html)、[Character Encoding Model — Characters versus Glyphs](https://www.unicode.org/reports/tr17/)

## 符号化の先にある別の処理

`é`と`e`＋結合acuteは、今回の例では正準等価な列ですが、同じバイト列ではありません。**正規化**は、こうした等価性に従って表現をそろえる処理です。UTF-8とUTF-16を相互変換しただけで、自動的に正規化まで行うことにはなりません。[Unicode 17 UAX #15: Normalization Forms](https://www.unicode.org/reports/tr15/tr15-57.html)

文字の**分割**は境界を決める処理、**照合**は比較・並べ替えの規則、**IME**は入力を組み立てる仕組み、**シェーピング**は文字列から配置する字形を求める処理です。これらの詳細や、言語・用途ごとの扱いは後続のテーマとし、符号化やbyte数の問題とは読み分けます。

[C++とC#でUnicodeの単位を観察する](/practice/data/unicode-observation.html)は具体的な観察用の記事です。分野全体の案内は[情報表現の学習ガイド](/guide/low-level/computer-and-data.html)を参照してください。
