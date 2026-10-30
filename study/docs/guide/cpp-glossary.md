---
title: C++・設計の用語集
study:
  source: C++ Wiki
  status: published
  summary: 五十音順・アルファベット順の混合で、カテゴリごとに整理しています。各用語の詳細は詳細ページへのリンクを参照してください。 目次に戻る
  section: reference
  format: glossary
  domain: languages
---

<div id="用語集" class="study-legacy-anchor" aria-hidden="true"></div>

# C++・設計の用語集

五十音順・アルファベット順の混合で、カテゴリごとに整理しています。各用語の詳細は詳細ページへのリンクを参照してください。

## 設計の基礎用語

| 用語 | 一言定義 | 詳細 |
|---|---|---|
| 責務 | そのコードが引き受けている仕事と、その変更理由 | [責務と関心の分離](/design/foundations/responsibility-and-separation.html) |
| 関心の分離 | 異なる理由で変更されるコードを別の場所に置くこと | 同上 |
| 凝集度 | モジュール内部の要素がどれだけ関連し合っているか(高いほど良い) | [凝集度と結合度](/design/foundations/cohesion-and-coupling.html) |
| 結合度 | モジュール同士が互いをどれだけ知っているか(低いほど良い) | 同上 |
| 依存 | AがBを知っており、Bの変更でAが壊れうる関係 | [依存関係](/design/foundations/dependency.html) |
| 循環依存 | A→B→Aと依存が輪になった状態。分離・テスト不能の原因 | 同上 |
| 抽象化 | 使う側に重要なことだけ残し詳細を削ぎ落とすこと | [抽象化・カプセル化](/design/foundations/abstraction-encapsulation.html) |
| カプセル化 | データとそれを操作するコードを1つにまとめること | 同上 |
| 情報隠蔽 | 変わりそうな決定を外から見えなくすること | 同上 |
| 継承 | is-a関係。基底の実装とインターフェースを受け継ぐ | [継承・委譲・コンポジション](/design/foundations/inheritance-delegation-composition.html) |
| コンポジション | has-a関係。機能を部品として持つ | 同上 |
| 委譲 | 仕事を持っている部品に転送すること | 同上 |
| ポリモーフィズム(多態) | 同じ呼び出しが相手によって違う振る舞いをすること | [ポリモーフィズム](/design/foundations/polymorphism-interface.html) |
| インターフェース | 「何ができるか」だけを定めた約束 | 同上 |
| YAGNI | You Aren't Gonna Need It。今必要ない機能は作らない | [YAGNI・KISS・DRY](/design/foundations/yagni-kiss-dry.html) |
| KISS | Keep It Simple。同じ問題を解けるなら単純な方を選ぶ | 同上 |
| DRY | Don't Repeat Yourself。同じ**知識**を2か所に書かない | 同上 |
| 早すぎる抽象化 | 具体例が揃う前の共通化。間違った抽象を生みやすい | 同上 |
| 早すぎる最適化 | 計測せず推測で複雑化すること | 同上 |
| 技術的負債 | 「今すぐ動かす」ために「後で直すコスト」を借りること | [技術的負債](/design/foundations/tech-debt-and-refactoring.html) |
| コードの臭い | バグではないが設計問題を示唆する兆候 | 同上 |
| リファクタリング | 外部の振る舞いを変えずに内部構造を改善すること | 同上 |
| SRP/OCP/LSP/ISP/DIP | SOLID原則の5つ | [SOLID原則を学ぶ](/design/solid/) |
| ショットガン手術 | 1つの変更で多数のファイルを修正する羽目になる状態 | [SRP](/design/solid/srp.html) |

## パターン用語

| 用語 | 一言定義 | 詳細 |
|---|---|---|
| デザインパターン | 繰り返し現れる設計問題への定型解のカタログ | [GoFデザインパターンを学ぶ](/design/patterns/) |
| GoF | Gang of Four。23パターンを整理した4人の著者 | 同上 |
| Singleton | 唯一のインスタンス+全域アクセス(乱用注意) | [Singleton](/design/patterns/singleton.html) |
| Observer | 変化を購読者に通知する(C#のeventの正体) | [Observer](/design/patterns/observer.html) |
| lapsed listener | 購読解除忘れで死んだ購読者がリストに残る問題 | 同上 |
| ダブルディスパッチ | 実行時の型×操作の2軸で処理が選ばれる仕組み | [Visitor](/design/patterns/visitor.html) |
| Game Loop | 入力→更新→描画を回し続けるゲームの心臓部 | [Game Loop](/game/patterns/game-loop-and-update.html) |
| 固定タイムステップ | 更新を固定刻み(1/60秒等)で行う方式。再現条件をそろえやすいが、単独では決定性を保証しない | 同上 |
| ECS | Entity Component System。データとロジックを分離し配列で処理 | [Component と ECS](/game/patterns/component-and-ecs.html) |
| Pub/Sub | チャネル経由で発行者と購読者が互いに匿名の通知方式 | [Event Queue・Pub/Sub](/game/patterns/event-queue-and-pubsub.html) |
| Service Locator | サービスの「電話帳」を1つ置き、必要な側が問い合わせる | [Service LocatorとDI](/game/patterns/service-locator-and-di.html) |
| DI(依存性注入) | 必要な依存を外から渡してもらう方式 | 同上 |
| Object Pool | 生成破棄の激しいオブジェクトを確保済みプールで使い回す | [Object Pool](/game/patterns/object-pool.html) |
| 世代付きハンドル | index+世代番号で「解放済み参照」を検出できる参照方式 | 同上 |
| Dirty Flag | 変更があったときだけ高価な再計算をする目印 | [最適化系パターン](/game/patterns/optimization-patterns.html) |
| Spatial Partition | 空間をグリッド等に分割し近傍だけ調べる構造 | 同上 |
| Data Locality | 使うデータをメモリ上で隣接させて速くする原則 | 同上 |
| Double Buffer | 読む用と書く用の2枚を交換し、順序問題を消す | 同上 |
| Type Object | 「種類」をクラスでなくデータで表す | [Type Object](/game/patterns/type-object-and-sandbox.html) |
| FSM | 有限ステートマシン。有限個の状態+遷移ルール | [ステートマシン](/game/patterns/state-machines.html) |
| HSM | 階層型ステートマシン。共通遷移を親状態に括り出す | 同上 |
| Behavior Tree | 毎フレーム根から評価する行動選択ツリー | [BTとBlackboard](/game/patterns/behavior-tree-and-blackboard.html) |
| Blackboard | AIの知識を集約する共有メモ帳 | 同上 |
| MVC/MVP/MVVM | ModelとViewを分離するUI設計の3流派 | [MVC・MVP・MVVM](/game/patterns/mvc-mvp-mvvm.html) |
| データバインディング | ViewModelとViewを自動同期する機構(MVVMの前提) | 同上 |
| Reactive Programming | 値の変化をストリームとして合成・購読するスタイル | [Reactive](/game/patterns/reactive-and-message-bus.html) |

## C++言語用語

| 用語 | 一言定義 | 詳細 |
|---|---|---|
| 値セマンティクス | 代入=中身のコピー、という既定の意味論 | [値と参照](/languages/cpp/values-pointers-references.html) |
| ポインタ | アドレスを入れる変数。null・差し替え可 | 同上 |
| 参照 | 既存の変数の別名。null不可・差し替え不可 | 同上 |
| const correctness | 変更しないものにconstを付け通す規律 | [const](/languages/cpp/const-correctness.html) |
| SSO | 小文字列最適化。短い文字列をヒープ確保なしで持つ実装 | [配列と文字列](/languages/cpp/arrays-and-strings.html) |
| ムーブ | コピーの代わりに中身(所有権)を移す仕組み | [コピーとムーブ](/languages/cpp/ctor-dtor-copy-move.html) |
| Rule of Zero/Three/Five | 特殊メンバ関数を書く/書かないの経験則 | 同上 |
| RAII | リソースの確保と解放をオブジェクトの寿命に一致させる | [RAII](/languages/cpp/raii.html) |
| 仮想関数 | 実行時に実際の型のメソッドが呼ばれる関数 | [継承と仮想関数](/languages/cpp/inheritance-and-virtual.html) |
| 純粋仮想関数 | `= 0`で宣言し、派生に実装を強制する仮想関数 | 同上 |
| 抽象クラス | 純粋仮想を持ちインスタンス化できないクラス | 同上 |
| スライシング | 派生を値コピーすると基底部分だけ写る事故 | 同上 |
| オーバーロード | 同名関数を引数違いで複数定義(コンパイル時解決) | [オーバーロード](/languages/cpp/overloading.html) |
| テンプレート | 型を引数にしたコードの雛形。使用時に実体化 | [テンプレート](/languages/cpp/templates-and-concepts.html) |
| concepts | テンプレート引数の制約を宣言するC++20機能 | 同上 |
| ラムダ式 | その場で作る無名関数オブジェクト。キャプチャ可 | [ラムダ](/languages/cpp/lambdas-and-functions.html) |
| std::function | 呼び出せるものを統一的に入れる箱(型消去) | 同上 |
| enum class | スコープ付き・暗黙変換なしの列挙型(推奨) | [enum](/languages/cpp/enums-and-namespaces.html) |
| スタック巻き戻し | 例外発生時にデストラクタを実行しながら遡る処理 | [例外](/languages/cpp/exceptions.html) |
| constexpr | コンパイル時に実行できる計算・定数 | [constexpr](/languages/cpp/auto-and-constexpr.html) |
| consteval | 必ずコンパイル時に実行される関数(C++20) | 同上 |
| inline | 現代の意味は「多重定義の許可」(展開は最適化器の判断) | [static・inline・friend](/languages/cpp/static-inline-friend.html) |
| dynamic_cast | 実行時検査つきダウンキャスト(RTTI使用) | [キャスト](/languages/cpp/casts.html) |
| unique_ptr / shared_ptr / weak_ptr | 単独所有/共有所有/弱参照のスマートポインタ | [スマートポインタ](/languages/cpp/smart-pointers.html) |
| イテレータ無効化 | コンテナ操作で既存のイテレータ・参照が無効になること | [STL](/languages/cpp/stl.html) |
| 未定義動作(UB) | 標準が一切の要求をしない状態。何が起きてもよい | [未定義動作](/languages/cpp/undefined-behavior.html) |
| 実装定義 | 処理系が決めて文書化する動作(intのサイズ等) | 同上 |
| 未規定 | 候補のどれかになるが文書化義務のない動作(評価順等) | 同上 |

## ビルド・内部用語

| 用語 | 一言定義 | 詳細 |
|---|---|---|
| プリプロセッサ | #include展開・#define置換を行うテキスト処理 | [ビルドの旅](/runtime/cpp-internals/build-pipeline-journey.html) |
| 翻訳単位 | 1つの.cppからincludeを展開してできる、独立コンパイルの単位 | [翻訳単位](/runtime/cpp-internals/translation-units-and-headers.html) |
| 宣言と定義 | 存在の約束(何度でも可)と実体(原則1つ) | 同上 |
| ODR | One Definition Rule。定義はプログラム全体で1つ | 同上 |
| 前方宣言 | 「この型が存在する」とだけ伝える宣言。include削減の道具 | 同上 |
| include guard / #pragma once | 同一ヘッダーの二重取り込み防止 | 同上 |
| シンボル | リンカが使う「名前→機械語/データの場所」の項目 | [シンボル](/runtime/cpp-internals/symbols-and-linkage.html) |
| 名前修飾(mangling) | 関数名に型情報を埋め一意な文字列にする仕組み | 同上 |
| リンケージ | 名前が翻訳単位を越えて見えるか(外部/内部) | 同上 |
| ABI | バイナリレベルの互換性の取り決め。処理系間で異なる | 同上 |
| 静的/動的リンク | ライブラリを実行ファイルに焼き込む/実行時に結合する | [ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html) |
| DLL | Windowsの動的ライブラリ | 同上 |
| テンプレートの実体化 | 使用時に型ごとの実物コードが生成されること | [実体化とinline](/runtime/cpp-internals/template-instantiation-and-inline.html) |
| vtable / vptr | 型ごとの仮想関数表/各オブジェクトが持つ表へのポインタ | [vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html) |
| 脱仮想化 | 型が証明できる仮想呼び出しを直接呼び出しに変える最適化 | 同上 |
| RTTI | 実行時型情報。typeidとdynamic_castの基盤 | [RTTIと例外の実装](/runtime/cpp-internals/exceptions-and-rtti-impl.html) |
| ゼロコスト例外 | 投げなければほぼ無料、投げたら高い例外実装方式 | 同上 |
| アラインメント | 型ごとの「この倍数のアドレスに置く」要求 | [メモリレイアウト](/runtime/cpp-internals/memory-layout.html) |
| パディング | アラインメントのため構造体に入る詰め物 | 同上 |
| エンディアン | 複数バイト数値のバイト順(リトル/ビッグ) | 同上 |
| コールスタック | 戻り先とローカル変数を積む実行の仕組み | [関数呼び出し](/runtime/cpp-internals/function-calls-and-cpu.html) |
| 呼出規約 | 引数・戻り値をどのレジスタ/スタックで渡すかの取り決め | 同上 |
| レジスタ | CPU内部の超高速な記憶場所 | 同上 |
| キャッシュライン | メモリを読む単位(典型64バイト) | [キャッシュ](/runtime/cpp-internals/cache-branch-simd.html) |
| 分岐予測 | ifの行き先を予測して投機実行するCPU機構 | 同上 |
| SIMD | 1命令で複数データを同時計算する機構 | 同上 |
| as-ifルール | 観測可能な動作が同じなら何をしてもよい、という最適化の原則 | [最適化](/runtime/cpp-internals/optimization-and-ub.html) |
| ゼロコスト抽象化 | 使わない機能の代金は払わない、というC++の設計哲学 | 同上 |
| PCH | プリコンパイル済みヘッダー。ビルド高速化 | [ビルド時間](/tools/build/build-speed.html) |
| Unity Build | 複数.cppを結合してコンパイルする高速化(Unityエンジンとは無関係) | 同上 |
| サニタイザ | 実行時にUB・メモリバグを検出する機構(ASan等) | [品質ツール](/tools/build/debugging-and-analysis.html) |
| PDB | MSVCのデバッグ情報ファイル。クラッシュ解析に必須 | [ビルド構成](/tools/build/build-configurations.html) |
| 未解決外部シンボル | 定義が見つからないリンクエラー | [リンクエラー](/tools/build/link-errors.html) |

## メモリ・実行時用語

| 用語 | 一言定義 | 詳細 |
|---|---|---|
| 記憶域期間 | オブジェクトがいつ生まれいつ死ぬかの分類(自動/静的/動的) | [記憶域期間](/runtime/memory/storage-duration-and-lifetime.html) |
| 所有権 | オブジェクトを破棄する責任を誰が持つか | [所有権と借用](/runtime/memory/ownership-and-borrowing.html) |
| 借用 | 所有せず一時的に使わせてもらうこと(参照・非所有ポインタ) | 同上 |
| dangling pointer | 死んだオブジェクトを指すポインタ | [メモリバグ](/runtime/memory/memory-bugs.html) |
| use-after-free (UAF) | 解放済みメモリへのアクセス。UBの代表 | 同上 |
| double free | 同じメモリの二重解放 | 同上 |
| memory leak | 解放されないメモリが溜まり続けること | 同上 |
| buffer overflow | 確保領域の外への読み書き | 同上 |
| stack overflow | コールスタックの使い切り(深い再帰・巨大ローカル) | 同上 |
| data race | 同期なしの並行アクセス(書き込み含む)。UB | [並行バグ](/runtime/memory/concurrency-bugs.html) |
| race condition | タイミングで結果が変わる論理バグ | 同上 |
| false sharing | 別データが同一キャッシュラインで奪い合いになる性能問題 | 同上 |
| AoS / SoA | 構造体の配列/配列の構造体。データレイアウトの2方式 | [AoSとSoA](/runtime/memory/cache-locality-aos-soa.html) |
| placement new | 指定したメモリ上にオブジェクトを構築する低レベル機能 | [アロケータ](/runtime/memory/allocators-and-pools.html) |
| arena allocator | ポインタを進めるだけの高速アロケータ。一括Reset | 同上 |
| fragmentation | 確保・解放の繰り返しでヒープに使えない穴が増えること | 同上 |
| GC | ガベージコレクション。到達可能性でメモリを自動回収 | [GC比較](/runtime/memory/gc-and-csharp-comparison.html) |
| GC Alloc | Unityで管理ヒープ確保を指す俗語。後のGCスパイクの原因 | 同上 |

## Unity/UE対応用語

| 用語 | 一言定義 | 詳細 |
|---|---|---|
| IL2CPP | C#(IL)をC++に変換してビルドするUnityの仕組み | [IL2CPP](/languages/csharp/il2cpp.html) |
| AOT / JIT | 事前コンパイル/実行時コンパイル | 同上 |
| P/Invoke | C#からネイティブ関数を呼ぶ仕組み(C ABI経由) | 同上 |
| Assembly Definition | Unityのアセンブリ分割・依存宣言の仕組み | [ヘッダーとasmdef](/languages/csharp/headers-vs-asmdef.html) |
| UObject | UEの管理対象基底クラス(リフレクション+GC付き) | [UObject](/game/unreal/uobject-actor-component.html) |
| CDO | Class Default Object。UEがクラスごとに作る雛形インスタンス | 同上 |
| UPROPERTY | UEのリフレクション・GC追跡・エディタ公開の印 | [UEのGC](/game/unreal/gc-and-object-pointers.html) |
| UHT | Unreal Header Tool。マクロを読んでコードを生成する | [リフレクションとUHT](/game/unreal/reflection-and-uht.html) |
| UBT | Unreal Build Tool。UE独自のビルドシステム | [UBT](/game/unreal/build-system-ubt.html) |
| TObjectPtr / TWeakObjectPtr / TSoftObjectPtr | UObject用の強参照/弱参照/パス参照 | [UEのスマートポインタ](/game/unreal/smart-pointers.html) |
| Subsystem | UE公式のService Locator(寿命別のサービス置き場) | [Gameplay Framework](/game/unreal/gameplay-framework.html) |
| Blackboard(UE) | UE標準のAI用データ共有アセット | [BT](/game/patterns/behavior-tree-and-blackboard.html) |

---

[目次に戻る](/guide/cpp-index.html)
