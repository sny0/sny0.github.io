# samples — 検証済みコード例

docs/ の主要コード例に対応する、単体でコンパイル可能な最小サンプル集です。

## ビルド方法(検証環境: MinGW GCC 9.2, -std=c++2a)

```
g++ -std=c++2a -Wall -Wextra -o out.exe samples/<name>.cpp
```

- 全 .cpp は main を持ち、実行すると簡単な動作確認出力を出します
- printfの書式は `%u` / `%ld` +明示キャストに統一しています(検証環境MinGW.orgのCランタイムが `%zu` / `%lld` 未対応のため。C99完全対応環境なら `%zu` / `%lld` が本来の書式です)
- `tu_demo/` はマルチファイル構成(ビルド手順は同ディレクトリのREADME)
- `cmake_demo/` はCMakeサンプル(docs/08_build_system/03 参照)
- GCC 9.2 は C++20 部分対応のため、concepts / ranges / std::format / std::span / std::erase_if は**サンプルでは使用していません**(本文中の該当コードは構文レビューのみ)
- `ub_examples.cpp` と `memory_bugs_annotated.cpp` は**読む教材**です(コンパイルは通るが、未定義動作の観察目的なので実行は推奨しません)

一括コンパイル確認(PowerShell):

```powershell
Get-ChildItem samples/*.cpp | ForEach-Object { g++ -std=c++2a -Wall -Wextra -c $_.FullName -o NUL }
```
