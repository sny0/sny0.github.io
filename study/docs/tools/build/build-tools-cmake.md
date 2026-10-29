---
title: "ビルドツール: CMake・Visual Studioプロジェクト・Make・Ninja"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "Make: 最古参。Makefile に「成果物: 依存 → コマンド」を書く。依存グラフ思考の原点 Ninja: Make の高速版(生成される前提の割り切った設計)。CMakeの相棒として現代の主流"
---

# ビルドツール: CMake・Visual Studioプロジェクト・Make・Ninja

## 役割の整理(再掲)

```
CMake(メタ: 設計図) ──生成──> Make / Ninja / .vcxproj(実行: 依存解決して職人を呼ぶ)
```

- **Make**: 最古参。`Makefile` に「成果物: 依存 → コマンド」を書く。依存グラフ思考の原点
- **Ninja**: Make の高速版(生成される前提の割り切った設計)。CMakeの相棒として現代の主流
- **Visual Studioプロジェクト(.vcxproj/MSBuild)**: Windows/コンソール開発のIDE統合。手書きせずCMakeやUBTから生成するのが現代流
- **CMake**: 事実上の業界標準のメタビルドシステム。ライブラリの配布形式(find_package)としても機能

## 最小のCMakeサンプル(検証済み)

[samples/cmake_demo/](/tools/build/samples/cmake-demo.html) に実物があります。

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(MiniGame CXX)

set(CMAKE_CXX_STANDARD 20)            # C++20を要求
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ライブラリ(ゲームロジック): テスト可能にするため実行体と分離するのが定石
add_library(game_core
    src/enemy.cpp
    src/combat.cpp
)
target_include_directories(game_core PUBLIC include)   # PUBLICは「使う側にも伝播」

# 実行ファイル
add_executable(game src/main.cpp)
target_link_libraries(game PRIVATE game_core)          # リンク(依存もここで宣言)

# 警告(コンパイラ別の分岐の典型例)
if(MSVC)
    target_compile_options(game_core PRIVATE /W4)
else()
    target_compile_options(game_core PRIVATE -Wall -Wextra)
endif()
```

```
# 使い方(out-of-sourceビルド: ソースとビルド生成物を分離するのが鉄則)
cmake -S . -B build -G Ninja        # 設計図から実行計画を生成(Generatorを選ぶ)
cmake --build build                 # ビルド(2回目からは変更分だけ=インクリメンタル)
```

### 覚えるべき概念は3つだけ

1. **ターゲット**(add_library / add_executable): ビルドの単位。モダンCMakeは全部ターゲット中心
2. **プロパティの伝播**(PUBLIC / PRIVATE / INTERFACE): 「このincludeパスは自分だけ(PRIVATE)か、リンクしてくる相手にも必要(PUBLIC)か」——[依存関係の設計](/design/foundations/dependency.html)がビルド定義に現れる
3. **find_package / FetchContent**: 外部ライブラリの取り込み

## Makefileの思想だけ知る(読めると得)

```make
game.exe: main.o enemy.o        # game.exeは main.o enemy.o に依存する
	g++ main.o enemy.o -o game.exe
main.o: main.cpp enemy.h        # ヘッダー依存も書く(実際はコンパイラに自動生成させる)
	g++ -c main.cpp
```

「**成果物は依存より新しくなければならない。古ければコマンドで作り直す**」——このタイムスタンプ駆動の依存グラフが、あらゆるビルドシステム(そしてアセットパイプライン)の背後にある共通原理です。

## C#/Unityとの対応

- `.csproj`(SDKスタイル)がCMakeLists.txt相当。ただしC#はソース列挙・依存解決が自動で、書くことが激減している
- Unityの Assembly Definition が「ターゲット分割+依存の宣言」に対応(→ [第9部](/languages/csharp/headers-vs-asmdef.html))
- UEは Build.cs / Target.cs + UBT が CMake の役割(→ [第10部](/game/unreal/build-system-ubt.html))。**UE案件ではCMakeは書かない**が、依存宣言・モジュール分割という考え方は同一

## 実務の指針

- 新規C++プロジェクトは **CMake + Ninja** が既定解(IDE(VS/CLion/VSCode)はどれもCMakeを直接開ける)
- ビルドディレクトリはgit管理外(生成物)。「クリーンビルド=buildディレクトリ削除」で常に再現できる状態を保つ
- ライブラリ分割(add_library)は[依存の方向](/design/foundations/dependency.html)を物理的に強制する道具——「core が ui にリンクしていたらおかしい」をビルドが検出する

## 理解度チェック

1. CMakeとNinjaの役割分担は?
2. PUBLIC / PRIVATE の伝播は何を宣言していますか。
3. out-of-sourceビルドの利点は?

## 演習

samples/cmake_demo/ を `cmake -S . -B build && cmake --build build` でビルドし、(a) 1ファイルだけ触って再ビルド(差分ビルドの速さ)、(b) game_core に新しい.cppを追加してリスト更新、(c) include/ のヘッダーを触ると依存する.cppだけ再コンパイルされることを確認してください。

---

前: [三大コンパイラ](/tools/build/compilers.html) | [カテゴリ目次](/tools/build/) | 次: [ビルド構成](/tools/build/build-configurations.html)
