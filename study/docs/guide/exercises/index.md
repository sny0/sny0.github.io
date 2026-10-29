---
title: "総合演習"
study:
  source: "C++ Wiki"
  kind: "索引"
  status: "既存原稿"
  summary: "各カテゴリの演習(下のリンク一覧)を終えた人向けの、分野横断の総合問題です。解答は answers.md にあります。 あるプロジェクトのコードレビューで、次のクラスに出会いました。"
---

# 総合演習

各カテゴリの演習(下のリンク一覧)を終えた人向けの、**分野横断の総合問題**です。解答は [answers.md](/guide/exercises/answers.html) にあります。

## カテゴリ別演習へのリンク

| カテゴリ | 演習 |
|---|---|
| 第1部 設計の基礎 | [exercises](/design/foundations/exercises.html) |
| 第2部 SOLID | [exercises](/design/solid/exercises.html) |
| 第3部 GoFパターン | [exercises](/design/patterns/exercises.html) |
| 第4部 ゲームパターン | [exercises](/game/patterns/exercises.html) |
| 第5部 C++言語 | [exercises](/languages/cpp/exercises.html) |
| 第6部 C++内部 | [exercises](/runtime/cpp-internals/exercises.html) |
| 第7部 メモリと実行時 | [exercises](/runtime/memory/exercises.html) |
| 第8部 ビルド | [exercises](/tools/build/exercises.html) |
| 第9部 Unity/C# | [exercises](/languages/csharp/exercises.html) |
| 第10部 UE | [exercises](/game/unreal/exercises.html) |
| 第11部 ケーススタディ | [exercises](/design/case-studies/exercises.html) |
| 第12部 判断ガイド | [exercises](/design/decisions/exercises.html) |

---

## 総合問題(全分野横断)

### 総合1. 設計レビュー(読解+診断)

あるプロジェクトのコードレビューで、次のクラスに出会いました。

```cpp
// C++20
class GameManager {
public:
    static GameManager* instance;
    std::vector<Enemy*> enemies;            // newした敵を格納
    void Update(float dt) {
        for (auto* e : enemies) {
            e->hp -= poisonActive ? 1 : 0;
            if (e->hp <= 0) { enemies.erase(std::find(enemies.begin(), enemies.end(), e));
                              scoreLabel->SetText(std::to_string(++score)); }
        }
        if (Input::GetKey(Key::S)) SaveToFile();
    }
    void SaveToFile();                      // 構造体をfwriteで直書き
    bool poisonActive = false;
    int score = 0;
    TextLabel* scoreLabel;
};
```

**問**: 問題点を「設計(責務・依存)」「C++の正しさ(所有権・イテレータ・UB)」「保守(セーブ互換)」の3観点で列挙し、優先度順の改善計画(3ステップ)を書いてください。

### 総合2. 仕組みの説明(C++内部)

「`std::vector<std::unique_ptr<Enemy>> enemies;` に `push_back(std::make_unique<Boss>())` する」— この1行について、次を説明してください。

1. コンパイル時に何が起きるか(テンプレートの実体化はどの型に対して起きるか)
2. 実行時のメモリはどこに何が置かれるか(スタック/ヒープ、vectorの中身は何か)
3. `enemies.clear()` で何がどの順で起きるか(unique_ptr・仮想デストラクタとの関係)

### 総合3. パターン選定(設計判断)

「ローグライトの装備品: 拾う・装備する・パッシブ効果(攻撃+X%等)が重複して乗る・種類は運用で毎週追加」という要件に対し、使う道具を**第3部・第4部から3つ以内**選び、それぞれ「何の問題に対して」使うのかを明記して全体構成図を書いてください。「使わないことにした候補」も1つ挙げ、理由を書いてください。

### 総合4. クロスエンジン設計(Unity→UE)

Unityで実装済みの「敵死亡→イベント発行→実績/クエスト/UIが購読」システム(C# event+ScriptableObjectチャネル)をUEに移植します。対応する仕組みの選定(Delegate種別、Subsystem等)と、**移植で設計変更が必要になる点**(GC・リフレクション・例外方針の違いから来るもの)を2つ挙げてください。

### 総合5. バグ調査総合(症状→原因→ツール)

リリースビルドのみで発生する次の症状の調査計画を立ててください:「長時間プレイ後、特定の敵を倒した瞬間に、まれに無関係なUIのテキストが化けてクラッシュする」。

- 疑うべきバグの種類(候補2つ以上、優先度つき)
- それぞれの検証手段(ツール・ビルド設定)
- 恒久対策の方向性

### 総合6. ミニプロジェクト(実装)

samples/ の部品を組み合わせて「ウェーブサバイバル」の骨格を完成させてください([第11部演習 問7](/design/case-studies/exercises.html)と共通)。追加要件:

- 固定タイムステップ(<a href="/study/samples/cpp/game_loop.cpp">samples/game_loop.cpp</a>)
- 敵はFSM(<a href="/study/samples/cpp/fsm_guard.cpp">samples/fsm_guard.cpp</a>)+Type Object(<a href="/study/samples/cpp/type_object.cpp">samples/type_object.cpp</a>)
- 弾はObject Pool(<a href="/study/samples/cpp/object_pool.cpp">samples/object_pool.cpp</a>)
- 通知は3分類(直呼び/バス/キュー)(<a href="/study/samples/cpp/event_bus.cpp">samples/event_bus.cpp</a>、<a href="/study/samples/cpp/event_queue.cpp">samples/event_queue.cpp</a>)
- 全体をRule of Zero・所有の木・const correctnessでレビューして提出

---

[目次に戻る](/guide/cpp-index.html) | [解答へ](/guide/exercises/answers.html)
