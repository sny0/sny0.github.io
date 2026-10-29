---
title: "第8部 演習 — ビルドとライブラリ"
study:
  source: "C++ Wiki"
  kind: "演習"
  status: "既存原稿"
  summary: "次の道具はどの層のものですか(メタビルド/ビルドシステム/コンパイラ/リンカ/その他)。 Ninja 2. CMake 3. cl.exe 4. link.exe 5. clang-tidy 6. AddressSanitizer"
---

# 第8部 演習 — ビルドとライブラリ

## 問1. 概念確認

次の道具はどの層のものですか(メタビルド/ビルドシステム/コンパイラ/リンカ/その他)。

1. Ninja  2. CMake  3. cl.exe  4. link.exe  5. clang-tidy  6. AddressSanitizer

<details><summary>解答</summary>

1. ビルドシステム。2. メタビルド(設計図からNinja等を生成 — 自身はビルドしない)。3. コンパイラ(MSVC)。4. リンカ(MSVC)。5. 静的解析ツール(Clang基盤)。6. コンパイラが埋め込む実行時検査(サニタイザ)([ビルドとは](/tools/build/what-is-build.html)、[品質ツール](/tools/build/debugging-and-analysis.html))。
</details>

## 問2. コード読解(エラーメッセージ)

次のエラーの原因として最も可能性が高いものと、確認手順を答えてください。

```
error LNK2038: '_ITERATOR_DEBUG_LEVEL' の不一致が検出されました。
値 '0' が 2 の値 'main.obj' と一致しません。(physics.lib)
```

<details><summary>解答</summary>

physics.lib が**Release構成**(IDL=0)でビルドされ、main.objが**Debug構成**(IDL=2)——構成違いのバイナリ混在([ABI互換性](/tools/build/link-errors.html))。確認: physics.libの入手元がDebug/Release両方を提供しているか、自分のリンク設定がどちらの.libを指しているか。対処: 構成ごとに対応する.libをリンクする(CMakeなら `$<CONFIG>` で分岐)。
</details>

## 問3. 問題のある構成の改善

「common.h に全クラスのincludeとよく使う定数を集約し、全.cppがこれをincludeしている。定数を1つ変えると全ビルド(15分)が走る」。改善案を3つ、効果順に挙げてください。

<details><summary>解答の要点</summary>

(1) **common.hの解体**: 定数系(高頻度変更)とライブラリinclude(低頻度)を分離し、各.cppは必要なものだけincludeする——変更の波及範囲を縮める根本対策([ビルド時間](/tools/build/build-speed.html)、[凝集度](/design/foundations/cohesion-and-coupling.html)の物理版)。(2) 低頻度変更部分(標準ライブラリ等)を**PCH化**——パースの重複を除去。(3) 調整頻度の高い定数は**データファイル化**(ホットリロード)し、コンパイル自体を不要に([Type Object](/game/patterns/type-object-and-sandbox.html)方向)。
</details>

## 問4. 設計比較

社内ライブラリ「math_utils」を、(a) ヘッダーオンリー(全部inline/テンプレート)、(b) 静的ライブラリ、(c) DLL、のどれで配るか。利用チームが5つ、更新頻度は月1、性能クリティカルな小関数中心、という条件で比較してください。

<details><summary>解答の要点</summary>

(a) 小関数のインライン化が効く(性能◎)、導入が楽。代償: 利用側のビルド時間増、更新が全チームの再コンパイル。(b) ビルド時間は改善するが、小関数の呼び出しコスト(LTOで緩和可)とバージョン運用が必要。(c) 月1更新でDLL差し替えは魅力だが、C++ ABI境界の危険(コンパイラ・構成の統一が必要)と小関数のDLL呼び出しコストで不利([ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html))。この条件(小関数・性能重視)なら**(a)が定石**。数学ライブラリがヘッダーオンリー(glm等)なのはこの理由。
</details>

## 問5. デバッグ問題

「昨日まで通っていたビルドが、ライブラリを最新版に上げたら `undefined reference to Physics::Step(float)` になった」。考えられる原因を2つと確認方法を書いてください。

<details><summary>解答の要点</summary>

(1) 新版でシグネチャが変わった(`Step(float, int)` になった等): ヘッダーは新しいが.libが古い(またはその逆)——`nm/dumpbin` で.lib側の提供シンボルを確認し、ヘッダーの宣言と突き合わせる([リンクエラー](/tools/build/link-errors.html))。(2) 新版でその関数がinline化/削除/別モジュール移動された: リリースノートとヘッダーdiffを確認。教訓: **ライブラリ更新はヘッダーとバイナリをセットで**+クリーンビルド。
</details>

## 問6. 説明問題

「なぜUnityではビルドのことをほぼ考えなくてよかったのに、C++では一大テーマなのか」を、ヘッダー・テンプレート・ABIの3語を使って4文以内で説明してください。

<details><summary>解答例</summary>

C#は通常ヘッダーではなくアセンブリのメタデータから型を参照するため、C++のテキストincludeと同じ宣言の再パースは不要です。ジェネリックはILとメタデータに表現され、機械語化やコード共有の方法は型とJIT/AOT方式に依存し、C++の翻訳単位ごとのテンプレート実体化とは異なります。マネージド参照にも対象API・アセンブリと依存の版・実行環境の互換条件があり、UnityのIL2CPPやネイティブプラグインにはC++側のビルドとABIの条件も加わります。C++ではヘッダー、テンプレート、ライブラリ境界のABIを管理する必要があり、実行時の表現や最適化を細かく制御できる一方、性能は実装と計測で確かめます([ビルド時間](/tools/build/build-speed.html)、[ABI](/runtime/cpp-internals/symbols-and-linkage.html))。
</details>

## 問7. 小規模実装問題

[samples/cmake_demo/](/tools/build/samples/cmake-demo.html) を拡張してください:

1. 新ライブラリ `game_ai`(game_coreに依存)をターゲットとして追加
2. Debug構成でのみ `GAME_DEBUG_DRAW` をdefine(`target_compile_definitions` + `$<CONFIG:Debug>`)
3. (発展)`enable_testing()` + 最小のテスト実行ターゲット

<details><summary>評価基準</summary>

(a) 依存の向きが game_ai → game_core の一方向で、逆リンクがない([依存の方向](/design/foundations/dependency.html)のビルドでの表現)。(2) Release構成でdefineが消えることを確認。(3) `ctest` が走れば完了。
</details>

---

前: [リンクエラー](/tools/build/link-errors.html) | [カテゴリ目次](/tools/build/) | [第9部: Unity/C#との対応へ](/languages/csharp/)
