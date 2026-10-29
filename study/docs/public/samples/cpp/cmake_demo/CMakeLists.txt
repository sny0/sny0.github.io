# 最小のCMakeサンプル(docs/08_build_system/03_build_tools_cmake.md)
cmake_minimum_required(VERSION 3.16)
project(MiniGame CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ライブラリ(ゲームロジック): 実行体と分離してテスト可能に
add_library(game_core
    src/enemy.cpp
    src/combat.cpp
)
target_include_directories(game_core PUBLIC include)   # PUBLIC: 利用側にも伝播

# 実行ファイル
add_executable(game src/main.cpp)
target_link_libraries(game PRIVATE game_core)

# 警告(コンパイラ別分岐の典型例)
if(MSVC)
    target_compile_options(game_core PRIVATE /W4)
    target_compile_options(game PRIVATE /W4)
else()
    target_compile_options(game_core PRIVATE -Wall -Wextra)
    target_compile_options(game PRIVATE -Wall -Wextra)
endif()

# 使い方:
#   cmake -S . -B build -G Ninja      (Ninjaがなければ -G "MinGW Makefiles" 等)
#   cmake --build build
#   ./build/game
