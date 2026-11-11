---
title: セーブとシリアライズの基本 — 実行中の状態を保存する
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: 実行中のHPや進行状況から保存用のデータを選び、形式へ変換してファイルに保存し、読み戻して検証・復元する流れを説明する。
  aliases: [セーブ, save, ロード, 保存データ, シリアライズ, serialize, デシリアライズ, JSON, バージョン, マイグレーション, スナップショット]
  verification: MicrosoftのJSONシリアライズ、Unityの保存先とWindowsのファイル書き込みの公式資料に照合（2026-11-07）
---

# セーブとシリアライズの基本 — 実行中の状態を保存する

ゲームを終了して次に起動したとき、プレイヤーの進行状況を続きから使いたいことがあります。実行中のデータから必要なものを選び、保存できる形にして残すのが**セーブ**です。読み戻すときは、保存した値をゲームの状態へ復元します。[ゲームエンジンと実行中の状態](/game/basics/game-engine-basics.html)

## 素材、設定、進行状況を見分ける

| データ | 例 | 扱い方の例 |
| --- | --- | --- |
| **アセット** | 敵のモデル、アイテムの定義、ステージの素材。 | 制作時に用意し、ゲームから参照する。 |
| **利用者の設定** | 表示言語、キー割り当て、画面の設定。 | 選んだ設定を保存し、次回も適用する。 |
| **進行状況** | クリアしたステージ、所持アイテム、現在のHP。 | ゲームが保存対象と保存時点を決める。 |

すべてのデータを一つのファイルへ保存するか、設定と進行を分けるかは設計で決めます。例えば弾の描画に使うメッシュを保存し直す代わりに、必要なアイテムやステージを識別する**ID**を保存し、読み込み時に対応するアセットを探す構成にできます。[アセットの読み込みと所有権](/game/asset-loading.html) · [セーブデータの設計](/design/case-studies/save-data.html)

## 保存用の値を、ファイルにできる形へ変える

**シリアライズ**は、データの状態を保存や送信ができる表現へ変換する処理です。**デシリアライズ**は、その表現からデータを組み立てる処理です。JSONのようなテキスト形式も、用途に合わせたバイナリ形式も使えます。データを形式に合わせて変換する処理と、変換したデータをファイルへ書く処理は分けて考えます。[Microsoftのシリアライズの説明](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/overview) · [ファイルとパス](/os/files-and-paths.html)

<figure class="study-figure">
  <img src="/images/game/save-data-and-serialization.svg" alt="実行中の状態から保存用の値を集め、JSONなどへシリアライズしてファイルへ書く。再開時にはファイルを読み、データへ変換して版と値を検証し、確認した内容からゲーム状態を復元する。" width="760" height="460" loading="lazy">
  <figcaption>保存する値を選ぶ処理、表現を変える処理、ファイル操作、ゲームへの復元を順に追います。<a href="/study/images/game/save-data-and-serialization.svg" target="_blank" rel="noopener noreferrer">セーブと復元の図を拡大</a></figcaption>
</figure>

例えば次は、説明用の保存データです。`version`はこの形式の版、`stageId`はステージを識別する名前とします。

```json
{
  "version": 1,
  "stageId": "forest-01",
  "player": { "hp": 70, "maxHp": 100 },
  "itemIds": ["key-blue", "potion-small"]
}
```

この例では、実行中のオブジェクトそのものやメモリアドレスを記録する代わりに、再開に必要な値を選んでいます。ゲームを再開するときは、ステージを読み、必要なオブジェクトを用意して、HPや所持品を適用します。形式に何が含まれ、どの型を扱えるかは、使うシリアライザーの仕様で確認します。[MicrosoftのSystem.Text.Jsonの概要](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/overview) · [シーンと実行中の状態](/game/basics/scenes-and-components.html)

## 読めたデータを、確かめてから適用する

この例の読み込みでは、まず復元候補のデータを作り、次の点を確認してからゲームへ反映します。途中の検証で失敗しても、まだ遊べる現在の状態を半端に書き換えずに済みます。

1. ファイルを読み取れ、JSONの構造を解釈できたか。
2. 対応する`version`か。必要な項目がそろっているか。
3. `stageId`や`itemIds`が、現在のゲームで使えるIDか。
4. HPが0以上かつ最大HP以下など、ゲームの値として使える範囲か。

JSONとして正しくても、必要な項目や値の意味はゲーム側で確かめます。シリアライザーにも、必須項目や未知の項目を扱う設定があります。形式を読む処理の成功と、ゲームへ適用できることを順に確認します。[Microsoftの必須プロパティ](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties) · [未知の項目の扱い](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/missing-members)

## 古いセーブに項目を追加するとき

ゲームを更新して保存形式を変える場合は、対応する版ごとの読み方を用意します。例えば版1に存在しない新項目へ既定値を補い、版2のデータへ変換してから復元できます。この変換を**マイグレーション**と呼びます。どの項目を省略でき、どんな既定値を使うかも、保存形式の規則として決めます。[セーブデータの互換性を設計する](/design/case-studies/save-data.html)

## 保存途中の中断も考える

書き込み中にアプリが終了すると、ファイルの内容が途中までになる場合があります。別の一時ファイルへ完成した内容を書き、確認した後に保存先を置き換える方法や、前の保存を残す方法を検討できます。置き換えと障害後の復旧で保証できる範囲は、OSや保存先、フラッシュの方法も含めて確認します。[Windowsの書き込みと永続化](/os/file-write-and-durability.html)

保存先も、対象プラットフォームの規則に合わせます。例えばUnityの`Application.persistentDataPath`は、実行間でデータを保持するための場所を表し、実際のパスはプラットフォームによって変わります。[UnityのpersistentDataPath](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Application-persistentDataPath.html)

どのゲーム状態で保存を許可するかは、[ゲームの状態とポーズ](/game/basics/game-states-and-pause.html)へつながります。
