---
title: HTTPキャッシュ — 保存・鮮度・再検証と304応答
study:
  source: 新規執筆
  section: reference
  format: article
  status: published
  domain: network
  summary: HTTP応答の保存可否、freshnessとage、条件付き要求による再検証を分けて説明する。Cache-Control、ETagとIf-None-Match、304の本文再利用、キャッシュのキーと保存区画、ブラウザの別の保存機構を整理する。
  aliases: [HTTP cache, HTTPキャッシュ, Cache-Control, freshness, fresh, stale, current_age, Age, max-age, s-maxage, no-cache, no-store, private, shared cache, Vary, ETag, strong validator, weak validator, If-None-Match, revalidation, 再検証, 304 Not Modified, cache partition]
  verification: 一次資料照合（2026-11-05）
---

# HTTPキャッシュ — 保存・鮮度・再検証と304応答

**HTTPキャッシュ**は、過去の応答を保存し、条件が合う後の要求へ再利用する仕組みです。毎回本文を取得し直す費用を減らせます。ただし、**保存できること、確認せず再利用できること、確認後なら再利用できることは別**です。

[HTTPの要求・応答](/network/http-messages.html)に、保存先と再利用の判断が加わります。この章はHTTP CachingのRFC 9111と、HTTP SemanticsのRFC 9110を主に参照します。2026-11-05にRFC EditorとIETFの現行情報を確認した、Internet Standardの文書です。[RFC 9111](https://www.rfc-editor.org/info/rfc9111/)、[RFC 9110](https://www.rfc-editor.org/info/rfc9110/)

## private cacheとshared cache

**private cache**は一人のユーザー向けのキャッシュで、ブラウザなどに置かれます。**shared cache**は複数ユーザーへの再利用を目的とするもので、プロキシやCDNなどに置かれる場合があります。同じ応答でも、private側には保存でき、shared側には保存できないという指示ができます。[RFC 9111 §1](https://www.rfc-editor.org/rfc/rfc9111.html#section-1)

保存するのは本文だけではなく、状態コードやヘッダーなど、後の利用判断に必要な情報も含みます。キャッシュはHTTPの任意機能なので、保存が許可された応答を必ず保存し続ける保証はありません。容量や実装の都合で捨てられることもあります。200以外の応答が保存可能な場合もあり、「200なら必ず保存、エラーなら絶対保存しない」という分類ではありません。[RFC 9111 §2 / §3](https://www.rfc-editor.org/rfc/rfc9111.html#section-2)

## キャッシュキーは、URLだけとは限らない

**キャッシュキー**は、どの保存済み応答が要求に対応するかを識別する情報です。基本となる要求メソッドと対象URIに加え、`Vary`が指定する要求ヘッダーも関係します。

例えば、同じURIでも`Accept-Encoding`によってgzip版と非圧縮版を返す場合、`Vary: Accept-Encoding`により、その要求の違いを再利用の選択へ反映します。ヘッダー名だけをキーへ足すという意味ではなく、保存時の要求と、新しい要求の対応する値を照合します。`Vary: *`は、通常の照合で再利用先を決められる指定ではありません。[RFC 9111 §2 / §4.1](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.1)

ブラウザでは、上位サイトなどの文脈による**partition**、つまり保存区画も関係します。Fetch仕様はネットワーク分割キーに応じたHTTPキャッシュ区画を定めています。同じURLだから、どのサイトから使っても一つの保存物を共有する、とは限りません。[WHATWG Fetch §2.7 / §2.8](https://fetch.spec.whatwg.org/#http-cache-partitions)

## freshとstaleは、単純な受信後TTLではない

保存済み応答を、鮮度の時間条件から再利用できる状態が**fresh**、その条件を満たさなくなった状態が**stale**です。基本の比較は次のとおりです。ただし、キーの一致や`no-cache`など、ほかの制約も満たす必要があります。

```text
freshness_lifetime > current_age なら fresh
```

**freshness lifetime**は鮮度の有効期間です。応答の`max-age`、共有キャッシュ向けの`s-maxage`、`Expires`などから決めます。明示的な期限がない場合、条件に応じてヒューリスティックな推定が許されることもあります。Cache-Controlがないことだけで「保存禁止」「常に通信する」とは決まりません。[RFC 9111 §4.2.1 / §4.2.2](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.2.1)

**current_age**は、応答が生成または検証されてからの経過を見積もった現在のageです。`Date`、受信した`Age`、要求から応答までの遅れ、保存後の経過などを考慮します。単に「自分のキャッシュへ入れた時刻から何秒か」ではありません。

例えば、`max-age=60`でも、すでに40秒のageを持つ応答を受け取れば、そこからさらに60秒無検証で使えるわけではありません。上流のキャッシュで経過した時間も含めて扱います。freshは「今この瞬間のサーバー内容と必ず同一」という保証ではなく、HTTPの鮮度規則に基づく判断です。[RFC 9111 §4.2 / §4.2.3 / §5.1](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.2.3)

<figure>
  <img src="/images/network/http-cache-decision.svg" alt="応答の保存可否、キーや保存区画の一致、鮮度と再検証の必要性を分け、直接再利用、条件付き要求、新規取得へ分岐する図" width="760" height="1510" loading="lazy">
  <figcaption>保存済みであることだけでは、今そのまま再利用できるとは限りません。鮮度は受信直後からの単純なTTLでもありません。<a href="/study/images/network/http-cache-decision.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

## Cache-Controlの指示を分けて読む

次は応答側の代表的な指示です。`no-cache`と`private`は、フィールド名の引数を付けない通常の形を扱います。

| 指示 | 意味 |
| --- | --- |
| `max-age=N` | 応答のageに対する鮮度の期間を指定する |
| `s-maxage=N` | 共有キャッシュ向けの鮮度期間。max-ageなどより優先する |
| `no-cache` | 保存は可能だが、再利用前に成功した再検証が必要 |
| `no-store` | 対象の要求・応答を保存し、後の要求へ再利用することを禁止する |
| `private` | shared cacheでの保存を禁止し、private cacheには他条件に従う保存を許す |
| `must-revalidate` | staleになった応答を、成功した再検証なしに再利用しない |

`no-cache`は「キャッシュという機能を使うな」ではありません。保存本文を持ちながら確認し、変更がなければ本文を再利用できます。一方、`no-store`は全URL、全保存区画、全アプリの既存データを一括消去するコマンドではありません。`private`も内容の暗号化や秘密性の保証ではなく、HTTPキャッシュの保存場所を制御します。[RFC 9111 §5.2.2](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2)

要求側にもCache-Controlがあり、応答側と意味を混ぜないようにします。また、`Authorization`付き要求をshared cacheで再利用する場合には追加条件があります。ユーザーごとに内容が変わる応答は、privateやno-storeなど、保存・再利用の意図に合う指示を使います。個人向けだからno-cacheだけで保存されなくなる、という意味ではありません。[RFC 9111 §3.5 / §5.2.1](https://www.rfc-editor.org/rfc/rfc9111.html#section-3.5)

## ETagと、条件付きGET

**再検証**は、保存済み応答が今回も利用できるかをサーバーなどへ確認する処理です。その手掛かりになる値を**validator**と呼びます。**ETag**は表現に付けるタグで、クライアントは内容を推測して解読するのではなく、受け取った値を条件付き要求へ使います。必ず本文の暗号学的ハッシュであるわけではありません。[RFC 9110 §8.8 / §8.8.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8.3)

ETagには、例えば`"study-v1"`のようなstrongなものと、`W/"study-v1"`のようなweakなものがあります。strong validatorは表現データの同一性を厳密に扱い、weak validatorはバイト単位では異なっても、再利用に適切な同等性を示す場合があります。`W/`はweakであることを示す接頭辞です。

条件付きGETでは、保存時のETagを`If-None-Match`に入れます。次はヘッダーの抜粋です。

```http
If-None-Match: "study-v1"
```

If-None-Matchの照合では**weak comparison**を使います。引用符内のタグ本体は大文字・小文字を区別して比較し、strong／weakの違いだけで不一致にはしません。値はリストにもでき、一つでも選択された表現に一致すれば、GET／HEADでは通常の本文送信の代わりに304を返します。別のメソッドの条件評価まで「一致すれば必ず304」と一般化しません。[RFC 9110 §8.8.3.2 / §13.1.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.2)

```http
If-None-Match: "other", W/"study-v1"
```

`If-None-Match: *`は、「現在の表現があるか」を条件にする別の形です。`*`を通常のタグリストの一要素として混ぜる形ではありません。また、`*`で304を受けても、クライアントが対応する本文を保存している証拠にはなりません。再利用には、その表現に対応する保存物が必要です。

validatorはETagだけではありません。`Last-Modified`の更新日時を、要求の`If-Modified-Since`へ入れる再検証もあります。`If-None-Match`がある要求では、それを優先し、`If-Modified-Since`は無視する規則です。異なる検証方法を、独立した条件として無条件に両方適用するわけではありません。[RFC 9110 §13.1.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.3)

## 304は本文ではなく、保存済み応答を利用するための情報

**304 Not Modified**は、条件付きGET／HEADに対して、対応する保存済み表現を使えることを知らせます。304自身には本文を含めません。「本文が0byteの新しいページへ置き換える」という意味でもありません。[RFC 9110 §15.4.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.4.5)

キャッシュは、304がどの保存済み応答に対応するかを確認し、そこへ304のヘッダー情報を反映します。保存済み本文は残し、Date、Cache-Control、ETag、Varyなど、届いたメタデータを更新する規則に従います。ETagだけを見て、URIやVaryの異なる本文へ無条件に結び付ける処理ではありません。[RFC 9111 §4.3.4](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.3.4)

<figure>
  <img src="/images/network/http-cache-validation.svg" alt="初回200の本文とETagを保存し、If-None-Matchへの304では保存済み本文と更新したメタデータを再利用し、不一致なら200の本文を取得する図" width="760" height="1510" loading="lazy">
  <figcaption>304の通信本文と、アプリが最終的に使う保存済み本文を分けます。条件不一致の200は、それだけではサーバー上の内容が変わった証拠になりません。<a href="/study/images/network/http-cache-validation.svg" target="_blank" rel="noopener">図を拡大する</a></figcaption>
</figure>

ブラウザのHTTPキャッシュが再検証した場合、サーバーとの通信は304でも、JavaScriptのFetchへは保存済み200の応答と本文が渡る経路があります。Fetchの仕様は、再検証の304で保存済みヘッダーを更新し、その保存応答を利用する処理を定めています。通信上のstatusと、APIが利用側へ返すstatusは、常に同じ観測ではありません。[WHATWG Fetch: HTTP-network-or-cache fetch](https://fetch.spec.whatwg.org/#http-network-or-cache-fetch)

一方、アプリが自分で条件付き要求を送り、304をそのまま受け取る場合もあります。「Fetchなら必ず304が200になる」とはしません。誰が条件を追加し、誰が本文を保存・再構成したかを区別します。

## stale、通信失敗、保存機構の範囲

staleだから必ず本文を捨てるわけではなく、再検証で使える場合があります。反対に、通信が失敗したからといって、古い応答をいつでも自由に返せるわけでもありません。staleの提供には明示的な許可や切断状態などの条件があり、no-cacheやmust-revalidateなどで禁止されていれば、その制約に従います。失敗応答を返すことと、stale本文を採用することは別の動作です。[RFC 9111 §4.2.4 / §4.3.3](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.2.4)

ブラウザ内の保存機構も区別します。**HTTPキャッシュ**はHTTPの規則で応答を再利用し、**Cache API**はアプリがRequest／Responseを明示的に保存・選択するAPIです。Cache APIの保存物がHTTPキャッシュの期限で自動更新されるわけではなく、HTTPのキャッシュ指示をそのまま自動適用する仕組みでもありません。[MDN: Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)

**bfcache**は、戻る・進むのために文書やJavaScriptの状態などを保持・復元する仕組みです。HTTP応答だけの保存とは異なります。さらにService Workerは要求を仲介し、Cache APIなどから応答を返す経路も作れます。「キャッシュから表示した」という言葉だけでは、どの層を使ったか分かりません。[web.dev: Back/forward cache](https://web.dev/articles/bfcache)、[ブラウザの描画](/browser/rendering-journey.html)

## 付属例で確認する契約

[ETagと304の実践](/practice/network/http-cache-observation.html)では、同じループバックのNode標準HTTPサーバーへ、C++／WinHTTP版とC#／HttpClient版が、それぞれ4回GETします。応答は`Cache-Control: no-cache`、ETagは固定の`"study-v1"`です。

| 要求 | 応答と利用する本文 |
| --- | --- |
| 初回、条件なし | 200の本文を取得し、アプリの変数へ保存 |
| タグ一致 | 304を受け、保存済み本文を再利用 |
| weakを含むリストで一致 | 304を受け、保存済み本文を再利用 |
| 不一致のタグ | 200から本文を取得 |

本文の保持と304時の再利用は、各クライアントが明示的に行います。ブラウザの自動HTTPキャッシュ、fresh hit、age計算、Varyやpartitionの動作を実測する例ではなく、汎用キャッシュの実装でもありません。サーバーの本文やETagを変更する実験もないため、最後の200を「内容更新を検出した」とは読みません。条件の一致・不一致と、通信本文・利用本文の区別を観察する範囲です。
