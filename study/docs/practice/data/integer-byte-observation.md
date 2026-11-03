---
title: C++20で整数の値・ビット・保存するbyte順を観察する
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: data
  collection: integer-observation
  order: 1
  verification: Windows x64で実行確認
  summary: 0x12345678の表記とnative object bytesを見比べ、明示したlittle/big-endianの4byte配列をencode/decodeする標準C++20サンプル。
  aliases: [整数, バイナリ, endian, little-endian, big-endian, uint32_t, int32_t, CHAR_BIT, memcpy, ビット演算]
---

# C++20で整数の値・ビット・保存するbyte順を観察する

同じ整数をdecimal・hex・bitsで表示し、**値の表記、メモリ上の並び、保存形式として決めたbyte順**を見比べます。概念は[整数・ビット・バイトの読み方](/data/integer-bits-and-bytes.html)、メモリ配置との関係は[メモリレイアウト](/runtime/cpp-internals/memory-layout.html)へつながります。

標準C++20のみを使います。`CHAR_BIT == 8`と、固定幅の`std::uint32_t`・`std::int32_t`の提供を前提にし、`#if`と`static_assert`で確認します。固定幅型はすべてのC++処理系に必須ではありません。[公開作業草案：固定幅整数型](https://eel.is/c++draft/cstdint.syn)

## 入手して実行する

次の3ファイルを同じフォルダへ保存します。CMake 3.20以降と、C++20に対応するコンパイラを使います。入力、ファイルI/O、ネットワーク処理、外部ライブラリの取得はありません。4byte配列を保存形式・通信形式のモデルにしています。

- <a href="/study/samples/data/integer-bytes/main.cpp" download>main.cpp</a>
- <a href="/study/samples/data/integer-bytes/CMakeLists.txt" download>CMakeLists.txt</a>
- <a href="/study/samples/data/integer-bytes/README.md" download>README.md</a>

Visual Studio 2022のDeveloper PowerShellでは次のように実行できます。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\integer_byte_observation.exe
$LASTEXITCODE
```

検査に通ると`PASS`を表示して終了0、失敗すると理由を表示して終了1です。

## 出力をどう読むか

今回のWindows x64での出力です。

```text
value decimal=305419896 hex=0x12345678
value bits (most significant first)=00010010001101000101011001111000
sizeof(uint32_t)=4 C++ bytes; CHAR_BIT=8
std::endian::native=little
native object bytes (in increasing address order): 78 56 34 12
explicit little-endian bytes: 78 56 34 12
explicit big-endian bytes: 12 34 56 78
same wire bytes: 12 34 56 78
wire decoded as LE=0x78563412; as BE=0x12345678
signed value=-1; converted uint32_t=4294967295 (0xFFFFFFFF)
signed -1 native object bytes (separate observation): FF FF FF FF
flags after set/clear: 0x00000020 (enabled=1, visible=0)
PASS: 38 checks; no signed overflow or out-of-range shift executed
```

**decimal・hex・bitsは、同じ値を異なる表記で示しています。** bitsは上位ビットを左に表示します。一方、native object bytesの行は、実際のオブジェクトをアドレスの小さい側からコピーした並びです。この二つの表示方向を区別します。

`objectBytes()`は`memcpy`で、trivially copyableな整数の表現を`unsigned char`の配列へコピーします。別の整数型のポインタで読み替える処理は使いません。[公開作業草案：オブジェクト表現のコピー](https://eel.is/c++draft/basic.types.trivial)

`std::endian::native`は実行環境のbyte順を示します。nativeがlittle/bigのどちらでもない環境もあるため、その場合は`other/mixed`と表示するだけにします。今回のnative little-endianという結果を、すべての環境の固定期待値にはしません。[公開作業草案：endian](https://eel.is/c++draft/bit.endian)

## 保存する並びは明示して作る

`encodeLittle()`と`encodeBig()`は、値から取り出した8bitずつを、決めた順序で配列へ置きます。native object bytesをそのまま保存形式に採用する操作とは分けています。

| 値 | 指定したlittle-endian | 指定したbig-endian |
| --- | --- | --- |
| `0x12345678` | `78 56 34 12` | `12 34 56 78` |

同じ配列`12 34 56 78`でも、little-endianとして復元すれば`0x78563412`、big-endianとして復元すれば`0x12345678`になります。配列だけではどちらを意図したか分からないので、保存形式や通信形式の規約として決めます。

decode時は、各byteを**シフトする前に`std::uintmax_t`へ広げます**。`unsigned char`などの小さい整数型にも整数昇格があり、式の途中で`int`になる場合があるためです。この例ではunsignedの中間値を使い、シフト量を0・8・16・24、または繰り返しの8に限定しています。[公開作業草案：整数昇格](https://eel.is/c++draft/conv.prom)、[シフト演算](https://eel.is/c++draft/expr.shift)

## -1の値変換とobject bytesを分ける

`static_cast<std::uint32_t>(negative)`は整数の**値変換**です。`-1`からは、変換先の幅32bitに対して合同な値`2^32 - 1`、つまり4294967295を得ます。[公開作業草案：整数変換](https://eel.is/c++draft/conv.integral)

別の行では、元の`std::int32_t`オブジェクトの表現をコピーして表示します。今回どちらにも`FF FF FF FF`が関係して見えても、値変換と表現のコピーは別の操作です。符号付き整数のoverflowを実行して確かめるコードは入れていません。[公開作業草案：整数の値と表現](https://eel.is/c++draft/basic.fundamental)

## 確認した範囲

2026年11月3日、Windows x64（25H2、build 26200.9711）、MSVC **19.35.32217.1**、Windows SDK **10.0.22000.0**、CMake **3.26.3**で、x64 Release・C++20・`/W4 /WX /permissive- /EHsc /utf-8`のビルドと実行を確認しました。警告なし、終了コード0で、今回の環境では38検査に通りました。

0、1、`0x12345678`、`0x80000000`、`0xFFFFFFFF`について、独立に書いた期待配列との比較、期待配列からのdecode、roundtripを検査しています。逆のbyte順での解釈、`-1`の値変換、flagのset・clear・testも含みます。encodeとdecodeの往復だけで合否を決めていません。

実行確認はこのlittle-endian環境だけです。他OS・他コンパイラ、big/mixed-endian環境での実行や、実際のファイル・ネットワークとの接続は確認範囲に含めていません。

## main.cpp

<<< @/public/samples/data/integer-bytes/main.cpp{cpp}

## CMakeLists.txt

<<< @/public/samples/data/integer-bytes/CMakeLists.txt{cmake}
