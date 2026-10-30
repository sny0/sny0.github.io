---
title: "判断ガイド: C++の選択 — テンプレートか仮想関数か/値渡しか参照渡しか/unique_ptrかshared_ptrか/配列かvectorか/構造体かクラスか"
study:
  source: C++ Wiki
  status: published
  summary: テンプレートの明示的実体化をライブラリから提供することもできます。ただし、それもC++ ABI・型定義・ビルド条件の互換性が必要です。処理系や言語をまたぐ公開APIでは、C ABIの関数と明示したデータ/所有権の契約を検討します。
  section: reference
  format: article
  domain: design
---

# 判断ガイド: C++の選択 — テンプレートか仮想関数か/値渡しか参照渡しか/unique_ptrかshared_ptrか/配列かvectorか/構造体かクラスか

## 1. テンプレートか仮想関数か

```
Q1. 型は実行時に混ざる・切り替わるか?(vector<Base*>に入れる/実行中に差し替え)
    → はい ──> 仮想関数(コンパイル時多態では表現できない)
Q2. 型はコンパイル時に決まるか?
    → はい ──> テンプレート(実行時コストゼロ、型ごとに最適コード)
Q3. どちらでも書ける場合の追加考慮:
    ・ビルド時間/コードサイズが厳しい → 仮想関数寄り
    ・ホットループの内側/インライン化が効いてほしい → テンプレート寄り
    ・ABI境界(DLL/モジュール)を越える → ABI契約を先に確認。仮想関数でも自動的に安全にはならない
    ・エラーメッセージ・書きやすさ重視のチーム → 仮想関数寄り(conceptsで緩和可)
```

テンプレートの明示的実体化をライブラリから提供することもできます。ただし、それもC++ ABI・型定義・ビルド条件の互換性が必要です。処理系や言語をまたぐ公開APIでは、C ABIの関数と明示したデータ/所有権の契約を検討します。

根拠: [テンプレート](/languages/cpp/templates-and-concepts.html)、[vtable](/runtime/cpp-internals/vtable-and-virtual-calls.html)、[ABI](/runtime/cpp-internals/symbols-and-linkage.html)

## 2. 値渡しか参照渡しか

```
基本表(引数の受け取り方):
  読むだけ+小さい型(目安: ポインタ2個分≒16バイト以下。int, float, Vec2, ポインタ, span)
      ──> 値渡し(レジスタに乗る。参照より速いことも)
  読むだけ+大きい型(string, vector, 大きいstruct)
      ──> const T&
  変更する ──> T&(出力が主なら戻り値を検討)
  所有権をもらう(保存する)──> 値渡し+std::move / unique_ptr<T>
  「無いかもしれない」──> const T* または optional<T>
例外: sizeofが小さくてもコピーコンストラクタが重い型は const&。
      テンプレート内では汎用に const T&(または転送参照)が無難
```

根拠: [値と参照](/languages/cpp/values-pointers-references.html)、[呼出規約](/runtime/cpp-internals/function-calls-and-cpu.html)(大きい型はメモリ経由になる)

## 3. unique_ptrかshared_ptrか

```
Q1. まず「ポインタが必要か」: メンバに値で置けるなら置く(ヒープ不要)
Q2. ヒープが必要 → 所有者は1つで設計できるか?
    → できる ──> unique_ptr(既定。9割はこれ)
    → 本当に複数の所有者が寿命に関与する(共有アセット等)──> shared_ptr+循環はweak_ptr
Q3. 「所有はしないが、相手が先に死ぬかも」──> weak_ptr(shared管理下)/世代ハンドル(大量オブジェクト)
危険信号: 「とりあえずshared」「どこで解放されるか分からないからshared」
          → 所有設計の放棄。unique+借用で書き直せないか先に検討
```

根拠: [スマートポインタ](/languages/cpp/smart-pointers.html)、[所有権](/runtime/memory/ownership-and-borrowing.html)

## 4. 配列かvectorか

```
Q1. サイズはコンパイル時に固定か?
    → 固定・要素を自身に保持したい ──> std::array(大きい場合は本体の格納先にも注意)
    → 実行時に決まる/伸びる ──> std::vector(既定)
Q2. vectorで再確保が問題になるか?(ポインタ保持・フレーム中の確保)
    → reserve で事前確保 / 固定容量が本質なら array や自作固定容量vector
Q3. 生配列を使ってよいのは: C API境界、意図的な低レベル層のみ(理由をコメント)
補足: array/vectorの本体の格納先は変数の作り方で決まる。array=必ずスタックではない
補足: 「所有しない連続範囲」を渡すだけなら std::span(C++20)
```

根拠: [配列と文字列](/languages/cpp/arrays-and-strings.html)、[STL](/languages/cpp/stl.html)

## 5. 構造体かクラスか

```
Q1. 「任意のメンバに任意の値を入れても壊れない」か?
    → 壊れない(ただのデータの束: Vec3, HitInfo, Desc)──> struct+public
    → 壊れる(不変条件がある: HPは0..max、リストの整合)──> class+private+操作関数
Q2. 迷ったら: getter/setterを全メンバに生やしたくなった時点でstructに戻す
   (それは隠蔽になっていない → [情報隠蔽](../01_design_basics/05_abstraction_encapsulation.md))
```

根拠: [構造体とクラス](/languages/cpp/structs-and-classes.html)

## 共通のトレードオフ観

5つの選択はすべて「**自由度と引き換えに何かを固定する**」判断です: テンプレートは型を、値は独立性を、uniqueは所有者を、arrayはサイズを、structは公開を固定する。**固定できるものを固定するほどコードは速く・安全になる**(コンパイラに証明材料を与える)——迷ったら「より多く固定する側」に倒し、要求が現れたら緩める、がC++の基本戦略です。

## 理解度チェック

1. テンプレートが使えない(仮想関数必須の)状況を2つ挙げてください。
2. 「小さい型は値渡しの方が速いことがある」理由は?
3. 「とりあえずshared_ptr」が危険信号である理由は?

---

関連項目：[イベント・DI・Singletonの判断](/design/decisions/events-di-singleton.html) / [学習ガイド](/design/decisions/) / [最適化・リファクタリングの判断](/design/decisions/optimize-or-refactor.html)
