---
title: "SRP: 単一責任の原則 (Single Responsibility Principle)"
study:
  source: C++ Wiki
  status: published
  summary: "> モジュール(クラス・関数・ファイル)を変更する理由は、ただ1つであるべきである。 原文のニュアンスは「A module should be responsible to one, and only one, actor(モジュールはただ1つのアクター=変更を要求する人々に対して責任を負うべき)」"
  section: reference
  format: article
  domain: design
---

# SRP: 単一責任の原則 (Single Responsibility Principle)

## 原則の正確な意味

> モジュール(クラス・関数・ファイル)を変更する理由は、ただ1つであるべきである。

原文のニュアンスは「A module should be responsible to one, and only one, actor(モジュールはただ1つのアクター=変更を要求する人々に対して責任を負うべき)」。つまり**「1つのことをする」ではなく「1種類の人・都合のためだけに変更される」**が正確な意味です。

- 企画がバランス調整で変えたい部分
- UIデザイナーが見た目で変えたい部分
- インフラ担当が保存先で変えたい部分

これらが1つのクラスに同居していたら、SRP違反です。

## よくある誤解

- **「1クラス1メソッドにする」** — 違います。変更理由が1つなら、50メソッドあってもSRPは満たします(例: 数学ベクトルクラス)。
- **「小さいクラスほど良い」** — 分割しすぎて1つの変更理由が10クラスに散る(ショットガン手術)のは、逆方向のSRP違反です。
- **「責任=機能」** — 責任は機能の数ではなく、**変更を要求してくる都合の数**で数えます。

## 違反している小さなコード例(C++版)

```cpp
// C++20(問題例)
#include <fstream>
#include <string>
#include <vector>

class HighScoreTable {
public:
    void Add(int score) {                       // 都合1: ランキングの仕様(企画)
        scores_.push_back(score);
        std::sort(scores_.rbegin(), scores_.rend());
        if (scores_.size() > 10) scores_.resize(10);
    }
    std::string ToDisplayText() const {         // 都合2: 表示フォーマット(UI)
        std::string out;
        for (std::size_t i = 0; i < scores_.size(); ++i)
            out += std::to_string(i + 1) + "位: " + std::to_string(scores_[i]) + "\n";
        return out;
    }
    void SaveToFile(const std::string& path) const {  // 都合3: 永続化(保存形式)
        std::ofstream f(path);
        for (int s : scores_) f << s << "\n";
    }
private:
    std::vector<int> scores_;
};
```

「上位10件」の仕様変更も、「1位だけ金色表示」も、「JSON保存への変更」も、全部このクラスの変更になります。3つのアクター(企画・UI・保存)に責任を負っています。

## 改善後のコード例(C++版)

```cpp
// C++20
#include <algorithm>
#include <fstream>
#include <string>
#include <vector>

// 都合1のみ: ランキングのルール
class HighScoreTable {
public:
    void Add(int score) {
        scores_.push_back(score);
        std::sort(scores_.rbegin(), scores_.rend());
        if (scores_.size() > kMax) scores_.resize(kMax);
    }
    const std::vector<int>& Scores() const { return scores_; }
private:
    static constexpr std::size_t kMax = 10;
    std::vector<int> scores_;
};

// 都合2のみ: 表示(自由関数で十分。クラスにする必要はない)
std::string FormatHighScores(const std::vector<int>& scores) {
    std::string out;
    for (std::size_t i = 0; i < scores.size(); ++i)
        out += std::to_string(i + 1) + "位: " + std::to_string(scores[i]) + "\n";
    return out;
}

// 都合3のみ: 永続化
void SaveScores(const std::vector<int>& scores, const std::string& path) {
    std::ofstream f(path);
    for (int s : scores) f << s << "\n";
}
```

**何が変わったか**: 表示変更はFormatHighScoresだけ、保存形式変更はSaveScoresだけを触ればよく、ランキングのルール(中核)はどちらの変更でも無傷。クラスを増やさず自由関数で分けた点にも注目してください(SRPの単位はクラスとは限らない)。

## C#版(Unityでの例)

```csharp
// 問題例: MonoBehaviourにすべてが同居(Unityで最頻出のSRP違反)
public class Player : MonoBehaviour {
    void Update() {
        // 入力読み(入力の都合)+ 移動(操作感の都合)+ HP処理(戦闘の都合)
        // + UI更新(見た目の都合)+ PlayerPrefs保存(保存の都合)が1つのUpdateに…
    }
}

// 改善例: 変更理由ごとにコンポーネント分割
public class PlayerMovement : MonoBehaviour {   // 操作感の都合のみ
    [SerializeField] private float speed = 5f;
    public void Move(Vector2 dir) => transform.Translate(dir * (speed * Time.deltaTime));
}

public class PlayerHealth : MonoBehaviour {     // 戦闘の都合のみ
    public event System.Action<int, int> HpChanged;  // UIはこれを購読(UIの都合を切り離す)
    private int hp = 100;
    public void TakeDamage(int amount) { hp -= amount; HpChanged?.Invoke(hp, 100); }
}
```

Unityの Component 分割は SRP を実践する自然な受け皿です。「1 MonoBehaviour = 1変更理由」を目安にすると神クラス化を防げます。

## ゲーム開発での例

- ダメージ計算式(企画の都合)と被弾演出(演出の都合)の分離 → [ケーススタディ: ダメージ計算](/design/case-studies/damage-calculation.html)
- セーブの「何を・どの形式で・どこへ」の3分割 → [責務と関心の分離](/design/foundations/responsibility-and-separation.html)
- レベルデザイナーが触るデータ(ScriptableObject/DataTable)とプログラマが触るロジックの分離

## 原則同士の関係

- SRPは**分け方**の原則。分けた後の**繋ぎ方**を整えるのが [DIP](/design/solid/dip.html)、拡張の受け口を作るのが [OCP](/design/solid/ocp.html)。
- インターフェース版のSRPが [ISP](/design/solid/isp.html)(クライアントの種類ごとにインターフェースを分ける)。
- 凝集度(→ [凝集度と結合度(比較ページ)](/design/foundations/cohesion-and-coupling.html))を「変更理由」という判定基準で運用可能にしたものがSRP、と捉えると整理しやすいです。

## 適用しすぎた場合の弊害

- 1つの仕様変更で10ファイルを直す「ショットガン手術」化。**同じ理由で一緒に変わるものは一緒に置く**のもSRPの要求です。
- クラス爆発: `PlayerJumpInputChecker` のような極小クラスの群れは、追跡コストが凝集の利益を上回ります。
- 変更理由の予想が外れると、間違った軸で分割された構造だけが残ります。**実際に変更が来てから分割する**のが安全です(→ [YAGNI](/design/foundations/yagni-kiss-dry.html))。

## コードレビュー用チェックリスト

- [ ] このクラス/関数の変更を要求してくる「人・都合」を2つ以上思いつくか?
- [ ] 直近3回のこのファイルの変更は、同じ種類の理由だったか?(履歴が違う理由なら分割候補)
- [ ] UI・保存・通信・ログの都合が、ゲームルールのコードに混ざっていないか?
- [ ] 逆に、1つの仕様変更で毎回複数ファイルを直していないか?(分割しすぎのサイン)
- [ ] 分割案は「クラス化」以外(自由関数、イベント購読)も検討したか?

## 理解度確認問題

1. SRPの「責任」を数える単位は何ですか。「機能の数」と答えた場合、何が誤りですか。
2. 上の `HighScoreTable` 問題例で、3つのアクターをそれぞれ挙げてください。
3. SRPを適用**しすぎた**ときに起きる問題の名前と症状を説明してください。
4. 「数学ベクトルクラスは30メソッドあるがSRP違反ではない」— この主張を変更理由の観点で正当化してください。

<details><summary>解答の要点</summary>

1. 変更を要求するアクター(人・都合)の数。機能の数だと「1クラス1メソッド」という誤った結論に至る。
2. 企画(ランキング仕様)、UI(表示形式)、保存担当(永続化形式)。
3. ショットガン手術。1つの仕様変更が多数のファイルに散り、修正漏れが起きる。
4. ベクトルの全メソッドは「数学の定義」という単一の理由でしか変わらない(そして数学は変わらない)ため、変更理由は1つ。
</details>

## 関連項目

- [責務と関心の分離](/design/foundations/responsibility-and-separation.html) / [凝集度と結合度](/design/foundations/cohesion-and-coupling.html)
- [判断ガイド: クラスを分けるべきか](/design/decisions/split-class.html)

## 演習

自分のプロジェクトの一番大きなクラスについて、直近の変更履歴(覚えている範囲でよい)を「どのアクターの都合だったか」で分類してください。2種類以上あれば、最小の分割案(1責務だけ外に出す)を書いてください。

---

関連項目：[学習ガイド](/design/solid/) / [OCP: 開放閉鎖の原則](/design/solid/ocp.html)
