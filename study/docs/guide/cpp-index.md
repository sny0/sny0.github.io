---
title: 設計とC++の学習コース
study:
  source: C++ Wiki
  status: published
  summary: 設計原則・デザインパターン・C++の仕組みを、関連づけて読むための学習コースです。用語や仕組みを調べるときは技術辞典から探せます。学習順に迷ったら学習ロードマップへ進んでください。
  section: learning
  format: path
  domain: design
  collection: cpp-design
  order: -1
---

<div id="目次-—-設計原則・デザインパターン・c-の仕組み" class="study-legacy-anchor" aria-hidden="true"></div>

# 設計とC++の学習コース

設計原則・デザインパターン・C++の仕組みを、関連づけて読むための学習コースです。用語や仕組みを調べるときは[技術辞典](/)から探せます。学習順に迷ったら[学習ロードマップ](/guide/cpp-roadmap.html)へ進んでください。

- [学習ロードマップ](/guide/cpp-roadmap.html) / [用語集](/guide/cpp-glossary.html) / [参考文献](/guide/cpp-references.html) / [総合演習](/guide/exercises/) / [総合演習の解答](/guide/exercises/answers.html)

## 第1部: 設計の基礎 — [カテゴリ目次](/design/foundations/)

- [設計とは何を決める行為なのか](/design/foundations/what-is-design.html)
- [責務と関心の分離](/design/foundations/responsibility-and-separation.html)
- [凝集度と結合度(比較)](/design/foundations/cohesion-and-coupling.html)
- [依存関係と依存の方向](/design/foundations/dependency.html)
- [抽象化・カプセル化・情報隠蔽](/design/foundations/abstraction-encapsulation.html)
- [継承・委譲・コンポジション(比較)](/design/foundations/inheritance-delegation-composition.html)
- [ポリモーフィズムとインターフェース](/design/foundations/polymorphism-interface.html)
- [設計の品質特性(変更容易性・テスト容易性・拡張性・可読性・保守性・再利用性)](/design/foundations/quality-attributes.html)
- [YAGNI・KISS・DRY と早すぎる抽象化・早すぎる最適化](/design/foundations/yagni-kiss-dry.html)
- [技術的負債・コードの臭い・リファクタリング](/design/foundations/tech-debt-and-refactoring.html)
- [演習](/design/foundations/exercises.html)

## 第2部: SOLID原則 — [カテゴリ目次](/design/solid/)

- [SRP: 単一責任の原則](/design/solid/srp.html)
- [OCP: 開放閉鎖の原則](/design/solid/ocp.html)
- [LSP: リスコフの置換原則](/design/solid/lsp.html)
- [ISP: インターフェース分離の原則](/design/solid/isp.html)
- [DIP: 依存性逆転の原則](/design/solid/dip.html)
- [演習](/design/solid/exercises.html)

## 第3部: GoFデザインパターン — [カテゴリ目次(分類の説明)](/design/patterns/)

生成:
[Factory Method](/design/patterns/factory-method.html) /
[Abstract Factory](/design/patterns/abstract-factory.html) /
[Builder](/design/patterns/builder.html) /
[Prototype](/design/patterns/prototype.html) /
[Singleton](/design/patterns/singleton.html)

構造:
[Adapter](/design/patterns/adapter.html) /
[Bridge](/design/patterns/bridge.html) /
[Composite](/design/patterns/composite.html) /
[Decorator](/design/patterns/decorator.html) /
[Facade](/design/patterns/facade.html) /
[Flyweight](/design/patterns/flyweight.html) /
[Proxy](/design/patterns/proxy.html)

振る舞い:
[Chain of Responsibility](/design/patterns/chain-of-responsibility.html) /
[Command](/design/patterns/command.html) /
[Interpreter](/design/patterns/interpreter.html) /
[Iterator](/design/patterns/iterator.html) /
[Mediator](/design/patterns/mediator.html) /
[Memento](/design/patterns/memento.html) /
[Observer](/design/patterns/observer.html) /
[State](/design/patterns/state.html) /
[Strategy](/design/patterns/strategy.html) /
[Template Method](/design/patterns/template-method.html) /
[Visitor](/design/patterns/visitor.html)

- [演習](/design/patterns/exercises.html)

## 第4部: ゲームプログラミング頻出パターン — [カテゴリ目次](/game/patterns/)

- [Game Loop と Update Method](/game/patterns/game-loop-and-update.html)
- [Component と Entity Component System(継承方式・MonoBehaviour方式との比較)](/game/patterns/component-and-ecs.html)
- [Event Queue・Message Bus・Publish/Subscribe(Observerとの比較)](/game/patterns/event-queue-and-pubsub.html)
- [Service Locator と Dependency Injection(比較)](/game/patterns/service-locator-and-di.html)
- [Object Pool(通常のnew/deleteとの比較)](/game/patterns/object-pool.html)
- [最適化系パターン: Dirty Flag・Spatial Partition・Data Locality・Double Buffer](/game/patterns/optimization-patterns.html)
- [Type Object・Subclass Sandbox・Bytecode](/game/patterns/type-object-and-sandbox.html)
- [有限ステートマシンと階層型ステートマシン(State と Strategy の比較)](/game/patterns/state-machines.html)
- [Behavior Tree と Blackboard](/game/patterns/behavior-tree-and-blackboard.html)
- [Command Buffer と入力処理(Commandとの関係)](/game/patterns/command-buffer-and-input.html)
- [MVC・MVP・MVVM(比較)](/game/patterns/mvc-mvp-mvvm.html)
- [Reactive Programming](/game/patterns/reactive-and-message-bus.html)
- [演習](/game/patterns/exercises.html)

## 第5部: C++の言語機能 — [カテゴリ目次](/languages/cpp/)

- [値型と参照・ポインタ・参照](/languages/cpp/values-pointers-references.html)
- [const と const correctness](/languages/cpp/const-correctness.html)
- [配列と文字列](/languages/cpp/arrays-and-strings.html)
- [構造体・クラス・アクセス指定子](/languages/cpp/structs-and-classes.html)
- [コンストラクタ・デストラクタ・コピー・ムーブ(Rule of Zero/Three/Five)](/languages/cpp/ctor-dtor-copy-move.html)
- [RAII](/languages/cpp/raii.html)
- [継承・仮想関数・抽象クラス・override/final](/languages/cpp/inheritance-and-virtual.html)
- [関数オーバーロードと演算子オーバーロード](/languages/cpp/overloading.html)
- [テンプレートと concepts](/languages/cpp/templates-and-concepts.html)
- [ラムダ式・関数ポインタ・std::function](/languages/cpp/lambdas-and-functions.html)
- [enum・enum class・namespace](/languages/cpp/enums-and-namespaces.html)
- [例外](/languages/cpp/exceptions.html)
- [auto・decltype・constexpr・consteval(型推論)](/languages/cpp/auto-and-constexpr.html)
- [static・inline・friend](/languages/cpp/static-inline-friend.html)
- [キャスト](/languages/cpp/casts.html)
- [スマートポインタ](/languages/cpp/smart-pointers.html)
- [STLコンテナ・イテレータ・アルゴリズム・ranges](/languages/cpp/stl.html)
- [未定義動作・実装定義・未規定動作](/languages/cpp/undefined-behavior.html)
- [演習](/languages/cpp/exercises.html)

## 第6部: C++の内部的な仕組み — [カテゴリ目次](/runtime/cpp-internals/)

- [main.cpp から CPU命令までの旅(ビルドパイプライン全体)](/runtime/cpp-internals/build-pipeline-journey.html)
- [翻訳単位・ヘッダー・include・前方宣言・ODR](/runtime/cpp-internals/translation-units-and-headers.html)
- [シンボル・名前修飾・リンケージ・ABI](/runtime/cpp-internals/symbols-and-linkage.html)
- [オブジェクトファイル・実行ファイル・静的/動的ライブラリ・DLL](/runtime/cpp-internals/object-files-and-libraries.html)
- [テンプレートの実体化と inline の実際](/runtime/cpp-internals/template-instantiation-and-inline.html)
- [vtable・vptr・仮想関数呼び出し](/runtime/cpp-internals/vtable-and-virtual-calls.html)
- [RTTI・dynamic_cast・例外処理の仕組み](/runtime/cpp-internals/exceptions-and-rtti-impl.html)
- [メモリレイアウト・パディング・アラインメント・エンディアン](/runtime/cpp-internals/memory-layout.html)
- [関数呼び出し・コールスタック・呼出規約・レジスタ](/runtime/cpp-internals/function-calls-and-cpu.html)
- [キャッシュ・分岐予測・SIMD](/runtime/cpp-internals/cache-branch-simd.html)
- [コンパイラ最適化・未定義動作の影響・Debug/Release・ゼロコスト抽象化](/runtime/cpp-internals/optimization-and-ub.html)
- [演習](/runtime/cpp-internals/exercises.html)

## 第7部: メモリと実行時 — [カテゴリ目次](/runtime/memory/)

- [記憶域期間とスコープ・寿命の違い](/runtime/memory/storage-duration-and-lifetime.html)
- [所有権と借用](/runtime/memory/ownership-and-borrowing.html)
- [メモリバグ図鑑(dangling pointer・use-after-free・leak・overflow)](/runtime/memory/memory-bugs.html)
- [並行処理のバグ(data race・race condition・false sharing)](/runtime/memory/concurrency-bugs.html)
- [キャッシュ局所性と AoS / SoA](/runtime/memory/cache-locality-aos-soa.html)
- [placement new・allocator・memory pool・arena・fragmentation](/runtime/memory/allocators-and-pools.html)
- [ガベージコレクションとの違い(C#管理ヒープ・UnityのGC Alloc)](/runtime/memory/gc-and-csharp-comparison.html)
- [演習](/runtime/memory/exercises.html)

## 第8部: ビルドとライブラリ — [カテゴリ目次](/tools/build/)

- [ビルドとは何か(コンパイラとビルドシステムの違い)](/tools/build/what-is-build.html)
- [三大コンパイラ: MSVC・Clang・GCC](/tools/build/compilers.html)
- [ビルドツール: CMake・Visual Studio・Make・Ninja(CMakeサンプル付き)](/tools/build/build-tools-cmake.html)
- [ビルド構成: Debug/Development/Release/Shipping・PDB・デバッガ](/tools/build/build-configurations.html)
- [ビルド時間: incremental build・PCH・Unity Build・遅くなる理由](/tools/build/build-speed.html)
- [品質のための道具: 静的解析・サニタイザ・警告レベル・CI](/tools/build/debugging-and-analysis.html)
- [リンクエラー: 未解決外部シンボル・多重定義・ABI互換性](/tools/build/link-errors.html)
- [演習](/tools/build/exercises.html)

## 第9部: Unity/C#との対応 — [カテゴリ目次](/languages/csharp/)

- [デストラクタと Dispose / RAII と using](/languages/csharp/destructor-dispose-raii-using.html)
- [ポインタと参照型 / 値セマンティクスと class・struct](/languages/csharp/pointers-references-value-semantics.html)
- [テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html)
- [仮想関数と virtual/override / コンパイル時多態と実行時多態](/languages/csharp/virtual-and-polymorphism.html)
- [関数ポインタと delegate / Observer と event](/languages/csharp/delegates-events-function-pointers.html)
- [ヘッダー分割と Assembly Definition](/languages/csharp/headers-vs-asmdef.html)
- [ネイティブビルドと IL2CPP](/languages/csharp/il2cpp.html)
- [手動メモリ管理と GC](/languages/csharp/memory-management-vs-gc.html)
- [C++例外と C#例外](/languages/csharp/exceptions-comparison.html)
- [演習](/languages/csharp/exercises.html)

## 第10部: Unreal Engineとの対応 — [カテゴリ目次](/game/unreal/)

- [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html)
- [UEのガベージコレクションと UPROPERTY・TObjectPtr・TWeakObjectPtr](/game/unreal/gc-and-object-pointers.html)
- [リフレクション: UCLASS・UFUNCTION・Unreal Header Tool](/game/unreal/reflection-and-uht.html)
- [Unreal Build Tool・Module・Build.cs・Target.cs](/game/unreal/build-system-ubt.html)
- [UEのスマートポインタ: TSharedPtr・TUniquePtr・TSoftObjectPtr](/game/unreal/smart-pointers.html)
- [UEの Delegate と Interface](/game/unreal/delegates-and-interfaces.html)
- [Gameplay Framework・Subsystem・Slate/UMG・DataAsset/DataTable](/game/unreal/gameplay-framework.html)
- [演習](/game/unreal/exercises.html)

## 第11部: ケーススタディ — [カテゴリ目次](/design/case-studies/)

- [プレイヤー入力](/design/case-studies/player-input.html)
- [武器切り替え](/design/case-studies/weapon-switching.html)
- [敵AI](/design/case-studies/enemy-ai.html)
- [ステート異常(状態異常)](/design/case-studies/status-effects.html)
- [実績システム](/design/case-studies/achievements.html)
- [セーブデータ](/design/case-studies/save-data.html)
- [ダメージ計算](/design/case-studies/damage-calculation.html)
- [UI通知](/design/case-studies/ui-notification.html)
- [オブジェクト生成](/design/case-studies/object-spawning.html)
- [画面遷移](/design/case-studies/screen-transition.html)
- [サウンド管理](/design/case-studies/sound-manager.html)
- [アイテム効果](/design/case-studies/item-effects.html)
- [クエスト](/design/case-studies/quest-system.html)
- [イベント通知](/design/case-studies/event-notification.html)
- [照準制御](/design/case-studies/aim-control.html)
- [演習](/design/case-studies/exercises.html)

## 第12部: 判断ガイド — [カテゴリ目次](/design/decisions/)

- [クラスを分けるべきか](/design/decisions/split-class.html)
- [インターフェースを作るべきか](/design/decisions/create-interface.html)
- [継承かコンポジションか](/design/decisions/inheritance-or-composition.html)
- [抽象化すべきか・デザインパターンを使うべきか](/design/decisions/abstraction-and-patterns.html)
- [イベント・依存性注入・Singleton の判断](/design/decisions/events-di-singleton.html)
- [C++の選択: テンプレートか仮想関数か・値渡しか参照渡しか・unique_ptrかshared_ptrか・配列かvectorか・構造体かクラスか](/design/decisions/cpp-choices.html)
- [最適化すべきか・リファクタリングすべきか](/design/decisions/optimize-or-refactor.html)
- [演習](/design/decisions/exercises.html)
