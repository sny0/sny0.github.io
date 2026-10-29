---
title: "DIP: 依存性逆転の原則 (Dependency Inversion Principle)"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "> 上位モジュール(方針)は下位モジュール(詳細)に依存すべきではない。両者は抽象に依存すべきである。 > 抽象は詳細に依存すべきではない。詳細が抽象に依存すべきである。 上位(方針): ゲームのルール・進行など「何をしたいか」を決めるコード"
---

# DIP: 依存性逆転の原則 (Dependency Inversion Principle)

## 原則の正確な意味

> 上位モジュール(方針)は下位モジュール(詳細)に依存すべきではない。両者は抽象に依存すべきである。
> 抽象は詳細に依存すべきではない。詳細が抽象に依存すべきである。

- **上位(方針)**: ゲームのルール・進行など「何をしたいか」を決めるコード
- **下位(詳細)**: ファイルI/O・オーディオAPI・描画・通信など「どうやるか」のコード

素朴に書くと上位が下位を呼ぶので、依存は「上位→下位」に流れます。DIPは間に抽象を挟み、**下位が(上位の定義した)抽象に依存する**ように向きを逆転させます。「逆転」の名はここから来ています。

なお「依存性注入(Dependency Injection, DI)」はDIPを実現する**手段の一つ**で、原則(DIP)と手段(DI)は別物です(→ [Service LocatorとDI](/game/patterns/service-locator-and-di.html))。

## よくある誤解

- **「DIP = とにかくインターフェースを挟む」** — 挟むだけでは不十分。**抽象を誰が定義するか(所有するか)**が本体です。抽象が下位側の都合で書かれていたら、依存先が変わっただけで逆転していません。
- **「DIP = DIコンテナを使う」** — コンテナは自動化ツールにすぎません。コンストラクタで手渡しするだけでもDIPは満たせます。
- **「全依存を逆転すべき」** — 標準ライブラリや安定したエンジンAPIへの依存を逆転するのは無駄です。逆転する価値があるのは**変わりやすい・テストで差し替えたい境界**だけ。

## 違反している小さなコード例(C++版)

```cpp
// C++20(問題例)— 上位(クエスト進行)が下位(具体的な保存とサウンド)に直接依存
#include "SteamCloudStorage.h"   // 詳細
#include "FmodAudioPlayer.h"     // 詳細

class QuestSystem {
public:
    void CompleteQuest(int questId) {
        progress_[questId] = true;
        SteamCloudStorage storage;                  // 上位が詳細を生成until所有
        storage.Upload("quest.dat", Serialize());
        FmodAudioPlayer::Play("quest_clear.wav");   // 上位が詳細を直接呼ぶ
    }
    // ... Serialize等は省略
private:
    std::map<int, bool> progress_;
};
```

## 何が問題になるか

- クエストの進行ルール(方針)をテストするのに、SteamとFMODの実環境が必要。
- 保存先をコンシューマ機のセーブAPIに変えると、**クエストのコードを修正**することになる。方針が詳細の都合で書き換わる=依存の方向が悪い(→ [依存の方向](/design/foundations/dependency.html))。
- `#include` 連鎖で、QuestSystemを使う全ファイルがSteam SDKのヘッダーに引きずられる(ビルド時間にも波及 → [第6部](/runtime/cpp-internals/translation-units-and-headers.html))。

## 改善後のコード例(C++版)

```cpp
// C++20 — 抽象を「上位側の言葉」で定義し、詳細に実装させる
#include <memory>
#include <string>

// 上位が所有する抽象。「クエストが必要とすること」だけを、上位の語彙で書く
class IQuestStorage {
public:
    virtual ~IQuestStorage() = default;
    virtual void SaveProgress(const std::string& data) = 0;
};
class IQuestNotifier {
public:
    virtual ~IQuestNotifier() = default;
    virtual void OnQuestCompleted(int questId) = 0;
};

class QuestSystem {
public:
    QuestSystem(std::unique_ptr<IQuestStorage> storage,
                std::unique_ptr<IQuestNotifier> notifier)
        : storage_(std::move(storage)), notifier_(std::move(notifier)) {}

    void CompleteQuest(int questId) {
        progress_[questId] = true;
        storage_->SaveProgress(Serialize());
        notifier_->OnQuestCompleted(questId);
    }
    // ... Serialize等は省略
private:
    std::unique_ptr<IQuestStorage> storage_;    // 所有はQuestSystem側(注入されたものを保持)
    std::unique_ptr<IQuestNotifier> notifier_;
    std::map<int, bool> progress_;
};

// 詳細側(別ファイル)が、上位の抽象に依存して実装する ← ここが「逆転」
class SteamQuestStorage : public IQuestStorage {
    void SaveProgress(const std::string& data) override { /* Steam SDK呼び出し */ }
};
```

**何が変わったか**: 依存の図式が `QuestSystem → Steam/FMOD` から `SteamQuestStorage → IQuestStorage ← QuestSystem` に変わった。方針(クエスト)はどの詳細も知らず、テストではメモリ実装を注入するだけ。抽象が**上位の語彙**(`SaveProgress`)で書かれていて、Steamの語彙(`Upload`)ではない点が「抽象の所有」の意味です。

## C#版(Unityでの例)

```csharp
// 上位: リザルト画面の進行(方針)
public interface IScoreRepository { void Save(int score); int LoadBest(); }

public class ResultFlow {
    private readonly IScoreRepository repo;
    public ResultFlow(IScoreRepository repo) { this.repo = repo; }  // コンストラクタ注入
    public bool IsNewRecord(int score) {
        bool isNew = score > repo.LoadBest();
        if (isNew) repo.Save(score);
        return isNew;
    }
}

// 詳細: PlayerPrefs実装(Unity依存はここに隔離)
public class PlayerPrefsScoreRepository : IScoreRepository {
    public void Save(int score) => PlayerPrefs.SetInt("best", score);
    public int LoadBest() => PlayerPrefs.GetInt("best", 0);
}
// テストでは Dictionary ベースのフェイクを注入 → Unityなしでテスト可能
```

MonoBehaviourはコンストラクタを持てないため、Unityでは `[SerializeField]` での参照注入、初期化メソッド注入、VContainer等のDIコンテナがDIの実装手段になります(→ [Service LocatorとDI](/game/patterns/service-locator-and-di.html))。

## ゲーム開発での例

- 入力(方針: 「ジャンプしたいか」/詳細: パッド・キーボード・リプレイ) → [ケーススタディ: プレイヤー入力](/design/case-studies/player-input.html)
- セーブ(方針: 何を保存するか/詳細: ファイル・クラウド・PlayerPrefs) → [ケーススタディ: セーブデータ](/design/case-studies/save-data.html)
- サウンド(方針: 「この出来事で音を鳴らす」/詳細: FMOD・Wwise・エンジン内蔵) → [ケーススタディ: サウンド管理](/design/case-studies/sound-manager.html)

## 原則同士の関係

- DIPは[依存の方向](/design/foundations/dependency.html)の原則を「抽象の所有」まで含めて定式化したもの。
- [OCP](/design/solid/ocp.html)の「新実装の追加で拡張」は、DIPで整えた抽象越しだから安全にできる。
- 注入する抽象は[ISP](/design/solid/isp.html)で小さく分けられているほど、テスト用フェイクが書きやすい。
- 5原則の中で最もアーキテクチャ寄り: モジュール分割・ビルド依存(→ [Module](/game/unreal/build-system-ubt.html)、[Assembly Definition](/languages/csharp/headers-vs-asmdef.html))に直結する。

## 適用しすぎた場合の弊害

- **全クラスがインターフェース+実装の2ファイル化**: 実装が1つしかない抽象だらけになり、「定義へ移動」が常にインターフェースに飛ぶ迷路になる。逆転は**境界**(変わりやすい・テストしたい箇所)にだけ。
- **配線コードの肥大**: 注入の組み立て(どこで誰を生成して渡すか)が複雑化する。DIコンテナを入れると今度はコンテナ設定が魔境になる。小規模なら`main`(またはブートストラップシーン)での手動組み立てで十分。
- **性能境界での間接化**: 毎フレーム数万回呼ぶ内側のループに仮想関数の抽象を挟むのはコストになりうる(→ [テンプレートか仮想関数か](/design/decisions/cpp-choices.html))。

## コードレビュー用チェックリスト

- [ ] ゲームルールのコードが、I/O・SDK・エンジンの具象型を直接 `#include` / `using` していないか?
- [ ] 抽象は上位の語彙で書かれているか?(詳細のAPI名の写しになっていないか)
- [ ] その抽象、テストで差し替える予定・実装が増える予定が本当にあるか?(なければ逆転不要)
- [ ] 依存の組み立て(生成と注入)は1か所にまとまっているか?
- [ ] `new` が方針コードの中に散らばっていないか?(生成も詳細への依存 → [Factory Method](/design/patterns/factory-method.html))

## 理解度確認問題

1. DIPの「逆転」とは、何がどちら向きからどちら向きになることですか。
2. DIPとDI(依存性注入)の関係を一文で言ってください。
3. 「インターフェースを挟んだのに逆転できていない」例はどんな状態ですか。
4. 逆転する価値がない依存の例を2つ挙げてください。

<details><summary>解答の要点</summary>

1. 「方針→詳細」だった依存が、抽象を挟むことで「詳細→抽象←方針」になる。詳細側の依存の矢印が上位(の定義した抽象)へ向く。
2. DIPは目指す構造(原則)、DIはそれを実現する具体的手段(コンストラクタ等で外から渡す)の一つ。
3. 抽象が詳細側の語彙・都合で定義されている(SteamStorageのメソッドをなぞっただけのISteamStorage等)。依存先の名前が変わっただけで、方針が詳細に引きずられる構造は残っている。
4. 標準ライブラリ(std::vector等)、安定して変わらないエンジン基盤API、数学ライブラリなど。変わらず差し替えもしないものへの抽象はコストのみ。
</details>

## 関連項目

- [依存関係と依存の方向](/design/foundations/dependency.html)
- [Service Locator と Dependency Injection](/game/patterns/service-locator-and-di.html)
- [判断ガイド: 依存性注入を使うべきか](/design/decisions/events-di-singleton.html)

## 演習

`BattleLogic` が `EffectPlayer`(ヒットエフェクト再生)と `RankingApi`(戦績送信)に直接依存しているとします。(a) 逆転すべきか両方について判断し、(b) 逆転する場合の抽象を「上位の語彙」で設計してください。ヒント: 片方は「テストで邪魔になるか」「差し替えが来るか」で答えが変わってよい問題です。

---

前: [ISP](/design/solid/isp.html) | [カテゴリ目次](/design/solid/) | 次: [演習](/design/solid/exercises.html)
