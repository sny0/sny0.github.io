---
title: ゲーム内イベントと通知 — HPの変化をUIへ伝える
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: game
  summary: HPが変わる場面から、イベント、発行、購読、ハンドラー、通知する値、同期呼び出しとキュー、購読解除の役割を説明する。
  aliases: [ゲームイベント, イベント, 通知, event, publisher, subscriber, 発行, 購読, コールバック, ハンドラー, HPバー, Observer, イベントキュー]
  verification: MicrosoftのC#イベント・.NETイベント処理・購読解除とUnity 6.0のUnityEvent公式資料に照合（2026-11-07）
---

# ゲーム内イベントと通知 — HPの変化をUIへ伝える

敵に触れてHPが減ると、HPバーを短くし、ダメージの数字を表示することがあります。「HPが変わった」という出来事を、必要な処理へ伝える仕組みが**イベント通知**です。ここでは、ゲームのデータからUIへ変化を伝える場面を見ます。[UIの表示と操作](/game/basics/ui-layout-and-interaction.html)

## 起きたことを、登録した処理へ伝える

| 用語 | 役割 | HPの例 |
| --- | --- | --- |
| **発行元** | 出来事が起きたとき、通知を出す側。 | HPを管理する処理。 |
| **購読先** | 通知を受けたいと登録する側。 | HPバーを更新するUI。 |
| **イベントハンドラー** | 通知に応じて呼ばれる処理。 | 新しいHPに合わせてバーの長さを変える。 |
| **イベントのデータ** | 通知と一緒に伝える値。 | 新しいHP、最大HP、対象の識別子など。 |

購読とは、通知に応じて呼ぶ処理を登録することです。C#の`event`では、発行元がイベントを発生させ、購読したハンドラーが処理を行います。一つのイベントに複数の処理を登録できます。[MicrosoftのC#イベント](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/)

<figure class="study-figure">
  <img src="/images/game/game-events-and-notifications.svg" alt="HPを100から70へ更新した後、対象と新しいHPを通知する。通知を受けたHPバーが70を表示し、演出の処理が表示を始める。UIを用意するときに購読し、利用を終えるときに解除する。" width="760" height="446" loading="lazy">
  <figcaption>更新と通知の順序を決めた説明用の例です。通知を受けた各処理が、必要な表示を更新します。<a href="/study/images/game/game-events-and-notifications.svg" target="_blank" rel="noopener noreferrer">HPの更新と通知の図を拡大</a></figcaption>
</figure>

## 状態を更新してから、変化を知らせる

この例では、次の順序で処理を行います。通知に渡す値と、受け手が読み直す値が合うように、どの段階で通知するかを決めます。

```text
ダメージを受ける
→ HPを100から70へ更新する
→ 新しいHPが70であることを通知する
→ UIが通知を受け、70の表示へ更新する
```

**通知**は起きたことの情報で、**状態**は現在保持している値です。途中から開くUIには、購読した時点で現在のHPを渡すなど、最初の表示を用意します。その後の変化を通知で反映すれば、画面を開く前に起きた更新も、今の値から表示できます。[.NETのイベントと状態変更](https://learn.microsoft.com/en-us/dotnet/standard/events/) · [UI通知の設計](/design/case-studies/ui-notification.html)

## いつ呼ばれるかを確認する

C#の通常のイベント呼び出しでは、登録したハンドラーを**同期的に**呼びます。発行した処理の流れの中で受け手が動くため、重いハンドラーがあれば、その呼び出しを待つ時間も長くなります。[Microsoftのイベントの呼び出し](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/)

**イベントキュー**では、通知を一度ためて、ゲームループの決めた段階などで取り出します。後で処理するときには、対象がまだ存在するか、通知に入れた値はどの時点のものかを考えます。即座に呼ぶか、後へ渡すかは、採用する仕組みの規則で決まります。[Event Queue・Message Busの詳解](/game/patterns/event-queue-and-pubsub.html)

Unityには、エディターから呼び出す処理を設定する用途にも使える**UnityEvent**があります。C#の`event`や、独自のイベントキューと、登録方法や実行の規則をそれぞれ確認します。[UnityのUnityEvent](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Events.UnityEvent.html) · [delegateとevent](/languages/csharp/delegates-events-function-pointers.html)

## 購読の開始と終了をそろえる

UIを表示し直すたびに同じ通知へ追加登録すると、一回の変化で同じ処理が複数回呼ばれることがあります。いつ登録し、いつ解除するかを、そのUIやオブジェクトの利用期間に合わせます。C#のイベントでは、発行元から購読先への参照が残ることも考慮します。[Microsoftの購読と解除](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/how-to-subscribe-to-and-unsubscribe-from-events)

例えば、有効な間だけ通知を受けるUIなら、有効化時に購読し、無効化時に解除する方針を取れます。表示を隠す処理とオブジェクトの破棄は別の操作なので、そのUIで何を終了とするかまで決めます。[プレハブとオブジェクトの寿命](/game/basics/prefabs-and-object-lifetimes.html)

ゲーム内の通知を使い分ける設計は[UI通知の設計](/design/case-studies/ui-notification.html)、状態によって受け付ける処理を変える方法は[ゲームの状態とポーズ](/game/basics/game-states-and-pause.html)へ進みます。
