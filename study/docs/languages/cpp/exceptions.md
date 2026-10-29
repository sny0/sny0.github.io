---
title: "例外"
study:
  source: "C++ Wiki"
  kind: "本文"
  status: "既存原稿"
  summary: "エラーを戻り値ではなく別経路(throw/catch)で伝搬させる仕組み。C#と構文は似ていますが、C++では「使わない」という選択が実在し、ゲーム業界では無効化する文化も広い——この点がC#との最大の違いです。"
---

# 例外

## 一言で言うと

エラーを戻り値ではなく**別経路(throw/catch)で伝搬**させる仕組み。C#と構文は似ていますが、C++では**「使わない」という選択が実在し、ゲーム業界では無効化する文化も広い**——この点がC#との最大の違いです。

## 基本形

```cpp
// C++20
#include <stdexcept>

Config LoadConfig(const std::string& path) {
    std::ifstream f(path);
    if (!f) throw std::runtime_error("config not found: " + path);
    // ...パース。パース失敗でもthrow
    return config;
}

void Boot() {
    try {
        Config c = LoadConfig("settings.json");
    } catch (const std::exception& e) {     // const参照で受けるのが定石(コピーとスライシング防止)
        Log(e.what());
        UseDefaultConfig();
    }
}
```

## 仕組み: スタック巻き戻し(stack unwinding)

throwすると、対応するcatchまで**スタックを遡りながら、途中の全ローカルオブジェクトのデストラクタを実行**します。

```
Boot() → LoadConfig() → ParseJson() で throw
   ↑ catch          ↑ ローカルのifstream等が   ↑ ここから
   ここで捕捉        デストラクタで閉じられる    巻き戻し開始
```

- この「途中の後片付けが自動で走る」仕組みが**[RAII](/languages/cpp/raii.html)とセットで初めて安全**になります。生ポインタ+手動deleteのコードに例外が飛ぶと即リーク——「例外を使うならRAIIは必須」
- **デストラクタから例外を投げてはいけない**: 巻き戻し中に二重例外になると即 `std::terminate`(強制終了)
- 実装コスト: 現代の主流実装(ゼロコスト例外)は「**投げなければほぼタダ、投げたら非常に高い**」。例外は例外的な事態専用で、通常フロー(「アイテムが見つからない」程度)に使わない(→ [例外処理の内部](/runtime/cpp-internals/exceptions-and-rtti-impl.html))

## エラー処理の選択肢(C++の全体地図)

| 手段 | 向く場面 |
|---|---|
| 例外 | 起動時ロード失敗、コンストラクタの失敗(戻り値がない)、深い呼び出しからの脱出 |
| 戻り値 `bool` / エラーコード | 頻繁に起きる失敗(当たり判定なし、在庫なし) |
| `std::optional<T>` | 「値があるか、ないか」(検索結果) |
| `std::expected<T,E>`(C++23) | 「値か、エラー理由か」(モダンな主流に向かう) |
| assert / 即クラッシュ | プログラミングエラー(契約違反)。ゲーム開発では「早く大きく壊す」が好まれる |

```cpp
// optionalの例: 「見つからない」は例外ではなく型で表現
std::optional<Item> FindItem(ItemId id);
if (auto item = FindItem(id)) { Use(*item); }
```

## ゲーム業界の現実(重要)

- 多くのゲームスタジオ・エンジンは**例外を無効化**(`-fno-exceptions`, MSVCの`/EHs-c-`)してきた歴史があります。理由: 実行時コスト(サイズ・最適化阻害)への懸念、コンソール機の制約(過去)、「フレーム中に投げて安全に継続する設計が難しい」こと
- **Unreal Engineは例外非使用が基本**(チェック(check/ensure)とログで代替)。標準C++の教科書通りに例外を書くとUEでは浮きます(→ [第10部](/game/unreal/))
- 一方、ツール・エディタ・サーバーサイドC++では普通に使われる。**「所属する環境の流儀に従う」が正解**で、これは技術的優劣の問題ではなくエコシステムの選択です

## C#との違い

| | C# | C++ |
|---|---|---|
| 使用の前提 | 言語・BCL全体が例外前提(避けられない) | 使わない選択が現実に存在 |
| checked/finally | finallyで後片付け | finallyなし。**RAIIが後片付け**(より強力) |
| NullReference等 | ランタイムが自動で投げる | ヌル参照外しは例外ではなく**未定義動作**(何も投げない!) |
| コスト | try自体は安い、throwはそこそこ | 投げなければほぼゼロ、throwは高い(実装依存) |
| 捕捉漏れ | スタックトレース付きで落ちる | `std::terminate`(トレースは処理系・設定依存) |

**C#の感覚で「範囲外アクセスは例外で守られている」と思うのが最も危険**: C++の `v[i]` は範囲外で例外を投げず未定義動作です(`v.at(i)`だけが投げる)。

## Unity開発者が誤解しやすい点

1. 「try-catchで囲めば安全」— C++の多くのバグ(ヌル外し、範囲外、UAF)は例外にならず**未定義動作**。catchできない(→ [未定義動作](/languages/cpp/undefined-behavior.html))
2. 「例外は普通のエラー通知」— C++では設計判断。頻繁なエラーに使うと性能と可読性を失う
3. コンストラクタで失敗しうる場合の扱い: C++ではコンストラクタは戻り値を持てないため例外が正道だが、例外禁止環境では「ファクトリ関数+optional」で設計する

## ゲーム開発での使用例

- 起動・ロード時の致命的エラー(アセット欠損)→ 例外またはエラーコードで起動中断
- ゲームプレイ中の「失敗」(攻撃が外れた、購入できない)→ 例外は使わず戻り値/optional
- 開発中の契約違反(「ここに来るはずがない」)→ assert(リリースでは無効化 or クラッシュレポート)

## 使う場面 / 使わない場面

- **使う**: プロジェクトが例外許容で、真に例外的な事態(ロード失敗、初期化失敗)。RAIIが徹底されているコード
- **使わない**: フレーム内の高頻度パス。例外禁止のエンジン/プロジェクト(UE等)。デストラクタ・ムーブ操作(noexceptにする)

## よくある誤解

- 「例外は遅いから絶対使うな」— 投げない限りほぼゼロコスト(主流実装)。ただし例外「有効化」自体のコードサイズ・最適化への影響はゼロではなく、環境の流儀が優先
- 「エラーコードの方が常に速くて安全」— 全戻り値チェックの手書きは書き漏らす。checkedな型(optional/expected)が現代の折衷

## 関連項目

- [RAII](/languages/cpp/raii.html)(例外安全の土台) / [例外処理の内部の仕組み](/runtime/cpp-internals/exceptions-and-rtti-impl.html)
- [C++例外とC#例外(対比の詳細)](/languages/csharp/exceptions-comparison.html)
- [未定義動作](/languages/cpp/undefined-behavior.html)

## 理解度チェック

1. スタック巻き戻しとRAIIの関係を説明できますか。
2. 「投げなければほぼタダ」という実装特性は、例外の使い方にどう影響しますか。
3. C++で `v[i]` の範囲外はどうなりますか。C#との違いは?

## 演習

samples/exceptions_raii.cpp(検証済み)で、throw時にローカルのRAIIオブジェクトのデストラクタが呼ばれる順序を出力で確認してください。次に生ポインタ+delete版に書き換えて、リークする流れを目視してください(実行はしなくてよい)。

---

前: [enum・enum class・namespace](/languages/cpp/enums-and-namespaces.html) | [カテゴリ目次](/languages/cpp/) | 次: [auto・decltype・constexpr・consteval](/languages/cpp/auto-and-constexpr.html)
