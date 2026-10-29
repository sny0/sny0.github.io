---
title: "責務と関心の分離"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "責務(responsibility)とは「そのコードが引き受けている仕事と、その仕事が変更される理由」のこと。関心の分離(separation of concerns)とは、異なる理由で変更されるコードを別の場所に置くことです。"
---

# 責務と関心の分離

## 一言で言うと

**責務(responsibility)**とは「そのコードが引き受けている仕事と、その仕事が変更される理由」のこと。**関心の分離(separation of concerns)**とは、異なる理由で変更されるコードを別の場所に置くことです。

## 解決したい問題

1つのクラスや関数が複数の仕事を抱えると、

- ある仕事の変更が別の仕事を壊す
- どの仕事のコードがどこにあるか分からなくなる
- 一部だけテスト・再利用したくてもできない

という問題が起きます。「責務」はこれを防ぐための**分割の単位**を与える概念です。

## 最も単純な例

「セーブデータを保存する」という仕事は、実は複数の関心でできています。

1. **何を**保存するか(ゲームの状態をデータにする)
2. **どんな形式で**保存するか(JSON? バイナリ?)
3. **どこに**保存するか(ファイル? クラウド?)

## 問題のある実装

```cpp
// C++20(問題例)
#include <fstream>
#include <string>

class SaveManager {
public:
    void Save(const Player& player) {
        // 関心1: 何を保存するか
        std::string data = "hp=" + std::to_string(player.hp) + "\n"
                         + "gold=" + std::to_string(player.gold) + "\n";
        // 関心2: 形式(独自テキスト形式)も 関心3: 保存先(ファイル)もここに直書き
        std::ofstream file("save.txt");
        file << data;
    }
};
```

## その実装で何が問題になるか

変更シナリオを当ててみると弱点が見えます。

- 「保存項目を増やしたい」→ この関数を触る
- 「JSONに変えたい」→ この関数を触る
- 「Steamクラウドにも保存したい」→ この関数を触る
- 「保存形式のテストだけしたい」→ ファイルI/Oと不可分なので単体でテストできない

**3種類の変更理由が1か所に集まっている**。これが「責務が多すぎる」状態の正体です。

## 改善した実装

関心ごとに分けます。

```cpp
// C++20(骨格。SaveData の中身と JSON 変換の詳細は省略)
#include <string>

struct SaveData {                 // 関心1: 何を保存するか(ただのデータ)
    int hp = 0;
    int gold = 0;
};

class ISaveSerializer {           // 関心2: どんな形式か
public:
    virtual ~ISaveSerializer() = default;
    virtual std::string Serialize(const SaveData& data) const = 0;
};

class ISaveStorage {              // 関心3: どこに保存するか
public:
    virtual ~ISaveStorage() = default;
    virtual void Write(const std::string& bytes) = 0;
};

class SaveService {               // 3つを組み合わせるだけの薄い層
public:
    SaveService(ISaveSerializer& s, ISaveStorage& st) : serializer_(s), storage_(st) {}
    void Save(const SaveData& data) { storage_.Write(serializer_.Serialize(data)); }
private:
    ISaveSerializer& serializer_;  // 参照: 所有せず借りるだけ(寿命は呼び出し側が管理)
    ISaveStorage& storage_;
};
```

## 何が改善されたか

- JSON化・クラウド対応・項目追加が、**それぞれ別のクラスの変更**になった。
- テスト用に「メモリに書くだけの ISaveStorage」を渡せば、ファイルなしでテストできる。

## 代わりに何を失ったか

- クラスが1個から4個に増えた。ファイルも増える。
- 「セーブって結局どう動くの?」を知るには複数ファイルを追う必要がある。
- **保存先も形式も今後絶対に変えない**なら、最初の実装で十分でした。分割は変更の見込みへの投資です。

## 責務の見つけ方

「このクラスは何をするか」ではなく、**「このクラスは誰のどんな都合で変更されるか」**を問うのがコツです。これは [SRP(単一責任の原則)](/design/solid/srp.html) でさらに深掘りします。

- 変更理由を列挙する(企画の都合/描画の都合/保存形式の都合/…)
- 同じ理由で変わるものを集め、違う理由で変わるものを離す

## ゲーム開発での例

| 混ざりがちな関心 | 分けた後 |
|---|---|
| 敵の思考と移動と描画 | AI(思考) / Movement / 描画コンポーネント |
| 入力の読み取りとキャラ操作 | 入力層(→ [ケーススタディ: プレイヤー入力](/design/case-studies/player-input.html)) / 操作ロジック |
| ダメージ計算とUI表示 | 計算(純粋関数) / 表示(購読側) |

## Unity/C# との対応

Unity の Component システム自体が関心の分離の仕組みです。1つの GameObject に `Health` / `Movement` / `EnemyAI` を分けて付けるのは、まさにこのページの内容です。逆に1つの MonoBehaviour に全部書くと、上の問題例と同じことが起きます。

## Unreal Engine との対応

UE では ActorComponent への分割、また「データ(DataAsset)とロジックの分離」が対応します(→ [第10部](/game/unreal/gameplay-framework.html))。

## よくある誤解

- 「1クラス1メソッドにすべき」ではありません。責務は**変更理由の単位**であって、コード量の単位ではありません。変更理由が1つなら、大きいクラスでも責務は1つです。
- 「分ければ分けるほど良い」でもありません。過剰な分割は追いにくさという別のコストを生みます(→ [早すぎる抽象化](/design/foundations/yagni-kiss-dry.html))。

## 使う場面 / 使わない場面

- **使う場面**: 変更理由が複数あると分かっているコード。テストしたいロジックがI/Oと絡んでいるとき。
- **使わない場面**: 変更理由が1つしかない小さなコード。プロトタイプ。分離のための抽象(interface)が1実装しか持たない見込みのとき(→ [判断ガイド: インターフェースを作るべきか](/design/decisions/create-interface.html))。

## 関連項目

- [SRP: 単一責任の原則](/design/solid/srp.html) — このページの内容を原則として定式化したもの
- [凝集度と結合度](/design/foundations/cohesion-and-coupling.html)
- [ケーススタディ: セーブデータ](/design/case-studies/save-data.html)

## 理解度チェック

1. 「責務」を「仕事の数」ではなく何の数で数えるべきですか。
2. 問題例の SaveManager に混ざっていた3つの関心を言えますか。
3. 分離しない方がよいのはどんなときですか。

## 演習

`敵を倒したらスコア加算・ドロップ生成・SE再生・実績チェックを行う OnEnemyKilled 関数` がある想定で、変更理由ごとにグループ分けし、どんな分割(またはどんな通知の仕組み)にするか案を書いてください。模範解答は[第1部演習](/design/foundations/exercises.html)の類題にあります。

---

前: [設計とは何を決める行為なのか](/design/foundations/what-is-design.html) | [カテゴリ目次](/design/foundations/) | 次: [凝集度と結合度](/design/foundations/cohesion-and-coupling.html)
