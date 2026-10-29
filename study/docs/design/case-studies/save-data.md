---
title: "ケーススタディ 06: セーブデータ"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "項目追加でセーブ互換が壊れる: int level を足した瞬間、旧セーブが読めない(サイズもオフセットもズレる)。アップデートで全員のセーブが消えるのは炎上事故 構造体直書きはパディング・エンディアン・型サイズが実装依存——コンパイラ更新や機種違いで読めなくなる"
---

# ケーススタディ 06: セーブデータ

## 素朴な実装

```cpp
// C++20 — 構造体を丸ごとバイナリ書き出し
struct SaveData { int hp; int gold; float x, y; int stage; };

void Save(const SaveData& d) {
    std::ofstream f("save.bin", std::ios::binary);
    f.write(reinterpret_cast<const char*>(&d), sizeof(d));   // memcpy的な直書き
}
```

## 機能追加で破綻する過程

1. **項目追加でセーブ互換が壊れる**: `int level` を足した瞬間、旧セーブが読めない(サイズもオフセットもズレる)。**アップデートで全員のセーブが消える**のは炎上事故
2. 構造体直書きは[パディング・エンディアン・型サイズ](/runtime/cpp-internals/memory-layout.html)が実装依存——コンパイラ更新や機種違いで読めなくなる
3. 「何を保存するか」がゲーム中に散らばる: Player・Inventory・QuestSystemがそれぞれ勝手にファイルを書き始め、**タイミング不整合**(HPは保存されたのに所持金は保存前にクラッシュ)
4. 「クラウド保存も」「スロット3つ」「オートセーブ」→ 保存先・タイミングの要求が保存形式のコードに絡みつく

## 設計の核: 3つの関心を分ける([責務のページ](/design/foundations/responsibility-and-separation.html)の実戦版)

```
[1. 収集] ゲーム状態 → SaveData(スナップショット構造体)     … Mementoの発想
[2. 変換] SaveData → バイト列(JSON / バイナリ+バージョン)   … 形式の関心
[3. 保存] バイト列 → ファイル / クラウド / スロット管理        … 保存先の関心
```

## 案A: Memento+シリアライザ分離(定石)

```cpp
// [1] 各システムが自分のスナップショットを提供([Memento](../03_design_patterns/memento.md))
struct PlayerSave { int hp = 100; float x = 0, y = 0; };
struct InventorySave { std::vector<int> itemIds; };
struct SaveData {
    int version = 3;                  // ★バージョン番号は最初から入れる
    PlayerSave player;
    InventorySave inventory;
};
// Player::CreateSave() / Player::Restore(const PlayerSave&) を各システムが実装

// [2] 変換(名前付きフォーマット: JSONなど。フィールド欠落に強い)
std::string ToJson(const SaveData&);
SaveData FromJson(std::string_view, /*out*/ bool& migrated);   // 旧版は既定値+移行処理

// [3] 保存先の抽象([DIP](../02_solid/dip.md)) — テスト・クラウド対応の差し替え点
class ISaveStorage { public: virtual ~ISaveStorage() = default;
                     virtual bool Write(std::string_view bytes) = 0;
                     virtual std::optional<std::string> Read() = 0; };
```

- **バージョン+名前付きフォーマット**が互換性の要: 項目追加は「旧データでは既定値」で自動吸収、大変更はversionで移行コードへ分岐
- 利点: 3つの関心が独立に変更可能。保存内容のテストがファイルなしで可能
- 欠点: スナップショット構造体の維持(ゲーム状態と二重管理)——だがこの「二重化」こそが**ゲーム内部の変更とセーブ互換を切り離す壁**(内部リファクタリングがセーブを壊さない)

## 案B: リフレクション/自動シリアライズ案

C#(JsonUtility等)やUE(UPROPERTYの自動シリアライズ → [第10部](/game/unreal/reflection-and-uht.html))ではゲームオブジェクトを直接直列化できる。

- 利点: スナップショット構造体が不要(二重管理消滅)
- 欠点: **内部構造の変更が即セーブ互換の破壊**になる(壁がない)。「エディタでの変数リネームでセーブが壊れた」はUnity/UEの定番事故。大規模・長期運用ほど案Aの「壁」が効く

## 案C: パターンを使わない簡潔案

PlayerPrefs的なキーバリュー保存(`SetInt("hp", hp)`)。項目が10個以下の小規模ならこれが最速で、キー名がそのまま互換性を担保します。構造が育ったら案Aへ。

## 破綻ポイントへの個別回答

- **タイミング不整合** → 整合した状態を収集してスナップショットを作り、保存を1つの窓口に集約する([Facade](/design/patterns/facade.html))。一時ファイルを書き終えてから保存先を置換すると、書きかけの内容を本ファイルとして見せるのを避けやすい。ただし**名前の置換の原子性と、電源断後の永続性は別**。対象OS/API・ファイルシステムの置換条件、各書込み・同期・置換の失敗、バックアップと復旧を保存層で扱う。C++ストリームのflush/closeだけで媒体への永続化を保証したと考えない([Windowsのバッファ同期](https://learn.microsoft.com/en-us/windows/win32/fileio/flushing-system-buffered-i-o-data-to-disk)、[Linuxのrename](https://man7.org/linux/man-pages/man2/rename.2.html)・[fsyncとディレクトリ同期](https://man7.org/linux/man-pages/man2/fsync.2.html))
- **スロット・オートセーブ** → [3]保存層の仕事(SaveDataは何も知らない)
- **破損検出・秘匿・改竄検出** → チェックサムは主に偶発的な破損の検出、暗号化は内容の秘匿に使う。攻撃者による改竄の検出には鍵付きMACや署名などの認証を検討し、暗号化だけで認証できるとは考えない([NISTのMACの定義](https://csrc.nist.gov/glossary/term/message_authentication_code))。変換・検証を[2]にまとめることはできるが、クライアント内に鍵や検証コードを置くだけでチートを完全に防げるわけではない。保護したいものと攻撃者が変更できる範囲を決める

## 規模別の判断

| 規模 | 推奨 |
|---|---|
| 小 | 案C(キーバリュー)。ただしバイナリ直書きだけは避ける |
| 中 | 案A(version+JSON)。エディタ(Unity)なら案Bも可だがリネーム規律を決める |
| 大・運用 | 案A+移行テスト(全旧バージョンのセーブを読み込むCIテスト) |

## この題材の教訓

- セーブは[YAGNI](/design/foundations/yagni-kiss-dry.html)の**例外**:「後から変えるのが極端に高い決定」(後方互換)なので、version番号と名前付き形式だけは初日に入れる
- 「動くこと」と「更新しても壊れないこと」は別要件で、後者はリリース後にしかテストできない——だからCIに旧セーブ読み込みテストを積む

---

前: [実績システム](/design/case-studies/achievements.html) | [カテゴリ目次](/design/case-studies/) | 次: [ダメージ計算](/design/case-studies/damage-calculation.html)
