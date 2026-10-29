---
title: "凝集度と結合度(比較ページ)"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "凝集度(cohesion) = 1つのモジュール(クラス・関数・ファイル)の中身がどれだけ関連し合っているか。高いほど良い。 結合度(coupling) = モジュール同士がどれだけ互いを知っているか。低い(弱い)ほど良い。"
---

# 凝集度と結合度(比較ページ)

## 一言で言うと

- **凝集度(cohesion)** = 1つのモジュール(クラス・関数・ファイル)の**中身**がどれだけ関連し合っているか。**高いほど良い**。
- **結合度(coupling)** = モジュール**同士**がどれだけ互いを知っているか。**低い(弱い)ほど良い**。

「中は濃く、外とは薄く」。2つはセットで覚えます。

## 混同しやすいので先に比較

| | 凝集度 | 結合度 |
|---|---|---|
| 見る場所 | 1つのモジュールの**内側** | モジュールの**間** |
| 良い状態 | 高い(中身が1つの目的に集まっている) | 低い(相手の詳細を知らない) |
| 悪い例 | 何でも入っている GameManager | 相手のメンバ変数を直接いじる |
| 悪化すると | どこを直すか分からなくなる | 直すと連鎖的に壊れる |
| 関連する原則 | [SRP](/design/solid/srp.html) | [DIP](/design/solid/dip.html)、[ISP](/design/solid/isp.html) |

凝集度が低いクラスは大抵、結合度も高くなります(雑多な仕事を抱えるほど多くの相手と繋がるため)。ただし別の概念です。「1つの目的に集中しているが、相手の内部を直接いじる」クラスは、凝集度は高いが結合度も高い、という状態になります。

## 解決したい問題

「どこを直せばいいか分からない」(低凝集)と「直したら別の場所が壊れた」(高結合)は、変更コストを増やす二大原因です。

## 問題のある実装(低凝集・高結合の典型)

```cpp
// C++20(問題例)
class GameManager {
public:
    void Update() {
        // 入力もスコアもUIも敵管理も全部ここ(低凝集)
        if (input.IsPressed(Key::Space)) player.velocity.y = 10.0f; // playerの内部を直接操作(高結合)
        score += 1;
        ui.scoreLabel.text = std::to_string(score);  // uiの内部構造まで知っている(高結合)
        for (auto& e : enemies) {
            e.x -= 1.0f;                             // 敵の移動ロジックがEnemyの外にある
            if (e.x < 0) e.hp = 0;
        }
    }
    // ... フィールド定義は省略
};
```

## 何が問題になるか

- ジャンプの仕様変更・スコア表示の変更・敵の移動の変更、**すべてがこのクラスの変更**になる(低凝集)。
- `player.velocity` の型や `ui.scoreLabel` の構造を変えると GameManager が壊れる(高結合)。
- Enemy の移動を Enemy 単体でテストできない。移動ロジックが GameManager に漏れているため。

## 改善した実装

```cpp
// C++20(骨格。各クラスの詳細は省略)
class Player {
public:
    void Jump() { velocity_y_ = jumpSpeed_; }   // 内部の操作は自分で持つ(凝集)
private:
    float velocity_y_ = 0.0f;
    float jumpSpeed_ = 10.0f;
};

class Enemy {
public:
    void Update() { x_ -= speed_; if (x_ < 0) hp_ = 0; }  // 移動は自分の仕事
private:
    float x_ = 0, speed_ = 1.0f;
    int hp_ = 10;
};

class ScoreBoard {
public:
    void Add(int points) { score_ += points; }
    int Value() const { return score_; }
private:
    int score_ = 0;
};

// GameManagerは「進行の調整」だけをする(それがこのクラスの唯一の関心)
class GameManager {
public:
    void Update() {
        if (input_.IsPressed(Key::Space)) player_.Jump();  // 操作の意図だけ伝える(低結合)
        for (auto& e : enemies_) e.Update();
        score_.Add(1);
    }
    // ... フィールド定義は省略
};
```

## 何が改善されたか

- 「ジャンプの変更は Player」「移動の変更は Enemy」と、変更の行き先が明確になった(凝集度が上がった)。
- Player の内部表現(velocity の持ち方)を変えても GameManager は無傷(結合度が下がった)。
- Enemy::Update を単体でテストできる。

## 代わりに何を失ったか

- クラス数が増え、処理が1画面で読めなくなった。
- 「全部が1か所にある安心感」はなくなる。小さなプロトタイプではこの安心感の方が価値があることもあります。

## 結合の強さのおおまかな段階

弱い(良い)→ 強い(悪い)の順:

1. **メッセージ/イベント経由** — 相手が誰かも知らない(→ [Event Queue](/game/patterns/event-queue-and-pubsub.html))
2. **抽象(インターフェース)経由** — 相手の役割だけ知る(→ [DIP](/design/solid/dip.html))
3. **具象型のpublic関数呼び出し** — 相手のクラスを知る(普通。悪ではない)
4. **相手のデータ構造への直接アクセス** — `player.velocity.y = 10` のような操作
5. **グローバル変数・シングルトン共有** — 誰と誰が繋がっているか追跡不能になりやすい(→ [Singleton](/design/patterns/singleton.html))

すべてを1にする必要はありません。**変更が頻繁な境界ほど弱い結合にする**のが実務的な使い方です。

## ゲーム開発での例

- UI とゲームロジック: 高頻度で変わる境界なので、イベント経由(弱い結合)が定石(→ [ケーススタディ: UI通知](/design/case-studies/ui-notification.html))。
- 物理と描画: エンジン内部で密に協調するので、具象呼び出し(強め)で構わない。

## Unity/C# との対応

- `GetComponent<T>()` で他コンポーネントの具象型を取るのは段階3。`public` フィールドを直接書き換えるのは段階4。
- `event` / `UnityEvent` は段階1〜2に相当。
- どこからでも `GameManager.Instance` を触るのは段階5で、Unityプロジェクトが崩壊する最頻出パターンです。

## Unreal Engine との対応

- Delegate / Interface 経由の通知が弱い結合、他Actorの `FindComponentByClass` → メンバ直接操作が強い結合に対応します。

## よくある誤解

- 「結合度ゼロを目指す」— 不可能ですし、目指すと全部イベント経由になって追跡不能になります。結合は**あるべき場所に適切な強さで**。
- 「凝集度が高い = クラスが小さい」— 大きさではなく、中身が1つの変更理由に集まっているかです。

## 使う場面 / 使わない場面

- **この観点で見直す場面**: 「1つの変更で何ファイルも直している」「あのクラスを触ると必ず何かが壊れる」と感じたとき。
- **気にしすぎない場面**: 書き捨てコード、既に安定して変更が来ない部分。動いているコードを凝集度のためだけに分解し直すのは、変更予定がなければ割に合いません。

## 関連項目

- [責務と関心の分離](/design/foundations/responsibility-and-separation.html)
- [依存関係と依存の方向](/design/foundations/dependency.html)
- [SRP](/design/solid/srp.html) / [DIP](/design/solid/dip.html)

## 理解度チェック

1. 凝集度と結合度は、それぞれ「どこ」を見る指標ですか。
2. 「凝集度は高いが結合度も高い」クラスの例を挙げられますか。
3. 結合を弱くする手段を、弱い順に3つ挙げてください。

## 演習

自分のプロジェクトで「一番よく触るクラス」を1つ選び、(a) そのクラスの変更理由を列挙して凝集度を評価、(b) そのクラスが直接触っている他クラスのメンバを列挙して結合度を評価してください。

---

前: [責務と関心の分離](/design/foundations/responsibility-and-separation.html) | [カテゴリ目次](/design/foundations/) | 次: [依存関係と依存の方向](/design/foundations/dependency.html)
