---
title: 第7章 コンパイラ・リンカ・実行ファイル・ABI
study:
  source: IT教本
  status: outline
  summary: |-
    ソースから実行ファイルまでの段階を分け、コンパイル・リンク・ロードを観察するための学習計画・概要です。既存本文はC++のビルドとABIを中心に扱います。字句解析・構文解析・IRなど、コンパイラ内部の専用詳解は未整備です。

    ## 関連する辞典本文・実践

    - [main.cppからCPU命令
  section: learning
  format: path
  domain: compilers
  collection: low-level
  order: 8
---

<div id="第7章-コンパイラ・リンカ・実行ファイル-elf-pe-・abi" class="study-legacy-anchor" aria-hidden="true"></div>

# 第7章 コンパイラ・リンカ・実行ファイル・ABI

## このページで案内すること

ソースから実行ファイルまでの段階を分け、コンパイル・リンク・ロードを観察するための**学習計画・概要**です。既存本文はC++のビルドとABIを中心に扱います。字句解析・構文解析・IRなど、コンパイラ内部の専用詳解は未整備です。

## 関連する辞典本文・実践

- [main.cppからCPU命令まで](/runtime/cpp-internals/build-pipeline-journey.html)と[翻訳単位・ヘッダー・ODR](/runtime/cpp-internals/translation-units-and-headers.html)で、処理の段階を追えます。
- [シンボル・リンケージ・ABI](/runtime/cpp-internals/symbols-and-linkage.html)、[オブジェクト・実行ファイル・ライブラリ](/runtime/cpp-internals/object-files-and-libraries.html)では、各段階の成果物を調べられます。

## 学ぶ理由

「ビルド」ボタンの中身は最大級のブラックボックスだ。UE5のビルドは
数千の翻訳単位のコンパイルとリンクであり、リンクエラー(未解決シンボル、
重複定義)、DLL境界の問題、ABI非互換クラッシュ、ビルド時間との戦いは
エンジンプログラマの日常である。「EXEとは何か」を知ることは、
第8章「OSがEXEをどう実行するか」の直接の前提でもある。

## 到達目標

- コンパイルの各段階(前処理→構文解析→最適化→コード生成)を説明できる
- オブジェクトファイル・シンボル・再配置を説明でき、リンクエラーを自力で読める
- PE(Windows)/ELF(Linux)の構造(セクション、インポート/エクスポート)を概説できる
- 静的リンクと動的リンク(DLL)の違い、DLL境界の注意点を説明できる
- ABIとは何か、なぜC++ライブラリのバイナリ配布が難しいかを説明できる
- 最適化がUBを前提に行われることを理解し、実例を読める

## 前提知識

第4章(アセンブリ・呼出規約)、第5章(C・翻訳単位)。

## 学ぶ内容

1. **コンパイラパイプライン**
   ```
   .cpp → [前処理] → [字句/構文解析→AST] → [意味解析]
        → [中間表現(IR)] → [最適化] → [コード生成] → .obj
   ```
   - 前処理(#include展開)で1ファイルが数十万行になる現実
   - 最適化の代表例: 定数畳み込み、インライン展開、ループ不変式移動、
     デッドコード除去、自動ベクトル化
   - **UBと最適化**: 「UBは起きない」前提で最適化される
     (例: 符号付きオーバーフロー前提のループ変換、null検査の削除)
   - デバッグビルド(-Od)とリリースビルド(-O2)の本質的な差
2. **オブジェクトファイルとシンボル**
   - .obj = 機械語 + シンボルテーブル + 再配置情報
   - 定義済みシンボル/未解決シンボル。`dumpbin /symbols` で見る
   - C++の**名前修飾(マングリング)**: `?Update@Player@@QEAAXM@Z`
     ── オーバーロードの実現方法。`extern "C"` の意味
3. **リンカ**
   - 仕事は2つ: シンボル解決 + 再配置(アドレス確定)
   - 静的ライブラリ(.lib)=objの束。リンク順の罠
   - **LNK2019(未解決)/LNK2005(重複)を構造から理解する**
   - ODR(One Definition Rule)とinline、テンプレートの暗黙的重複排除
   - インクリメンタルリンク、LTO/LTCG(リンク時最適化)
4. **実行ファイルフォーマット: PE と ELF**
   - セクション: .text/.data/.rdata/.bss、ヘッダ、エントリポイント
   - PE(Windows): インポートテーブル(IAT)/エクスポート、`dumpbin /headers`
   - ELF(Linux/多くのコンソールの親戚): `readelf -a` で観察(WSL)
   - main()の前に走るもの: CRT起動コード(mainCRTStartup)、
     グローバルコンストラクタ ── 「main前クラッシュ」の正体
5. **動的リンク(DLL/共有ライブラリ)**
   - ロード時リンクと実行時(LoadLibrary/GetProcAddress)
   - __declspec(dllexport/dllimport)、UEの `MODULENAME_API` マクロの正体
   - **DLL境界の掟**: 確保と解放は同じ側で/CRT混在問題/
     STL型をDLL境界で渡す危険
   - ホットリロード(ゲームエンジンのC++リロードはDLL再ロードで実現)
6. **ABI(Application Binary Interface)**
   - 呼出規約(第4章)+構造体レイアウト+マングリング+例外/vtable表現の総体
   - 「C++にはABI標準がない」→ コンパイラ/バージョン違いのバイナリ混在は危険
   - ゲーム業界でC APIがプラグイン境界に使われる理由
7. **ビルドシステム**
   - なぜMakeやCMakeが要るのか(依存グラフと差分ビルド)
   - UEのUnrealBuildTool・Unity(C#コンパイル+IL2CPP)は
     この章の仕組みの自動化にすぎない

## 重要概念

- **翻訳単位は独立にコンパイルされ、リンカが繋ぐ** ── C/C++ビルドモデルの核心
- **シンボル** ── 関数・変数の「名前と住所」の台帳
- **実行ファイル=OSへの積み込み指示書**(第8章へ直結)
- **ABI=バイナリレベルの互換性契約**
- **最適化はUBを前提とする** ── 「-O2でだけ壊れる」の正体

## ゲーム開発との関係

| 現場の事象 | この章の知識 |
|---|---|
| LNK2019/LNK2005との格闘 | シンボル解決・ODR |
| UEのモジュール(.Build.cs)とDLL群 | 動的リンク・エクスポート |
| プラグインSDKがC APIな理由 | ABI非互換 |
| リリースビルドでだけ挙動が変わる | 最適化とUB |
| ビルド20分…を速くしたい | 翻訳単位・ヘッダ依存・LTO |
| main前にクラッシュ | グローバルコンストラクタ・CRT |
| C++ホットリロード | DLL再ロード |

## 演習

1. 2つの.cppからなるプログラムを**コマンドラインで** `cl /c` →`link` と
   段階を分けてビルドせよ。`dumpbin /symbols` でシンボルを観察せよ。
2. わざとLNK2019とLNK2005を起こし、エラーメッセージの
   マングリング名を`undname`で復元して読め。
3. 簡単なDLLを作り、(a)インポートライブラリ経由 (b)LoadLibrary/
   GetProcAddress経由 の両方で呼び出せ。
4. `dumpbin /headers /imports` で自作EXEと(観察用に)ゲームのEXEの
   セクション・インポートDLL一覧を眺めよ。WSLでは `readelf -S` で
   ELFと比較せよ。
5. Compiler Explorerで、符号付きオーバーフローUBを含むループが
   -O2でどう「豪快に」最適化されるか観察せよ。
6. **ミニコンパイラ**: Rui Ueyama「低レイヤを知りたい人のための
   Cコンパイラ作成入門」(Web無料)の最初の数ステップ
   (整数→四則演算→比較)を写経し、「ソース→アセンブリ出力」を体験せよ。

## おすすめ書籍

- 坂井弘亮『リンカ・ローダ実践開発テクニック』── 和書の決定版
- Rui Ueyama「低レイヤを知りたい人のためのCコンパイラ作成入門」(Web)
- John Levine "Linkers and Loaders" ── 古典
- 『Windows Internals』第3章あたり(PEローダ、第8章と併読)
- ドラゴンブック(『コンパイラ 原理・技法・ツール』)は**発展編送り**。
  ゲームプログラマは最適化章の拾い読みで十分

## おすすめOSS

- **chibicc**(rui314/chibicc)── 読める本物のCコンパイラ(約1万行)
- **mold**(rui314/mold)── 爆速リンカ。READMEの設計解説だけでも
- LLVM ── 発展編で。今は「存在と役割」を知ればよい

## おすすめ動画

- Matt Godbolt CppCon "The Bits Between the Bits: How We Get to main()"
  ── 起動シーケンスの決定版講演
- Rui Ueyama氏のリンカ/コンパイラ講演(YouTube)
- CppCon "What Has My Compiler Done for Me Lately?"(Godbolt)

## 読むべきソースコード

- chibicc(main.c → tokenize → parse → codegen の流れ)
- UE5の任意モジュールの `*.Build.cs` と `*_API` マクロ定義
- CRTのエントリポイント(VS付属の `exe_common.inl` を眺める)

## 理解度チェック

1. コンパイラとリンカの役割分担を「シンボル」の言葉で説明せよ。
2. LNK2019とLNK2005はそれぞれ何が起きているか。
3. inline関数やテンプレートがヘッダに書けるのはなぜか(ODRとの関係)。
4. DLLとstaticライブラリの違い。DLL境界でnew/deleteを跨いではいけない理由。
5. ABIとは何か。C++ライブラリをバイナリ配布しにくい理由を3つ。
6. EXEの.text/.data/.rdataセクションにはそれぞれ何が入っているか。
7. 「リリースビルドでだけバグる」の代表的な原因を2系統挙げよ
   (UB系・未初期化系)。

---

## この章がゲームのどこで使われているか

```
[開発時]
 あなたのC++ ──(コンパイラ)──> .obj群 ──(リンカ)──> Game.exe + 多数のDLL
      │ UEなら: UBTがモジュール毎にDLL化 / Unityなら: C#→IL→IL2CPP→C++→この流れ
[起動時]
 Game.exe ──> OSのPEローダが .text/.dataをメモリへ配置(第8章)
          ──> インポートテーブルで d3d12.dll / xinput1_4.dll 等を解決
          ──> CRT起動 → グローバルコンストラクタ → WinMain → ゲームループへ
[実行時]
 ホットリロード = DLLの再ロード / プラグイン = LoadLibrary
 クラッシュダンプの関数名表示 = シンボル情報(PDB)
```
