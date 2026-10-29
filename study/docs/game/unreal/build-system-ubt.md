---
title: "Unreal Build Tool・Module・Build.cs・Target.cs"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "UEはCMake等の一般ツールを使わず、C#で書かれた独自ビルドシステム UBT (Unreal Build Tool) で全プラットフォームのビルドを指揮します。分割単位はModuleで、依存は Build.cs に、成果物の種類は Target.cs に書きます——第8部で学んだ概念のUE方言で"
---

# Unreal Build Tool・Module・Build.cs・Target.cs

## 一言で言うと

UEは[CMake等の一般ツール](/tools/build/build-tools-cmake.html)を使わず、**C#で書かれた独自ビルドシステム UBT (Unreal Build Tool)** で全プラットフォームのビルドを指揮します。分割単位は**Module**で、依存は **Build.cs** に、成果物の種類は **Target.cs** に書きます——[第8部で学んだ概念](/tools/build/what-is-build.html)のUE方言です。

## 対応表(第8部の知識で読む)

| 一般C++ | UE | 備考 |
|---|---|---|
| ビルドシステム(CMake+Ninja) | UBT | UHT実行・PCH・Unity Build・プラットフォーム分岐まで統合 |
| ライブラリ/ターゲット(add_library) | **Module**(Build.csを持つフォルダ) | 静的/動的リンクをUBTが決定 |
| target_link_libraries | Build.csの `PublicDependencyModuleNames` 等 | 依存宣言 |
| PUBLIC/PRIVATEの伝播 | Public/Private フォルダ+Public/Private依存 | ヘッダー公開範囲も同じ思想([asmdef比較](/languages/csharp/headers-vs-asmdef.html)) |
| 実行ファイル定義 | **Target.cs**(Game/Editor/Server等) | ビルド構成の頂点 |
| Debug/Release構成 | DebugGame / Development / Shipping | [第8部の構成](/tools/build/build-configurations.html)と同じ思想 |

## Build.cs(Moduleの依存宣言)

```csharp
// MyGame/Source/MyGame/MyGame.Build.cs — C#で書く(UBT自体がC#製のため)
using UnrealBuildTool;

public class MyGame : ModuleRules {
    public MyGame(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        // 公開依存: このModuleの公開ヘッダーが使う(利用者にも伝播)
        PublicDependencyModuleNames.AddRange(new string[] {
            "Core", "CoreUObject", "Engine", "InputCore"
        });
        // 非公開依存: 実装(.cpp)だけが使う
        PrivateDependencyModuleNames.AddRange(new string[] { "Slate", "SlateCore" });
    }
}
```

- **リンクエラーの主因**: 使いたい機能のModuleをここに書き忘れる(`undefined reference`/LNK2019 → [リンクエラーの読み方](/tools/build/link-errors.html)はそのまま通用)。エラーのシンボル名からModule名を特定して追記、が日常作業
- Public/Privateの区別は**ビルド時間**に効く(Private依存はヘッダー連鎖を利用者に波及させない → [第8部](/tools/build/build-speed.html))

## Target.cs(何を作るか)

```csharp
// MyGame.Target.cs — ゲーム本体
public class MyGameTarget : TargetRules {
    public MyGameTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Game;                       // Game / Editor / Server / Client / Program
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("MyGame");
    }
}
// MyGameEditor.Target.cs — エディタ版(エディタ用Moduleも含めてビルド)
```

- 「エディタあり/なし」「専用サーバー」を**別ターゲット**として吐き分ける——Unityの「エディタ/ビルド」の区別を、ビルド定義として明示した形

## UBTがやっている高速化(第8部の対策の実装)

- **Adaptive Unity Build**([Unity Build](/tools/build/build-speed.html)): 触っていないファイルはまとめ、編集中のファイルは分離して差分ビルドを保つ
- 共有PCH、モジュール単位のDLL化(エディタビルド)+ **Live Coding**(実行中のパッチ適用 → [DLLホットリロード](/runtime/cpp-internals/object-files-and-libraries.html)の製品化)
- UHT実行の依存管理(ヘッダー変更→生成→コンパイルの連鎖)

## なぜCMakeではないのか

1. UHT(コード生成)との統合が必須で、汎用ツールでは表現が苦しい
2. コンソール機を含む**全プラットフォームのツールチェーン差**を1つのC#コードベースで吸収する方針
3. Adaptive Unity Build・分散ビルド連携など、エンジン特化の最適化を自由に実装するため

——「ビルドの概念は一般と同じ、実装はエンジンが抱え込む」という構図。**概念(モジュール・依存・構成・PCH)を第8部で理解していれば、UBTは方言にすぎない**というのがこのページの結論です。

## Unity開発者が誤解しやすい点

1. 「ビルド設定はGUIでやるもの」— UEはBuild.cs/Target.csという**コード**が正。GUI(プロジェクト設定)とは役割が別
2. Moduleを切らずに全部1 Moduleに入れる——小規模なら正解(過剰分割は[asmdefの教訓](/languages/csharp/headers-vs-asmdef.html)と同じ)。ビルド時間・再利用の必要が出てから分割
3. 「Live Codingがあるからビルドは気にしなくていい」— 構造変更(ヘッダー・UPROPERTY)はフルパスが走る。ヘッダー衛生([第8部](/tools/build/build-speed.html))はUEでも主戦場

## 理解度チェック

1. Module / Build.cs / Target.cs の役割分担を言えますか。
2. 「未解決外部シンボル」がUEで出たとき、最初に確認すべき場所は?
3. Public/Private依存の区別は何に効きますか(2つ)。

## 演習

(UE環境がある場合)自プロジェクトのBuild.csを開き、(a) 各依存Moduleが「何のために」入っているか注記、(b) PublicからPrivateに降ろせる依存がないか検討してください。(ない場合)[samples/cmake_demo/](/tools/build/samples/cmake-demo.html) の構成をBuild.cs風に書き直し、概念の同一性を確認してください。

---

前: [リフレクションとUHT](/game/unreal/reflection-and-uht.html) | [カテゴリ目次](/game/unreal/) | 次: [UEのスマートポインタ](/game/unreal/smart-pointers.html)
