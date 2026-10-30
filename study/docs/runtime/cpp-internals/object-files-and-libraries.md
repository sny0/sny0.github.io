---
title: オブジェクトファイル・実行ファイル・静的ライブラリ・動的ライブラリ・DLL
study:
  source: C++ Wiki
  status: published
  summary: "オブジェクトファイル(.o / .obj): 1翻訳単位ぶんの機械語+シンボル表。未完成品 静的ライブラリ(.a / .lib): .oを束ねた「アーカイブ」。リンク時に実行ファイルへ焼き込まれる"
  section: reference
  format: article
  domain: compilers
---

# オブジェクトファイル・実行ファイル・静的ライブラリ・動的ライブラリ・DLL

## 一言で言うと

- **オブジェクトファイル(.o / .obj)**: 1翻訳単位ぶんの機械語+シンボル表。未完成品
- **静的ライブラリ(.a / .lib)**: .oを束ねた「アーカイブ」。リンク時に**実行ファイルへ焼き込まれる**
- **動的ライブラリ(.so / .dll)**: 完成品に近いバイナリ。**実行時にロードして結合**される
- **実行ファイル(.exe / ELF)**: ローダーが読める完成品

## オブジェクトファイルの中身

```
enemy.o
├─ .text   : 機械語(Enemy::TakeDamage の命令列など)
├─ .data   : 初期化済みグローバル/静的変数の初期値
├─ .bss    : ゼロ初期化変数の「サイズだけ」(実体は実行時に確保)
├─ .rodata : 定数・文字列リテラル
├─ シンボル表: 提供する名前 / 必要とする名前(未解決)
└─ 再配置情報: 「この命令のこの部分は、後でXのアドレスを書き込む」のリスト
```

「未解決の名前」と「再配置情報」があるから未完成品であり、それを埋めるのが[リンカ](/runtime/cpp-internals/build-pipeline-journey.html)です。

## 静的ライブラリ vs 動的ライブラリ

```
静的リンク:                          動的リンク:
game.exe                            game.exe ──実行時に参照──> physics.dll
 ├─ main.o                           ├─ main.o                  (別ファイルのまま)
 ├─ physics.a の中の使われた.o        └─ 「physics.dllのSimulateを使う」という記録
 └─ ...(全部入り・自己完結)
```

| | 静的リンク | 動的リンク(DLL/.so) |
|---|---|---|
| 実行ファイル | 大きい(全部入り) | 小さい(参照だけ) |
| 起動・実行 | 速い・自己完結 | ロードの手間、ファイルが欠けると起動不能 |
| 更新 | 再ビルド・再配布が必要 | **DLL差し替えだけで更新可**(パッチ、プラグイン) |
| 複数プログラムでの共有 | 各自にコピー | メモリ・ディスクを共有できる |
| 最適化 | LTO(リンク時最適化)でライブラリ境界を越えたインライン化が可能 | 境界を越えた最適化は不可 |
| ABI問題 | ビルド時に固定(比較的安全) | **実行時に一致が必要**(→ 下記) |

- 静的ライブラリのリンクは「**使われた.oだけ**取り込む」(アーカイブ全体ではない)。「リンクしたのにシンボルが見つからない」の一因はリンク順・参照順(→ [リンクエラー](/tools/build/link-errors.html))
- Windowsでは動的リンクでも**インポートライブラリ(.lib)**をリンク時に使う(「このDLLにこの関数がある」という目録)。「.libには静的ライブラリとインポートライブラリの2種類がある」ことは混乱の名所

## DLLの実務(Windows/ゲーム)

```cpp
// DLL側: 公開する関数に印を付ける(Windows)
extern "C" __declspec(dllexport) int PluginVersion() { return 3; }
// 使う側(暗黙リンク): ヘッダー+インポートライブラリで普通の関数のように呼ぶ
// 使う側(明示ロード): LoadLibrary("plugin.dll") → GetProcAddress("PluginVersion")
```

- **C++の型・クラスをDLL境界で渡すのはABIの罠**(→ [前ページ](/runtime/cpp-internals/symbols-and-linkage.html))。異なるコンパイラ/設定/CRTでビルドされたDLLとexeの間でstd::stringやnew/deleteの所有権を渡すと壊れる。**境界はC ABI+プレーンなデータ**が鉄則
- 「確保したモジュールが解放する」(DLL内でnewしたものはDLLが提供する解放関数へ返す)と、異なるCRTの状態やアロケータをまたぐ事故を避けやすい。すべてのDLLが常に別ヒープを持つという意味ではない。同じCRTを共有する構成でも、カスタムヒープなどの契約は確認する([Microsoftの注意事項](https://learn.microsoft.com/en-us/cpp/c-runtime-library/potential-errors-passing-crt-objects-across-dll-boundaries))

## ゲーム開発での使われ方

- **エンジン・ミドルウェアの配布形態**: FMOD/Steamworks等はDLL+Cヘッダ(まさにABI安全策)
- **ホットリロード**: ゲームロジックをDLL化し、実行中に差し替えて反映(開発イテレーション高速化)。UEのLive Codingもモジュール(DLL)差し替えが基盤(→ [Unreal Build Tool・Module・Build.cs・Target.cs](/game/unreal/build-system-ubt.html))
- **プラグイン/MOD**: 明示ロード(LoadLibrary)+extern "C"エントリポイント
- コンソール機では静的リンクが基本(単一実行ファイル文化)——プラットフォームで流儀が変わる

## C#との対応

- C#の通常のマネージド.dllはIL+メタデータを持つ[アセンブリ](https://learn.microsoft.com/en-us/dotnet/standard/assembly/)で、ネイティブDLLとはロード・型参照の仕組みが異なる。**対象フレームワーク/API・アセンブリの版・依存関係などの互換性は必要**で、ネイティブ相互運用にはCPU/ABIの条件もある。「UnityのManaged DLL」と「ネイティブDLL」は拡張子だけでは区別できない
- Unityの `Plugins/` フォルダのネイティブプラグイン(.dll/.so/.dylib)がこのページの動的ライブラリで、P/Invoke(`[DllImport]`)がGetProcAddressに相当
- Assembly Definition(.asmdef)は「C#コードの静的ライブラリ分割」に似た開発時の構造化(→ [ヘッダー分割と Assembly Definition](/languages/csharp/headers-vs-asmdef.html))

## Unity開発者が誤解しやすい点

1. 「DLLを置けば動く」— ネイティブDLLはプラットフォーム・アーキテクチャ(x64/ARM64)・依存DLL(VCランタイム等)の一致が必要
2. C# DLLの感覚でネイティブDLLにクラスを公開しようとする——境界はCの関数とデータに落とすのが定石
3. 「実行ファイルは1つの塊」— 実際は起動時に多数のDLL(システム・ドライバ層含む)と結合されて動いている(Process Explorer等で見られる)

## 使う場面 / 使わない場面

- **静的リンク**: 自プロジェクトの内部分割(既定)、コンソール機、配布を単純にしたいツール
- **動的リンク**: ミドルウェアSDK、プラグイン/MOD、ホットリロード、更新パッチをexe再配布なしで当てたい場合
- 内部コードをむやみにDLL分割しない——境界維持(ABI・エクスポート管理)のコストは安くない

## 理解度チェック

1. .oが「未完成品」である理由を2つの中身(未解決シンボル・再配置情報)で説明できますか。
2. 静的/動的リンクのトレードオフを3つ挙げてください。
3. DLL境界でstd::stringを渡すことが危険な理由は?

## 演習

[samples/tu_demo/](/tools/build/samples/tu-demo.html) で `ar rcs libenemy.a enemy.o` として静的ライブラリを作り、`g++ main.o radar.o -L. -lenemy` でリンクしてください。次にリンク順を変えて(-lenemyを先頭に)エラーが出るか観察してください(GNU ldのリンク順依存の体験)。

---

関連項目：[シンボルとリンケージ](/runtime/cpp-internals/symbols-and-linkage.html) / [学習ガイド](/runtime/cpp-internals/) / [テンプレートの実体化とinlineの実際](/runtime/cpp-internals/template-instantiation-and-inline.html)
