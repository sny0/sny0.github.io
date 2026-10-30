---
title: プレイヤー入力の設計
study:
  source: C++ Wiki
  status: published
  summary: "この段階では正しい。 ジャム・プロトタイプならこれで出荷までいけます。 パッド対応: 全if文に || Input::GetButton(...) が増殖 キーコンフィグ: ハードコードされたKey::Aを差し替える場所がない"
  section: reference
  format: article
  domain: design
---

<div id="ケーススタディ-01-プレイヤー入力" class="study-legacy-anchor" aria-hidden="true"></div>

# プレイヤー入力の設計

## 素朴な実装

```cpp
// C++20(疑似エンジンAPI)
void Player::Update(float dt) {
    if (Input::GetKey(Key::A)) x_ -= speed_ * dt;
    if (Input::GetKey(Key::D)) x_ += speed_ * dt;
    if (Input::GetKeyDown(Key::Space)) Jump();
    if (Input::GetKeyDown(Key::J)) Attack();
}
```

**この段階では正しい。** ジャム・プロトタイプならこれで出荷までいけます。

## 機能追加で破綻する過程

1. **パッド対応**: 全if文に `|| Input::GetButton(...)` が増殖
2. **キーコンフィグ**: ハードコードされたKey::Aを差し替える場所がない
3. **UI操作との衝突**: メニュー中もジャンプしてしまう → `if (!menuOpen)` が全行に
4. **リプレイ/チュートリアル自動操作**: 「本物のキーボード」以外から操作する経路がない
5. **長押し・同時押し・先行入力**: 判定ロジックが各所に重複し、操作感の調整が全ファイル横断作業に

問題の根: **「物理入力の読み取り」「意図への変換」「意図の実行」が1か所に癒着**している([関心の分離](/design/foundations/responsibility-and-separation.html))。

## 案A: 意図の構造体+入力ソース抽象(コンポジション・定石)

[Command Bufferと入力処理](/game/patterns/command-buffer-and-input.html)で詳述した形。

```cpp
struct FrameInput { float moveX = 0; bool jump = false; bool attack = false; };

class IInputSource {                     // 差し替え可能な供給源(DIP)
public:
    virtual ~IInputSource() = default;
    virtual FrameInput Poll() = 0;
};
class KeyboardPadSource : public IInputSource { /* バインド表を見て変換 */ };
class ReplaySource : public IInputSource { /* 記録から供給 */ };

void Player::Update(const FrameInput& in, float dt) {   // Playerは「意図」だけ見る
    x_ += in.moveX * speed_ * dt;
    if (in.jump) Jump();
}
```

- 利点: リバインド=バインド表のデータ変更。リプレイ・AI操作・テストが差し替えで可能。UI衝突は「UIが入力を消費したら空のFrameInputを渡す」で一元処理([Chain of Responsibility](/design/patterns/chain-of-responsibility.html)的な優先度)
- 欠点: 間接層1枚。ボタン→意図の対応表管理が必要

## 案B: Commandオブジェクト方式

[Command](/design/patterns/command.html)のInputMapper(キー→ICommandの表)。

- 利点: 操作の追加が新Command1つ。Undo・マクロ・履歴に自然に拡張
- 欠点: アクションゲームの「毎フレームの連続値(移動軸)」はCommandの粒度に合いにくい(移動だけ別扱いになりがち)。**離散的な操作(ターン制・エディタ)向き**

## 案C: 継承による案(比較のため)

`Player` を `KeyboardPlayer` / `PadPlayer` / `ReplayPlayer` に派生させる——**悪手**。操作デバイスはプレイヤーの is-a ではなく(LSP的にも歪む)、デバイス×キャラ種の組み合わせ爆発を起こします([継承vsコンポジション](/design/foundations/inheritance-delegation-composition.html)の反面教材)。

## 案D: パターンを使わない簡潔案

素朴な実装+**関数1枚だけ**挟む:

```cpp
FrameInput ReadInput() {    // 読み取りをこの1関数に集約(構造体は導入する)
    FrameInput in;
    in.moveX = (Input::GetKey(Key::D) ? 1.f : 0.f) - (Input::GetKey(Key::A) ? 1.f : 0.f);
    in.jump = Input::GetKeyDown(Key::Space);
    return in;
}
```

インターフェースなし・クラスなし。それでも「読み取りの一元化」と「Playerが意図を受け取る」構造は手に入る——**小規模の最適解はここ**です。

## 規模別の判断

| 規模 | 推奨 | 理由 |
|---|---|---|
| 小(ジャム・プロト) | 素朴な実装 or 案D | リバインドもリプレイも要件にない |
| 中(リバインド・パッド対応あり) | 案D → 案A(要件が来た時点で昇格) | 案Dからの移行は安い(FrameInputが既にある) |
| 大(リプレイ・ネット・自動テスト) | 案A(+離散操作は案B併用) | 差し替え可能性が本領を発揮 |
| Unity / UE | 新Input System / Enhanced Input | **エンジンが案A+Bを製品化済み**。自作より学習が先 |

## この題材の教訓

- 「入力の抽象化」の価値は要件(リバインド・リプレイ・多デバイス)に比例する。要件なしの抽象化は[YAGNI](/design/foundations/yagni-kiss-dry.html)違反
- ただし**FrameInput(意図の構造体)だけは早期導入しても損しない**——後の全案への移行路になる、安い保険

---

関連項目：[学習ガイド](/design/case-studies/) / [武器切り替え](/design/case-studies/weapon-switching.html)
