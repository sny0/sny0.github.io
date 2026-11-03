# samples — 検証済みコード例

各記事の配布ソースをまとめたものです。元のMinGWでの確認記録と、更新したサンプルの確認環境を区別します。

`atomic_counter.cpp`は2026-11-04に、安全なatomic加算と終了待ちのC++20例へ更新しました。`std::jthread`対応の標準ライブラリが必要で、以下のGCC 9.2での一括確認からは除きます。MSVC 19.35、x64 Release、`/std:c++20 /W4 /WX /permissive- /EHsc /utf-8`で無警告ビルド、200000回の加算と終了0を確認しました。非atomicのデータ競合を実行する版は含みません。

## ビルド方法(検証環境: MinGW GCC 9.2, -std=c++2a)

```
g++ -std=c++2a -Wall -Wextra -o out.exe samples/<name>.cpp
```

- 多くの単体`.cpp`は`main`を持ち、動作確認出力を出します。注釈用コードは実行する教材と区別します
- 元のコードには古いMinGW向けの`printf`書式と明示キャストがあります。値の型に合う書式を使い、更新したコードの確認環境は個別の注記を参照します
- `tu_demo/` はマルチファイル構成(ビルド手順は同ディレクトリのREADME)
- `cmake_demo/` はCMakeサンプル(docs/08_build_system/03 参照)
- GCC 9.2 は C++20 部分対応のため、concepts / ranges / std::format / std::span / std::erase_if は**サンプルでは使用していません**(本文中の該当コードは構文レビューのみ)
- `ub_examples.cpp`と`memory_bugs_annotated.cpp`は未定義動作を説明する**読む教材**です。実行結果を期待値と比較するテストにはしません

一括コンパイル確認(PowerShell):

```powershell
Get-ChildItem samples/*.cpp | Where-Object Name -ne 'atomic_counter.cpp' | ForEach-Object { g++ -std=c++2a -Wall -Wextra -c $_.FullName -o NUL }
```
