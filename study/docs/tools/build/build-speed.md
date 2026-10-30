---
title: ビルド時間 — incremental build・PCH・Unity Build・C++でビルドが遅くなる理由
study:
  source: C++ Wiki
  status: published
  summary: "#includeの爆発: #include だけで数万行が翻訳単位に貼り付く(プリプロセッサ)。100個の.cppが同じヘッダーを含めば、同じ数万行を100回パースする テンプレートの再実体化: vector を使う全翻訳単位で実体化→リンカが重複を捨てる。「作っては捨てる」の山(→ 実体化)"
  section: reference
  format: article
  domain: tools
---

# ビルド時間 — incremental build・PCH・Unity Build・C++でビルドが遅くなる理由

## なぜC++のビルドは遅いのか(原因の理解が対策の半分)

1. **#includeの爆発**: `#include <vector>` だけで数万行が翻訳単位に貼り付く([プリプロセッサ](/runtime/cpp-internals/build-pipeline-journey.html))。100個の.cppが同じヘッダーを含めば、**同じ数万行を100回パース**する
2. **テンプレートの再実体化**: `vector<int>` を使う全翻訳単位で実体化→リンカが重複を捨てる。「作っては捨てる」の山(→ [実体化](/runtime/cpp-internals/template-instantiation-and-inline.html))
3. **最適化・LTO**: -O2の解析、リンク時最適化は全プログラム解析
4. **ヘッダー依存の連鎖**: 1つのヘッダー変更が、それをincludeする全.cppの再コンパイルを誘発(**変更の波及範囲=ビルド時間**——[結合度](/design/foundations/cohesion-and-coupling.html)が物理現象になったもの)

## 対策1: incremental build(差分ビルド)を機能させる

- ビルドシステムは「変更されたファイル+その影響先」だけ再ビルドする(→ [ビルドとは](/tools/build/what-is-build.html))。**これが効かない構造**にしてしまうのが問題:
  - 「何でも入りヘッダー」(全域includeされる `common.h` に頻繁に触る)→ 毎回全ビルド
  - ヘッダーに実装を書きすぎる → 変更のたび広範囲が再コンパイル
- **対策はヘッダー衛生**: 前方宣言でincludeを減らす([翻訳単位](/runtime/cpp-internals/translation-units-and-headers.html))、実装は.cppへ、変更頻度の高いものを上流ヘッダーに置かない、includeの棚卸し(include-what-you-use)

## 対策2: PCH (Precompiled Header)

「ほぼ全員が使い、ほぼ変更されないヘッダー群」(標準ライブラリ、エンジンAPI)を**1回だけコンパイルした状態で保存**し、各翻訳単位はそこから開始する仕組み。

```cmake
# CMake 3.16+
target_precompile_headers(game_core PRIVATE <vector> <string> <memory> "engine/core.h")
```

- 効果は大(体感数倍もある)。代償: PCH対象を変更すると**全再ビルド**/「PCHに入っているから」とincludeを書かない癖がつくと依存が見えなくなる(PCH無し環境で壊れる)
- C++20の**モジュール**が根本解決の方向だが、ツールチェーンの成熟待ちの過渡期(2020年代半ば時点)

## 対策3: Unity Build(Jumbo Build)

複数の.cppを `#include` で1つの巨大.cppにまとめてコンパイルする力技(**Unityエンジンとは無関係**。名前が同じだけなので注意)。

```cpp
// unity_batch_01.cpp(生成物)
#include "enemy.cpp"
#include "player.cpp"
#include "quest.cpp"
```

- 効果: ヘッダーの重複パースとテンプレート再実体化が激減(フルビルドが数分の一になる例も)。UEのUBTは既定でこれを行う(Adaptive Unity Build)
- 代償:
  - **翻訳単位の分離が壊れる**: 別ファイルの `static`/無名namespaceが衝突、usingが漏れる——「Unity Buildでだけビルドが壊れる/通ってしまう」
  - 差分ビルドが粗くなる(1ファイル変更でバッチ丸ごと再コンパイル)
- CMake: `set(CMAKE_UNITY_BUILD ON)`

## 対策4: その他の実務手段

- **Ninja**(Makeより高速なスケジューリング)+並列数の適正化
- **分散ビルド**(IncrediBuild、FASTBuild、sccache)——大規模スタジオの標準装備
- リンク時間: 分割ライブラリ、増分リンク、mold/lldなど高速リンカ
- **計測**: Clangの `-ftime-trace`、ninjaのログで「どのファイル・どのヘッダーが遅いか」を特定してから直す(ビルド時間も[計測してから最適化](/design/foundations/yagni-kiss-dry.html))

## C#/Unityとの対応

- C#のコンパイルが速い理由: ヘッダーがない(メタデータ参照)、テンプレート再実体化がない(ジェネリックは実行時)、パース対象が書いた分だけ——**C++の遅さの原因が構造的に存在しない**
- Unityで遅いのは主にドメインリロードとアセット処理で、コンパイル自体は速い。Assembly Definition分割は「変更の波及範囲を狭める」というこのページと同じ思考(→ [ヘッダー分割と Assembly Definition](/languages/csharp/headers-vs-asmdef.html))
- UEのビルドが遅いのは、まさにこのページの問題との戦い(UBTのPCH+Unity Build+モジュール分割は全部このページの対策の実装)

## 実務指針(優先順)

1. 計測(どこが遅い?)
2. ヘッダー衛生(前方宣言・include削減)——設計改善でもある
3. PCH(手軽で効果大)
4. Unity Build(効果大だが規律が要る)
5. ハードウェア・分散(金で解決)

## 理解度チェック

1. C++のビルドが遅い構造的理由を2つ(include爆発・テンプレート再実体化)説明できますか。
2. PCHの効果と2つの代償は?
3. Unity Buildが壊す「分離」とは何ですか。

## 演習

samples/cmake_demo/ に `set(CMAKE_UNITY_BUILD ON)` を試し、(a) フルビルド時間の変化(小規模なので差は小さい)、(b) 2つの.cppに同名のstatic関数を書いて衝突が起きることを確認してください。

---

関連項目：[ビルド構成](/tools/build/build-configurations.html) / [学習ガイド](/tools/build/) / [品質のための道具](/tools/build/debugging-and-analysis.html)
