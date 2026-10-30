---
title: リンクエラー — 未解決外部シンボル・多重定義・ABI互換性
study:
  source: C++ Wiki
  status: published
  summary: "リンクエラーはC++入門者を最も絶望させるエラーですが、原因はほぼ3パターンです。仕組み(シンボルとリンケージ)を前提に、症状→原因→処方の逆引きとしてまとめます。 意味: 「この関数を呼ぶコードはあるが、定義(実体)がどの.o/ライブラリにもない」。コンパイルは通っている(宣言はあった)ことに注意"
  section: reference
  format: article
  domain: tools
---

# リンクエラー — 未解決外部シンボル・多重定義・ABI互換性

リンクエラーはC++入門者を最も絶望させるエラーですが、原因は**ほぼ3パターン**です。仕組み([シンボルとリンケージ](/runtime/cpp-internals/symbols-and-linkage.html))を前提に、症状→原因→処方の逆引きとしてまとめます。

## パターン1: 未解決外部シンボル (undefined reference / LNK2019)

```
undefined reference to `Enemy::TakeDamage(int)'        (GCC/Clang)
error LNK2019: 未解決の外部シンボル "public: void __cdecl Enemy::TakeDamage(int)"  (MSVC)
```

**意味**: 「この関数を呼ぶコードはあるが、**定義(実体)がどの.o/ライブラリにもない**」。コンパイルは通っている(宣言はあった)ことに注意——[ビルドの旅](/runtime/cpp-internals/build-pipeline-journey.html)の④で起きる病気です。

チェックリスト(頻度順):

1. **定義を書き忘れ / .cppをビルド対象に入れ忘れ**(CMakeのソースリスト漏れ)
2. **ライブラリをリンクしていない**(`-lfmod` を書いていない、.libを追加していない)
3. **リンク順**(GNU ld系はコマンドラインの左から右に解決。ライブラリは**使う側より後ろ**に書く)
4. **宣言と定義のシグネチャ不一致**(`void Foo(int)` を宣言、`void Foo(long)` を定義——別シンボルになる)
5. **テンプレートの定義が.cppにある**(実体化できない → ヘッダーへ移す。→ [実体化](/runtime/cpp-internals/template-instantiation-and-inline.html))
6. C++からCの関数を呼んでいて `extern "C"` がない(名前修飾の不一致)
7. 仮想デストラクタやvtable絡み: `undefined reference to vtable for X` は**キー仮想関数(最初の非inline仮想関数)の定義漏れ**のサイン

## パターン2: 多重定義 (multiple definition / LNK2005)

```
multiple definition of `g_config'
error LNK2005: "int g_score" は既に main.obj で定義されています
```

**意味**: [ODR](/runtime/cpp-internals/translation-units-and-headers.html)違反。同じ定義が複数の.oに存在。

チェックリスト:

1. **ヘッダーに非inline関数の定義**を書いた → inlineを付けるか.cppへ
2. **ヘッダーにグローバル変数の定義**(`int g_score;`)→ `inline int g_score = 0;`(C++17)か、ヘッダーはexternの宣言+.cppで定義
3. include guardの欠如(同一翻訳単位内の再定義はコンパイルエラーとして出る)
4. Unity Build導入時のstatic/名前の衝突(→ [ビルド時間](/tools/build/build-speed.html))

## パターン3: ABI・実行時のリンク問題

リンクは通ったのに壊れる/特殊なリンクエラーが出る、上級の病気(→ [ABI](/runtime/cpp-internals/symbols-and-linkage.html))。

1. **設定違いのバイナリ混在**: MSVCでDebugとReleaseのライブラリを混ぜる(イテレータサイズが違い、LNK2038「_ITERATOR_DEBUG_LEVELの不一致」や実行時破壊)。CRTの静的/動的(/MT vs /MD)混在も同種
2. **ABIやファイル形式の不一致**: MinGW製のC++ライブラリとMSVCプロジェクトなど。コンパイラ名だけでなく、公開型・標準ライブラリ・呼出規約・対象CPUを確認する。C ABIに絞った連携とは条件が異なる
3. **ライブラリのビルド時と使用時でヘッダーのバージョンが違う**: 構造体レイアウトが変わっていて、リンクは通るが実行時にメンバがズレて壊れる(検出困難な最悪ケース。ライブラリ更新時はクリーンビルド)
4. DLL境界のC++型・CRT跨ぎのnew/delete(→ [DLL](/runtime/cpp-internals/object-files-and-libraries.html))

## デバッグの道具

```
nm -C libgame.a | grep TakeDamage      # このライブラリは該当シンボルを「提供(T)」しているか「要求(U)」か
objdump -t / dumpbin /symbols          # 同上(MSVC)
c++filt "_ZN5Enemy10TakeDamageEi"      # 修飾名の復元
リンカの詳細ログ: -Wl,--verbose / /VERBOSE   # どのライブラリをどの順で見たか
```

「**そのシンボルを、誰が要求し、誰が提供しているはずか**」を機械的に確認する——勘ではなくシンボル表で戦うのが上達の近道です。

## C#/Unityとの対応

- C#のマネージドアセンブリは、ヘッダー/オブジェクトファイルを結ぶC++と異なる方式で型を参照する。一方で、参照や対象APIの不一致、実行時のアセンブリ読み込み失敗、必要な型/メソッドの不足は起こる。ネイティブプラグインにはDLLの所在・対象CPU・ABI・シンボルの条件もある
- Unityの**IL2CPPビルド時のネイティブリンクエラー**(プラグインのシンボル不足など)は本ページの例に対応する。strippingで必要な管理コードが除かれる問題は区別し、必要に応じてlink.xml等で保持する(→ [IL2CPP](/languages/csharp/il2cpp.html))
- UEでは「モジュールの依存(Build.csのDependencyModuleNames)書き忘れ」が未解決シンボルの主因(→ [Unreal Build Tool・Module・Build.cs・Target.cs](/game/unreal/build-system-ubt.html))

## 理解度チェック

1. 「コンパイルは通ったのにリンクで落ちる」が起こる仕組みを説明できますか。
2. undefined reference の原因トップ3は?
3. 「リンクは通るが実行時に壊れる」ABI問題の例を1つ挙げてください。

## 演習

[samples/tu_demo/](/tools/build/samples/tu-demo.html) で意図的に、(a) enemy.cppをリンク対象から外して未解決外部シンボル、(b) enemy.hの関数からinlineを外して多重定義、を再現し、エラーメッセージからシンボル名を読み取って原因を特定する練習をしてください。

---

関連項目：[品質のための道具](/tools/build/debugging-and-analysis.html) / [学習ガイド](/tools/build/) / [演習](/tools/build/exercises.html)
