---
{
  "title": "ブラウザ",
  "study": {
    "source": "統合ガイド",
    "status": "published",
    "generated": true,
    "catalog": false,
    "section": "reference",
    "format": "index",
    "domain": "browser"
  }
}
---

# ブラウザ

URLを開いてから描画されるまでを、通信・実行・表示に分ける。

## 辞典の本文

- [Cookieとセッション — 要求への付与とサーバー側の寿命](/browser/cookies-and-sessions.html)
- [CSRFとリクエスト検証 — Cookie付きの要求を受理する条件](/browser/csrf-and-request-validation.html)
- [Service Workerとオフライン動作 — 登録、制御、応答の選択](/browser/service-worker-offline.html)
- [Streams APIとストリーミング処理 — データの流れとbackpressure](/browser/streams-backpressure.html)
- [Web Workerとメッセージ通信 — 実行の分担とデータの所有権](/browser/web-workers-messages.html)
- [Worker poolと待ち行列の制御 — 受付・実行・取消しを分ける](/browser/worker-pool-backpressure.html)
- [XSSとCSP — データがコードとして実行される境界](/browser/xss-and-csp.html)
- [イベントループ・Promise・async/await — 実行順と描画の関係](/browser/event-loop-promises.html)
- [ブラウザの描画 — HTMLから画面のピクセルまで](/browser/rendering-journey.html)
- [ブラウザの保存領域 — localStorage・IndexedDB・Cache APIとデータの寿命](/browser/storage-lifetime.html)
- [同一オリジンポリシーとCORS — 送信と応答の公開](/browser/same-origin-cors.html)

## この分野の学習ガイド

この分野専用の学習経路は準備中です。[学習ガイド一覧](/learn/)から、公開中のコースを選べます。

## 作って試す

- [CSRFでCookie付きの要求が届く条件を観察する](/practice/browser/csrf-observation.html)
- [HTML・CSS・JavaScriptでブラウザの変更と計測を観察する](/practice/browser/render-observation.html)
- [localStorage・IndexedDB・Cache APIの保存と完了を観察する](/practice/browser/storage-observation.html)
- [Service Workerの登録・制御・応答元を観察する](/practice/browser/service-worker-observation.html)
- [Streams APIで遅いsinkとbackpressureを観察する](/practice/browser/stream-backpressure-observation.html)
- [textContent・innerHTML・CSPの違いを観察する](/practice/browser/xss-csp-observation.html)
- [Web Workerでコピー・transfer・停止を観察する](/practice/browser/worker-message-observation.html)
- [Worker poolで受付上限・待機取消し・結果破棄を観察する](/practice/browser/worker-pool-observation.html)
- [ブラウザでCookieの範囲とセッションIDを観察する](/practice/browser/cookie-session-observation.html)
- [ブラウザでPromise・await・timer・rAFの順序を観察する](/practice/browser/event-loop-observation.html)
- [ブラウザで同一オリジンとCORSの応答を比べる](/practice/browser/cors-observation.html)

## 扱う範囲・増補する項目

- navigation
- DOM・CSS
- JavaScript実行
- event loop
- layout・paint・composite
- プロセス隔離
- キャッシュ・保存領域
