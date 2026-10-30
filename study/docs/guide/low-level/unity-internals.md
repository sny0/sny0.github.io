---
title: 第16章 Unityの内部を調べる
study:
  source: IT教本
  status: outline
  summary: |-
    C#とネイティブ側の境界、GC、実行方式、描画を調べるための学習計画・概要です。非公開部分の内部像は説明モデルとして扱い、公開資料・参照ソース・計測で確認した事実と区別します。一般C#の基礎を網羅する本文ではありません。

    ## 関連する辞典本文・実践

    - [IL2CPP](/langua
  section: learning
  format: path
  domain: game
  collection: low-level
  order: 17
---

<div id="第16章-unityの内部-──-「内部実装を想像できる」ようになる" class="study-legacy-anchor" aria-hidden="true"></div>

# 第16章 Unityの内部を調べる

## このページで案内すること

C#とネイティブ側の境界、GC、実行方式、描画を調べるための**学習計画・概要**です。非公開部分の内部像は説明モデルとして扱い、公開資料・参照ソース・計測で確認した事実と区別します。一般C#の基礎を網羅する本文ではありません。

## 関連する辞典本文・実践

- [IL2CPP](/languages/csharp/il2cpp.html)と[管理ヒープ・UnityのGC Alloc](/runtime/memory/gc-and-csharp-comparison.html)で、実行とメモリの仕組みを調べられます。
- [UnityのレンダラーとSRP](/graphics/engine/unity-renderer.html)、[Unityのシューティング実装](/game/shooter-unity.html)で、描画と小さな実装へ進めます。

## 学ぶ理由

Unityには、参照用C#ソースなど公開されている部分と、一般にはソースを参照できない部分がある。
**公開資料や参照ソースを読み、内部像の仮説を計測で確かめる**。
GetComponentやGC Allocのコスト、IL2CPPの変換経路、DOTSのデータ配置を、
対象バージョンの仕様と実測に結び付けることが、設計や最適化の判断に役立つ。
また「マネージド言語がネイティブとどう共存するか」という主題は
スクリプト搭載エンジン全般(Lua, GDScript等)に通じる一般教養である。

## 到達目標

- Unityの2世界構造(C++エンジンコア+C#ユーザーコード)を説明できる
- C#のコンパイルと実行(IL→Mono JIT / IL2CPP AOT)を説明できる
- GCの仕組み(世代別/インクリメンタル)とGC Alloc回避術を原理から説明できる
- GameObject/Componentの説明モデルを使い、GetComponent等のコストを資料と計測で調べられる
- DOTS(ECS/Jobs/Burst)がこれまでの章のどの原理の応用かを説明できる
- Unityプロファイラ/Frame Debuggerで問題を切り分けられる

## 前提知識

第7章(コンパイラ・JIT/AOTの語彙)、第8章(スレッド)、第9章(C++)、
第15章(エンジン一般論)。C#の基本文法(適宜補う)。

## 学ぶ内容

1. **Unityの全体構造**
   - ネイティブC++コア(レンダラ・物理PhysX・アセット・シーン管理)
     + マネージドC#層(ユーザースクリプト+参照実装UnityCsReference)
   - C#⇔C++の境界(internal call / P-Invoke的ブリッジ)──
     「Transform.positionのgetが関数呼び出しでネイティブへ渡る」コスト
   - PlayerLoop: ネイティブ側のゲームループが各C# Update群を呼ぶ
     (第14章の図と対応させる)
2. **C#の実行モデル**
   - C# → IL(中間言語)→ (a) Mono: **JIT**コンパイル
     (b) **IL2CPP**: ILをC++に変換→各プラットフォームのC++コンパイラで
     AOTコンパイル(第7章の全知識で読める)
   - IL2CPPの生成コードを実際に読む(ジェネリック展開・メソッド表)
   - AOTの制約(実行時コード生成不可)とジェネリクスの落とし穴
3. **メモリとGC**
   - マネージドヒープ / ネイティブヒープの2重構造
     (プロファイラの「GC Alloc」と「Native Memory」の区別)
   - Boehm GC(保守的・非移動)→ インクリメンタルGCの現状
   - **GCスパイクの正体**(マーク&スイープの停止時間)
   - GC Alloc回避のイディオムがなぜ効くかを原理から:
     文字列結合・ボクシング・クロージャ・LINQ・yield が確保する理由
   - struct(値型)とclass(参照型)のメモリレイアウト ── 第3,6章の直結
4. **GameObject/Componentの内部像**
   - GameObjectは「Componentポインタのリストを持つネイティブオブジェクト」
   - C#側オブジェクトはネイティブへの**ハンドル/ラッパ**として理解する。
     通常の `Destroy(obj)` は破棄を予約し、実際の破棄は現在のUpdateループ後・描画前に行われる。
     呼出し直後に必ず `obj == null` がtrueになるという意味ではない。実体の破棄後も
     C#参照は残り得るが、UnityEngine.Objectの `== null` はnative側の存在も判定するため、
     `ReferenceEquals(obj, null)` と結果が異なる場合がある(Unity 6.0の仕様)
   - GetComponent(型検索)・Find系(名前検索)のコストを内部像から推測
   - Transform階層の更新(dirty伝播)、SetActiveのコスト
5. **アセットとシリアライズ**
   - メタファイル・GUID、AssetBundle/Addressables(第15章クックの実物)
   - シリアライズの規則(なぜpublicフィールドか、SerializeField)
6. **レンダリングパス**
   - Built-in / URP / HDRP(SRP: C#で描画パイプラインを記述する設計)
   - バッチング(static/dynamic/SRP Batcher/GPU instancing)の中身
     ── 第13章ドローコール知識の応用
   - Frame Debuggerでドローコール列を読む(RenderDoc併用)
7. **DOTS ── これまでの全章の答え合わせ**
   - ECS(アーキタイプ型: 第15章)、C# Job System(第8章ジョブ+
     安全性チェック)、**Burst**(LLVMベースのSIMD最適化コンパイラ:
     第4章の目で出力アセンブリを読む)
   - NativeArray/Allocator(第6章アロケータの実物)
   - 「DOTSはなぜ速いか」を3つの章(3,8,4)で説明できるようにする

## 重要概念

- **2世界構造とブリッジコスト** ── Unity最適化の第一原理
- **JIT vs AOT(IL2CPP)** ── プラットフォーム対応とビルドの理解
- **GC Allocは「原理的に」追跡できる** ── 迷信でなく仕組みで回避
- **C#オブジェクト=ネイティブへのハンドル** ── null挙動・寿命の謎の解
- **DOTS=データ指向の産業実装**

## ゲーム開発との関係

| 現場の事象 | この章の知識 |
|---|---|
| GCスパイクでカクつく | GCの停止・Alloc追跡 |
| Update内のGetComponent禁止規約 | ブリッジ+型検索コスト |
| Destroyしたのに== nullにならない系の混乱 | ハンドル構造・演算子オーバーロード |
| iOSビルドはIL2CPP必須 | AOT制約 |
| SetPass Calls/Batchesの削減 | バッチング内部 |
| 大量ユニットはDOTSで | ECS/Jobs/Burst |

## 演習

1. UnityCsReference(GitHub)で `MonoBehaviour` や `GameObject` の
   C#側実装を読み、ネイティブ呼び出し(extern)との境界を確認せよ。
2. IL2CPPビルドの生成C++(`Il2CppOutputProject`)から自分のスクリプトの
   変換結果を探して読め。ILSpyでILも見よ(C#→IL→C++の3層対照)。
3. Profilerで「GC Allocが出る書き方」10種(文字列結合、LINQ、
   ボクシング、クロージャ等)を意図的に書き、ゼロにする書き換えをせよ。
4. `struct` 100万要素の配列と `class` 100万インスタンスの走査速度を
   比較し、第3章の言葉で説明せよ。
5. Frame Debugger+RenderDocで自作シーンのドローコール列を読み、
   SRP Batcherの効果を確認せよ。
6. 同じ「1万体の移動」をMonoBehaviour版とDOTS(ECS+Jobs+Burst)版で
   実装し、プロファイラで比較。Burst Inspectorで出力アセンブリを読め
   (第4章の実戦投入)。

## おすすめ書籍

- 『Unityパフォーマンスチューニングバイブル』(CyberAgent、無料公開)──
  和書系で最実務的。内部の裏取りに最適
- Unity公式マニュアル「メモリ」「IL2CPP」「SRP」章(一次情報)
- 『CLR via C#』── .NETランタイムの深掘り(発展)
- Catlike Coding(Web)── URP/シェーダ/DOTSの良質チュートリアル

## おすすめOSS

- **UnityCsReference**(Unity-Technologies/UnityCsReference)──
  C#側の公式参照ソース
- **Mono**(mono/mono)── JIT・GCの実物(拾い読み)
- Entities(DOTS)パッケージのソース(Package Cacheから読める)
- ILSpy / dnSpy ── IL逆コンパイラ(ツール)

## おすすめ動画

- Unite/Unity公式 "Understanding IL2CPP" / "Deep dive into DOTS"
- CEDEC/Unite Tokyoの最適化講演(GC・バッチング系)
- Catlike Coding系のDOTS実装動画

## 読むべきソースコード

- UnityCsReferenceの `Runtime/Export/Scripting/MonoBehaviour.bindings.cs`
  など bindings 系ファイル(2世界の境界線の実物)
- IL2CPPが生成した自分のコードのC++
- Monoの `mono/metadata/boehm-gc.c` 周辺(眺める程度でよい)

## 理解度チェック

1. 「UnityはC++エンジンである」とはどういう意味か。C#はどこで動くか。
2. Mono(JIT)とIL2CPP(AOT)の違い、iOSでAOT必須の理由は?
3. GCスパイクはなぜ起きるか。回避の基本戦略を3つ。
4. `Destroy(obj)` の破棄予約と実際の破棄時点を区別せよ。破棄後の
   `obj == null` と `ReferenceEquals(obj, null)` の結果が異なり得る理由は?
5. LINQやクロージャがGC Allocを生む理由を、コンパイラが生成する
   コードの観点で説明せよ。
6. DOTSが速い理由を、第3章・第4章・第8章の言葉で1つずつ挙げよ。
7. SRP Batcherは何のコストを削っているか(第13章の言葉で)。

---

## この章がゲームのどこで使われているか

```
Unityゲームの1フレーム
─────────────────────────────────────────────────
[C++ネイティブ] PlayerLoop開始
   → 入力更新(第14章) → 物理(PhysX)
   → C#へブリッジ ─────────────────────┐
[C#マネージド]  FixedUpdate/Update/LateUpdate │← あなたのコード
               (Mono JIT または IL2CPP産C++)  │  GC Allocはここで発生
   ←──────────────────────────────────┘
   → アニメ → レンダラ(SRP) → コマンド生成 → GfxDevice(第13章)
   → GPU(第11,12章) → Present
─────────────────────────────────────────────────
プロファイラの縦軸(PlayerLoop/GC/Gfx)がこの図の各行に対応する
```

## 記述の確認資料

- [Unity 6.0: Object.Destroy](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.Destroy.html)
- [Unity 6.0: Object.operator ==](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object-operator_eq.html)
