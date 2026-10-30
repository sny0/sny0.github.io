---
title: C++と設計の総合演習 — 解答
study:
  source: C++ Wiki
  status: published
  summary: "結論だけでなく、判断理由・他の正解候補・トレードオフを含めて解説します。自分の解答と「結論」ではなく「根拠」を比較してください。 設計の観点: 責務の混在: 敵の更新・毒処理・スコア・UI更新・入力・セーブが1クラスに(SRP、神クラス)"
  section: practice
  format: exercise
  domain: design
  collection: cpp-exercises
  order: 14
---

<div id="総合演習-解答" class="study-legacy-anchor" aria-hidden="true"></div>

# C++と設計の総合演習 — 解答

結論だけでなく、判断理由・他の正解候補・トレードオフを含めて解説します。自分の解答と「結論」ではなく「根拠」を比較してください。

## 総合1. 設計レビュー 解答

**設計の観点**:

- 責務の混在: 敵の更新・毒処理・スコア・UI更新・入力・セーブが1クラスに([SRP](/design/solid/srp.html)、神クラス)
- 依存の方向: ゲームロジックがUI(scoreLabel)を直接更新([依存の方向](/design/foundations/dependency.html)違反)
- static instance: 隠れ依存とテスト不能([Singleton](/design/patterns/singleton.html))

**C++の正しさの観点**(こちらが緊急):

- `vector<Enemy*>`+newで所有権が不明。deleteが見当たらず**リーク確定**、eraseしてもEnemy本体は解放されない([所有権](/runtime/memory/ownership-and-borrowing.html))
- **範囲for中のerase**: イテレータ無効化で未定義動作([STL](/languages/cpp/stl.html))。「たまに落ちる」の実弾
- fwrite直書きセーブ: パディング・型サイズ依存で**互換性が壊れる**([セーブデータ](/design/case-studies/save-data.html))

**改善計画(優先度順)**:

1. **UBとリークの根絶**(即時): `vector<std::unique_ptr<Enemy>>` 化+削除は `erase_if`/erase-removeイディオムに。動作を変えずに正しくする
2. **セーブのバージョン化**(次のセーブ形式変更前に必須): version+名前付き形式へ移行(不可逆な決定を先に手当て)
3. **責務の分離**(触る痛みが出た箇所から段階的に): スコアとUIをイベント購読へ、敵更新をEnemy/専用システムへ。一括書き直しはしない([リファクタリング](/design/foundations/tech-debt-and-refactoring.html))

**別解**: 2と3の順序はプロジェクト状況次第(セーブ形式を当分変えないなら3が先)。1が最優先であることだけは動かない(UBは全ての検証を無効にするため)。

## 総合2. 仕組みの説明 解答

1. **コンパイル時**: `std::vector<std::unique_ptr<Enemy>>` と `std::unique_ptr<Enemy>`、`std::make_unique<Boss>` がこの翻訳単位で実体化される([実体化](/runtime/cpp-internals/template-instantiation-and-inline.html))。`unique_ptr<Boss>`→`unique_ptr<Enemy>` の変換は派生→基底の暗黙変換として解決される
2. **実行時のメモリ**: vector本体はenemiesというオブジェクト自身の記憶域に置かれる(自動/静的/動的記憶域、または所有者オブジェクトの一部)。管理情報が3ポインタ分なのは典型実装であり、標準のサイズ保証ではない。要素領域はallocator経由で確保され、この例の既定アロケータでは通常ヒープを使う。unique_ptrの各要素は、通常のデリータを使う64bit実装では8バイト程度だが、型や実装で変わる。Boss本体はmake_uniqueが動的に確保し、仮想関数のためのvptrを持つのが典型実装([メモリレイアウト](/runtime/cpp-internals/memory-layout.html)、[vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html))
3. **clear()**: 各要素のunique_ptrのデストラクタが順に走り、それぞれが `delete ptr` を実行。deleteは**基底ポインタ経由**なので、`Enemy`の**仮想デストラクタが必須**(なければ未定義動作)。vtable経由で~Boss→~Enemyの順に実行され、メモリが解放される。vectorのサイズは0になるが容量(capacity)は残る

## 総合3. パターン選定 解答例

選定(3つ):

1. **[Type Object](/game/patterns/type-object-and-sandbox.html)**(対象: 「種類が毎週追加」)— 装備の定義(名前・数値・効果リスト)をデータ化し、追加をデータ作業にする
2. **効果リスト(Decoratorのリスト方式)**(対象: 「パッシブ効果が重複して乗る」)— 装備・バフを同じ修飾パイプラインに載せる([ステート異常](/design/case-studies/status-effects.html)/[アイテム効果](/design/case-studies/item-effects.html)と同じ基盤)
3. **[Observer/Pub-Sub](/game/patterns/event-queue-and-pubsub.html)**(対象: 拾得・装備変更をUI・保存が知る)— 装備システムがUIを知らない構造に

```
[ItemDef(データ)] ←参照─ [装備スロット(所有と着脱ルール)]
                              │装備/解除で効果リストへ登録/除去
                       [EffectList] ─参加→ [ステータス計算パイプライン]
                              │イベント発行
                       [UI/セーブ(購読)]
```

**使わない候補**: 装備品のクラス階層(`Sword : Equipment`)— 効果が合成で表現できるため階層は不要で、種類追加がコード作業になってしまう([継承かコンポジションか](/design/decisions/inheritance-or-composition.html))。**別解**: 特殊装備(発動型スキル持ち)が多いなら、効果に振る舞いID+登録テーブルを足す(それでも階層は作らない)。

## 総合4. クロスエンジン設計 解答例

**対応選定**: イベントチャネル → Gameplay Message Subsystem(または自作のGameInstanceSubsystem+MulticastDelegate)。C# event → C++内部完結の購読は**非Dynamic** Multicast Delegate、デザイナーがBPで購読を足す箇所だけ**Dynamic**([UEのDelegate](/game/unreal/delegates-and-interfaces.html))。ScriptableObjectチャネル → DataAsset+Subsystemの組で近似。

**設計変更が必要になる点**:

1. **購読者の寿命管理**: C#はdelegateが購読者を延命するが、UEはUPROPERTYで追跡されない参照はGCに見えず、Actor破棄後の購読が危険。`AddUObject`系の自動無効化+EndPlayでのRemoveを規約化([UEのGC](/game/unreal/gc-and-object-pointers.html))
2. **例外前提のエラー処理の排除**: C#側でtry-catchに頼っていた失敗処理は、UEでは戻り値・check/ensureベースに書き直す([例外](/languages/cpp/exceptions.html)、[C++例外とC#例外](/languages/csharp/exceptions-comparison.html))

## 総合5. バグ調査総合 解答例

**症状の読み**: 「無関係なデータが化ける」=メモリ破壊系([メモリバグ](/runtime/memory/memory-bugs.html)の逆引き表)。「長時間+まれに」=再利用タイミング依存。「リリースのみ」=UBが最適化で顕在化([最適化とUB](/runtime/cpp-internals/optimization-and-ub.html))。

**候補(優先度順)**:

1. **use-after-free**: 敵死亡時に解放された敵への参照(ターゲット・イベント購読・エフェクトの親)が残り、再利用されたメモリ(UIテキスト!)を書き換えている——「倒した瞬間」「無関係なUI」という症状と完全に整合
2. **buffer overflow**: 死亡演出・ログ処理での配列外書き込み
3. (次点)data race: 非同期ロードやオーディオスレッドと絡むなら

**検証手段**: ASan付きビルドで同シナリオを自動周回(敵を大量に倒すbot)。MinGW等ASan不可環境ならMSVCの/fsanitize=address、またはデバッグヒープ+データブレークポイント(化けるUIテキストのアドレスに書き込み監視 → [デバッガ](/tools/build/build-configurations.html))。

**恒久対策**: 敵への保存参照を世代付きハンドル/TWeakObjectPtr相当に統一し、死亡通知で参照をクリアする規約。CIにASanテストを常設([品質ツール](/tools/build/debugging-and-analysis.html))。

## 総合6. ミニプロジェクト 評価観点

実装の「正解コード」は一つではありません。以下のチェックリストで自己評価してください。

- [ ] 所有の木が描ける(World→敵/弾プール、借用はハンドルor非所有ポインタで明示)
- [ ] 通知の3分類が守られている(ドロップ・スコア=直呼び、実績=バス、UI・SE=キュー)([イベント通知](/design/case-studies/event-notification.html))
- [ ] ゲームロジックのクラスがRule of Zero([特殊メンバ関数](/languages/cpp/ctor-dtor-copy-move.html))
- [ ] 読み取り関数・引数がconst([const correctness](/languages/cpp/const-correctness.html))
- [ ] 敵30種を想定してもクラスが増えない構造(Type Object)
- [ ] 「この規模なら過剰だった部分」を1つ以上自己申告できる(過剰設計の自覚は設計力の一部)
- [ ] `-Wall -Wextra` で警告ゼロ

---

[総合演習に戻る](/guide/exercises/) | [目次に戻る](/guide/cpp-index.html)
