---
title: C++のコードサンプル集
study:
  source: C++ Wiki
  status: published
  summary: C++の配布コードをまとめた索引。古いMinGWで確認された例と、更新したMSVC向けの例を区別し、実行しない注釈用コードも明記する。
  section: practice
  format: index
  domain: tools
  collection: cpp-samples
  order: 0
---

<div id="samples-—-検証済みコード例" class="study-legacy-anchor" aria-hidden="true"></div>

# C++のコードサンプル集

各記事のコード例に対応する配布ソースの索引です。元のMinGWでの確認記録と、その後更新したサンプルの確認環境を区別します。

`atomic_counter.cpp`は2026-11-04に、安全なatomic加算と終了待ちのC++20例へ更新しました。`std::jthread`に対応する標準ライブラリが必要で、以下の古いGCC 9.2での一括確認には含めません。MSVC 19.35、x64 Release、`/std:c++20 /W4 /WX /permissive- /EHsc /utf-8`でビルドし、200,000回の加算結果と終了0を確認しています。共有する複数の状態をロックで守る例は[在庫消費の実践](/practice/threads/inventory-synchronization.html)を参照してください。

`raii_file.cpp`は、通常経路と早期returnでのcloseを示す例です。固定名のファイルを上書き・削除する旧版を廃止し、OSのnullデバイスへ出力する形へ更新しました。保存処理の例ではありません。ファイルの読み取りは[C++・C#の観察サンプル](/practice/io/file-read-observation.html)を参照してください。更新版は上記MSVC環境で確認し、古いGCCでの一括確認からは除きます。

## ビルド方法(検証環境: MinGW GCC 9.2, -std=c++2a)

```
g++ -std=c++2a -Wall -Wextra -o out.exe samples/<name>.cpp
```

- 多くの単体`.cpp`は`main`を持ち、簡単な動作確認出力を出します。以下に挙げる注釈用コードは、実行する教材と区別します
- 元のコードには、古いMinGWの実行環境に配慮した`printf`の書式と明示キャストがあります。書式指定は渡す値の型に合わせ、更新したコードの確認環境は個別の注記を参照します
- `tu_demo/` はマルチファイル構成(ビルド手順は同ディレクトリのREADME)
- `cmake_demo/` はCMakeサンプル(docs/08_build_system/03 参照)
- GCC 9.2 は C++20 部分対応のため、concepts / ranges / std::format / std::span / std::erase_if は**サンプルでは使用していません**(本文中の該当コードは構文レビューのみ)
- `ub_examples.cpp`と`memory_bugs_annotated.cpp`は、未定義動作を説明する**読む教材**です。実行結果を期待値と比較するテストにはしません

一括コンパイル確認(PowerShell):

```powershell
Get-ChildItem samples/*.cpp | Where-Object Name -notin @('atomic_counter.cpp', 'raii_file.cpp') | ForEach-Object { g++ -std=c++2a -Wall -Wextra -c $_.FullName -o NUL }
```


## 配布するソースファイル

- <a href="/study/samples/cpp/aos_soa_bench.cpp">aos_soa_bench.cpp</a>
- <a href="/study/samples/cpp/arena_allocator.cpp">arena_allocator.cpp</a>
- <a href="/study/samples/cpp/arrays_strings.cpp">arrays_strings.cpp</a>
- <a href="/study/samples/cpp/atomic_counter.cpp">atomic_counter.cpp</a> — C++20のatomic加算・終了待ち。新しいMSVC確認環境は上記参照
- <a href="/study/samples/cpp/behavior_tree.cpp">behavior_tree.cpp</a>
- <a href="/study/samples/cpp/bytecode_vm.cpp">bytecode_vm.cpp</a>
- <a href="/study/samples/cpp/cache_bench.cpp">cache_bench.cpp</a>
- <a href="/study/samples/cpp/casts_demo.cpp">casts_demo.cpp</a>
- <a href="/study/samples/cpp/cmake_demo/CMakeLists.txt">cmake_demo/CMakeLists.txt</a>
- <a href="/study/samples/cpp/cmake_demo/include/game/combat.h">cmake_demo/include/game/combat.h</a>
- <a href="/study/samples/cpp/cmake_demo/include/game/enemy.h">cmake_demo/include/game/enemy.h</a>
- <a href="/study/samples/cpp/cmake_demo/src/combat.cpp">cmake_demo/src/combat.cpp</a>
- <a href="/study/samples/cpp/cmake_demo/src/enemy.cpp">cmake_demo/src/enemy.cpp</a>
- <a href="/study/samples/cpp/cmake_demo/src/main.cpp">cmake_demo/src/main.cpp</a>
- <a href="/study/samples/cpp/component_entity.cpp">component_entity.cpp</a>
- <a href="/study/samples/cpp/constexpr_table.cpp">constexpr_table.cpp</a>
- <a href="/study/samples/cpp/cooldown_set.cpp">cooldown_set.cpp</a>
- <a href="/study/samples/cpp/design_basics_pickup.cpp">design_basics_pickup.cpp</a>
- <a href="/study/samples/cpp/ecs_minimal.cpp">ecs_minimal.cpp</a>
- <a href="/study/samples/cpp/enums_namespaces.cpp">enums_namespaces.cpp</a>
- <a href="/study/samples/cpp/event_bus.cpp">event_bus.cpp</a>
- <a href="/study/samples/cpp/event_queue.cpp">event_queue.cpp</a>
- <a href="/study/samples/cpp/exceptions_raii.cpp">exceptions_raii.cpp</a>
- <a href="/study/samples/cpp/fsm_guard.cpp">fsm_guard.cpp</a>
- <a href="/study/samples/cpp/game_loop.cpp">game_loop.cpp</a>
- <a href="/study/samples/cpp/inheritance_virtual.cpp">inheritance_virtual.cpp</a>
- <a href="/study/samples/cpp/input_actions.cpp">input_actions.cpp</a>
- <a href="/study/samples/cpp/journey_main.cpp">journey_main.cpp</a>
- <a href="/study/samples/cpp/lambdas_functions.cpp">lambdas_functions.cpp</a>
- <a href="/study/samples/cpp/lifetime_demo.cpp">lifetime_demo.cpp</a>
- <a href="/study/samples/cpp/memory_bugs_annotated.cpp">memory_bugs_annotated.cpp</a>
- <a href="/study/samples/cpp/object_pool.cpp">object_pool.cpp</a>
- <a href="/study/samples/cpp/operator_overload.cpp">operator_overload.cpp</a>
- <a href="/study/samples/cpp/pattern_abstract_factory.cpp">pattern_abstract_factory.cpp</a>
- <a href="/study/samples/cpp/pattern_adapter.cpp">pattern_adapter.cpp</a>
- <a href="/study/samples/cpp/pattern_bridge.cpp">pattern_bridge.cpp</a>
- <a href="/study/samples/cpp/pattern_builder.cpp">pattern_builder.cpp</a>
- <a href="/study/samples/cpp/pattern_chain.cpp">pattern_chain.cpp</a>
- <a href="/study/samples/cpp/pattern_command.cpp">pattern_command.cpp</a>
- <a href="/study/samples/cpp/pattern_composite.cpp">pattern_composite.cpp</a>
- <a href="/study/samples/cpp/pattern_decorator.cpp">pattern_decorator.cpp</a>
- <a href="/study/samples/cpp/pattern_facade.cpp">pattern_facade.cpp</a>
- <a href="/study/samples/cpp/pattern_factory_method.cpp">pattern_factory_method.cpp</a>
- <a href="/study/samples/cpp/pattern_flyweight.cpp">pattern_flyweight.cpp</a>
- <a href="/study/samples/cpp/pattern_interpreter.cpp">pattern_interpreter.cpp</a>
- <a href="/study/samples/cpp/pattern_iterator.cpp">pattern_iterator.cpp</a>
- <a href="/study/samples/cpp/pattern_mediator.cpp">pattern_mediator.cpp</a>
- <a href="/study/samples/cpp/pattern_memento.cpp">pattern_memento.cpp</a>
- <a href="/study/samples/cpp/pattern_observer.cpp">pattern_observer.cpp</a>
- <a href="/study/samples/cpp/pattern_prototype.cpp">pattern_prototype.cpp</a>
- <a href="/study/samples/cpp/pattern_proxy.cpp">pattern_proxy.cpp</a>
- <a href="/study/samples/cpp/pattern_singleton.cpp">pattern_singleton.cpp</a>
- <a href="/study/samples/cpp/pattern_state.cpp">pattern_state.cpp</a>
- <a href="/study/samples/cpp/pattern_strategy.cpp">pattern_strategy.cpp</a>
- <a href="/study/samples/cpp/pattern_template_method.cpp">pattern_template_method.cpp</a>
- <a href="/study/samples/cpp/pattern_visitor.cpp">pattern_visitor.cpp</a>
- <a href="/study/samples/cpp/raii_file.cpp">raii_file.cpp</a>
- <a href="/study/samples/cpp/README.md">README.md</a>
- <a href="/study/samples/cpp/rule_of_five.cpp">rule_of_five.cpp</a>
- <a href="/study/samples/cpp/service_locator.cpp">service_locator.cpp</a>
- <a href="/study/samples/cpp/smart_pointers.cpp">smart_pointers.cpp</a>
- <a href="/study/samples/cpp/solid_shop.cpp">solid_shop.cpp</a>
- <a href="/study/samples/cpp/spatial_grid.cpp">spatial_grid.cpp</a>
- <a href="/study/samples/cpp/static_inline.cpp">static_inline.cpp</a>
- <a href="/study/samples/cpp/stl_basics.cpp">stl_basics.cpp</a>
- <a href="/study/samples/cpp/struct_layout.cpp">struct_layout.cpp</a>
- <a href="/study/samples/cpp/templates_basic.cpp">templates_basic.cpp</a>
- <a href="/study/samples/cpp/tu_demo/enemy.cpp">tu_demo/enemy.cpp</a>
- <a href="/study/samples/cpp/tu_demo/enemy.h">tu_demo/enemy.h</a>
- <a href="/study/samples/cpp/tu_demo/main.cpp">tu_demo/main.cpp</a>
- <a href="/study/samples/cpp/tu_demo/radar.cpp">tu_demo/radar.cpp</a>
- <a href="/study/samples/cpp/tu_demo/radar.h">tu_demo/radar.h</a>
- <a href="/study/samples/cpp/tu_demo/README.md">tu_demo/README.md</a>
- <a href="/study/samples/cpp/type_object.cpp">type_object.cpp</a>
- <a href="/study/samples/cpp/ub_examples.cpp">ub_examples.cpp</a>
- <a href="/study/samples/cpp/values_and_refs.cpp">values_and_refs.cpp</a>
- <a href="/study/samples/cpp/vtable_size.cpp">vtable_size.cpp</a>
