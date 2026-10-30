---
title: C++とゲーム設計の学習ロードマップ
study:
  source: C++ Wiki
  status: published
  summary: 設計の基礎、Unity経験者向けC++、実行の仕組みなど、目的に合わせて辞典本文を読む経路。
  section: learning
  format: path
  domain: design
  collection: cpp-design
  order: 0
---

<div id="学習ロードマップ" class="study-legacy-anchor" aria-hidden="true"></div>

# C++とゲーム設計の学習ロードマップ

自分の目的に合ったルートを選んでください。どのルートも「全部読む」必要はありません。各ページは独立して読めるように書かれており、未説明の用語には[用語集](/guide/cpp-glossary.html)やリンク先ページへの参照があります。

## ルート0: まず全員に勧める最短コース(約10ページ)

「設計もC++もまだ自信がない」状態から、設計とC++の本文の見取り図を作るためのコースです。

1. [設計とは何を決める行為なのか](/design/foundations/what-is-design.html)
2. [凝集度と結合度](/design/foundations/cohesion-and-coupling.html)
3. [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html)
4. [SRP: 単一責任の原則](/design/solid/srp.html)
5. [Observer](/design/patterns/observer.html)(Unityのeventの正体)
6. [State](/design/patterns/state.html)(ゲームで最頻出)
7. [値型と参照・ポインタ・参照](/languages/cpp/values-pointers-references.html)
8. [RAII](/languages/cpp/raii.html)
9. [main.cpp から CPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html)
10. [ケーススタディ: 武器切り替え](/design/case-studies/weapon-switching.html)

## ルート1: 初心者向け(設計もC++も基礎から)

順番に読むと、前のページの知識だけで次が読めるように並べています。

1. 設計の基礎を順番に: [設計とは](/design/foundations/what-is-design.html) → [責務](/design/foundations/responsibility-and-separation.html) → [凝集度と結合度](/design/foundations/cohesion-and-coupling.html) → [依存](/design/foundations/dependency.html) → [抽象化](/design/foundations/abstraction-encapsulation.html) → [継承とコンポジション](/design/foundations/inheritance-delegation-composition.html) → [ポリモーフィズム](/design/foundations/polymorphism-interface.html) → [品質特性](/design/foundations/quality-attributes.html) → [YAGNI/KISS/DRY](/design/foundations/yagni-kiss-dry.html) → [技術的負債](/design/foundations/tech-debt-and-refactoring.html)
2. [設計の基礎の演習](/design/foundations/exercises.html) を解く
3. SOLID原則を [SRP](/design/solid/srp.html) から順に
4. GoFパターンは、まず [Observer](/design/patterns/observer.html) / [State](/design/patterns/state.html) / [Strategy](/design/patterns/strategy.html) / [Command](/design/patterns/command.html) / [Factory Method](/design/patterns/factory-method.html) / [Singleton](/design/patterns/singleton.html) の6つ
5. [C++の言語機能の学習ガイド](/languages/cpp/)に沿って、値・寿命・所有から読む
6. [設計ケーススタディの読み進め方](/design/case-studies/)から2〜3題読み、[判断ガイド](/design/decisions/)で締める

## ルート2: Unity経験者向けC++ルート

「C#は書けるがC++が分からない」人向け。C#との対比を軸に進みます。

1. [ポインタと参照型 / 値セマンティクス](/languages/csharp/pointers-references-value-semantics.html) — C#のclass/structとの対応から入る
2. [値型と参照・ポインタ・参照](/languages/cpp/values-pointers-references.html)
3. [コンストラクタ・デストラクタ・コピー・ムーブ](/languages/cpp/ctor-dtor-copy-move.html)
4. [RAII](/languages/cpp/raii.html) → [デストラクタとDispose / RAIIとusing](/languages/csharp/destructor-dispose-raii-using.html)
5. [スマートポインタ](/languages/cpp/smart-pointers.html) → [所有権と借用](/runtime/memory/ownership-and-borrowing.html)
6. [継承・仮想関数](/languages/cpp/inheritance-and-virtual.html) → [仮想関数とvirtual/override](/languages/csharp/virtual-and-polymorphism.html)
7. [テンプレートとconcepts](/languages/cpp/templates-and-concepts.html) → [テンプレートとジェネリック](/languages/csharp/templates-vs-generics.html)
8. [ラムダ式・関数ポインタ・std::function](/languages/cpp/lambdas-and-functions.html) → [関数ポインタとdelegate](/languages/csharp/delegates-events-function-pointers.html)
9. [main.cpp から CPU命令までの旅](/runtime/cpp-internals/build-pipeline-journey.html) → [翻訳単位とヘッダー](/runtime/cpp-internals/translation-units-and-headers.html) → [ヘッダー分割とAssembly Definition](/languages/csharp/headers-vs-asmdef.html)
10. [手動メモリ管理とGC](/languages/csharp/memory-management-vs-gc.html) → [GCとの違い](/runtime/memory/gc-and-csharp-comparison.html)
11. [ネイティブビルドとIL2CPP](/languages/csharp/il2cpp.html)
12. 仕上げに [第5部演習](/languages/cpp/exercises.html) と [第9部演習](/languages/csharp/exercises.html)

## ルート3: 設計重点ルート

「動くコードは書けるが、設計判断に自信がない」人向け。

1. 第1部を通読([カテゴリ目次](/design/foundations/))
2. 第2部 SOLID を通読([カテゴリ目次](/design/solid/))— 各ページの「適用しすぎた場合の弊害」を飛ばさないこと
3. 第3部から: [Strategy](/design/patterns/strategy.html) / [State](/design/patterns/state.html) / [Observer](/design/patterns/observer.html) / [Command](/design/patterns/command.html) / [Factory Method](/design/patterns/factory-method.html) / [Decorator](/design/patterns/decorator.html) / [Facade](/design/patterns/facade.html) / [Adapter](/design/patterns/adapter.html)
4. 第4部から: [Component と ECS](/game/patterns/component-and-ecs.html) / [Event Queue と Pub/Sub](/game/patterns/event-queue-and-pubsub.html) / [Service Locator と DI](/game/patterns/service-locator-and-di.html) / [ステートマシン](/game/patterns/state-machines.html)
5. 第11部ケーススタディを全題([カテゴリ目次](/design/case-studies/))— 設計案の比較こそがこのルートの本体
6. 第12部 判断ガイドを通読([カテゴリ目次](/design/decisions/))
7. [第3部演習](/design/patterns/exercises.html) / [第11部演習](/design/case-studies/exercises.html) / [第12部演習](/design/decisions/exercises.html)

## ルート4: Unreal Engine向けルート

UnityからUEへ移る人、UE案件が始まる人向け。C++の土台 → UE独自仕様の順で進みます。

1. ルート2の 1〜6 をまず終える(UEのC++は標準C++の上に載っている)
2. [static・inline・friend](/languages/cpp/static-inline-friend.html) と [キャスト](/languages/cpp/casts.html)
3. [翻訳単位とヘッダー](/runtime/cpp-internals/translation-units-and-headers.html) → [シンボルとリンケージ](/runtime/cpp-internals/symbols-and-linkage.html)(UEのビルドエラーを読むための基礎)
4. 第10部を順に: [UObject・Actor・ActorComponent](/game/unreal/uobject-actor-component.html) → [GCとUPROPERTY](/game/unreal/gc-and-object-pointers.html) → [リフレクションとUHT](/game/unreal/reflection-and-uht.html) → [UBTとModule](/game/unreal/build-system-ubt.html) → [TSharedPtrなど](/game/unreal/smart-pointers.html) → [DelegateとInterface](/game/unreal/delegates-and-interfaces.html) → [Gameplay Framework](/game/unreal/gameplay-framework.html)
5. [第10部演習](/game/unreal/exercises.html)
6. ケーススタディの [敵AI](/design/case-studies/enemy-ai.html) と [画面遷移](/design/case-studies/screen-transition.html) をUE前提で読み直す

## ルート5: グラフィックス志望向けルート

描画・エンジン内部・最適化に進みたい人向け。メモリとCPUの理解を最優先します。

1. [値型と参照・ポインタ・参照](/languages/cpp/values-pointers-references.html) → [配列と文字列](/languages/cpp/arrays-and-strings.html) → [STLコンテナ](/languages/cpp/stl.html)
2. [メモリレイアウト・パディング・アラインメント](/runtime/cpp-internals/memory-layout.html)
3. [関数呼び出しとCPU](/runtime/cpp-internals/function-calls-and-cpu.html) → [キャッシュ・分岐予測・SIMD](/runtime/cpp-internals/cache-branch-simd.html)
4. [キャッシュ局所性と AoS/SoA](/runtime/memory/cache-locality-aos-soa.html) → [Data Localityなど最適化系パターン](/game/patterns/optimization-patterns.html)
5. [placement new・allocator・pool](/runtime/memory/allocators-and-pools.html)
6. [コンパイラ最適化とUB](/runtime/cpp-internals/optimization-and-ub.html) → [未定義動作](/languages/cpp/undefined-behavior.html)
7. [Object Pool](/game/patterns/object-pool.html) / [Double Buffer(最適化系パターン内)](/game/patterns/optimization-patterns.html) / [Command Buffer](/game/patterns/command-buffer-and-input.html)
8. [ビルド構成](/tools/build/build-configurations.html) と [サニタイザ](/tools/build/debugging-and-analysis.html)
9. [第6部演習](/runtime/cpp-internals/exercises.html) と [第7部演習](/runtime/memory/exercises.html)

## 進め方のコツ

- 1ページ読んだら、そのページの「理解度チェック」に口頭で答えてみる。答えられなければ読み直すのではなく、**手を動かす**(演習をやる)。
- パターンのページは「使わない場面」を読むまでが1ページ。
- C++のページで分からない用語が出たら、その場で[用語集](/guide/cpp-glossary.html)を引き、深追いは後回しにする。

---

[目次に戻る](/guide/cpp-index.html)
