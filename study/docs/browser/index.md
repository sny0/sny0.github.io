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

- [AudioWorkletと音声バッファ — フレーム・先読み・アンダーラン](/browser/audio-worklet-buffering.html)
- [Cookieとセッション — 要求への付与とサーバー側の寿命](/browser/cookies-and-sessions.html)
- [CSRFとリクエスト検証 — Cookie付きの要求を受理する条件](/browser/csrf-and-request-validation.html)
- [Service Workerとオフライン動作 — 登録、制御、応答の選択](/browser/service-worker-offline.html)
- [Streams APIとストリーミング処理 — データの流れとbackpressure](/browser/streams-backpressure.html)
- [Web Audioでドップラー効果を再現する](/browser/audio-doppler.html)
- [Web Audioで遮蔽をなめらかに切り替える](/browser/audio-occlusion-transition.html)
- [Web Audioのクロスフェード — 等ゲイン・等電力・相関](/browser/audio-crossfade.html)
- [Web Audioのゲインオートメーション — フェードとクリックノイズ](/browser/audio-gain-automation.html)
- [Web Audioのコムフィルター — 遅延と干渉](/browser/audio-comb-filter.html)
- [Web Audioのフィードバックディレイ — 反響の間隔と減衰](/browser/audio-feedback-delay.html)
- [Web Audioのミキシング — ゲイン・ヘッドルーム・クリッピング](/browser/audio-mixing-and-headroom.html)
- [Web Audioの音の遮蔽 — 壁越しの音量と音色](/browser/audio-occlusion.html)
- [Web Audioの音の定位と距離減衰](/browser/audio-spatial-panning.html)
- [Web Audioの畳み込みリバーブ — インパルス応答から響きを作る](/browser/audio-convolution-reverb.html)
- [Web Workerとメッセージ通信 — 実行の分担とデータの所有権](/browser/web-workers-messages.html)
- [Web Workerと共有メモリの同期 — Atomics・競合・待機](/browser/shared-memory-atomics.html)
- [WebAssemblyと線形メモリ — バイナリから実行・共有するバイト列まで](/browser/webassembly-linear-memory.html)
- [WebAssemblyのデータ受け渡しとメモリ確保 — ポインタ・長さ・アリーナ](/browser/wasm-data-and-allocation.html)
- [Worker poolと待ち行列の制御 — 受付・実行・取消しを分ける](/browser/worker-pool-backpressure.html)
- [XSSとCSP — データがコードとして実行される境界](/browser/xss-and-csp.html)
- [イベントループ・Promise・async/await — 実行順と描画の関係](/browser/event-loop-promises.html)
- [クロスオリジン分離と共有メモリ — COOP・COEPからSharedArrayBufferまで](/browser/cross-origin-isolation.html)
- [ブラウザの描画 — HTMLから画面のピクセルまで](/browser/rendering-journey.html)
- [ブラウザの保存領域 — localStorage・IndexedDB・Cache APIとデータの寿命](/browser/storage-lifetime.html)
- [リングバッファとSPSCキュー — 満杯・折り返し・受け渡し](/browser/spsc-ring-buffer.html)
- [同一オリジンポリシーとCORS — 送信と応答の公開](/browser/same-origin-cors.html)

## この分野の学習ガイド

この分野専用の学習経路は準備中です。[学習ガイド一覧](/learn/)から、公開中のコースを選べます。

## 作って試す

- [AudioWorkletで先読みとアンダーランを観察する](/practice/browser/audio-buffer-observation.html)
- [CSRFでCookie付きの要求が届く条件を観察する](/practice/browser/csrf-observation.html)
- [HTML・CSS・JavaScriptでブラウザの変更と計測を観察する](/practice/browser/render-observation.html)
- [localStorage・IndexedDB・Cache APIの保存と完了を観察する](/practice/browser/storage-observation.html)
- [Service Workerの登録・制御・応答元を観察する](/practice/browser/service-worker-observation.html)
- [Streams APIで遅いsinkとbackpressureを観察する](/practice/browser/stream-backpressure-observation.html)
- [textContent・innerHTML・CSPの違いを観察する](/practice/browser/xss-csp-observation.html)
- [Web Audioでゲインとクリッピングを観察する](/practice/browser/audio-mixing-observation.html)
- [Web Audioでドップラー効果を聴き比べる](/practice/browser/audio-doppler-observation.html)
- [Web Audioで音の方向と距離を変えて聴く](/practice/browser/audio-spatial-observation.html)
- [Web Audioで急な消音とフェードを観察する](/practice/browser/audio-fade-observation.html)
- [Web Audioで畳み込みリバーブを聴き比べる](/practice/browser/audio-reverb-observation.html)
- [Web Audioで線形と等電力のクロスフェードを比べる](/practice/browser/audio-crossfade-observation.html)
- [Web Audioで遅延とコムフィルターを観察する](/practice/browser/audio-comb-observation.html)
- [Web Audioで反響の間隔と減衰を観察する](/practice/browser/audio-feedback-observation.html)
- [Web Audioで扉が開くときの音の切り替えを比べる](/practice/browser/audio-occlusion-transition-observation.html)
- [Web Audioで壁越しの音量と音色を比べる](/practice/browser/audio-occlusion-observation.html)
- [Web Workerでコピー・transfer・停止を観察する](/practice/browser/worker-message-observation.html)
- [WebAssemblyの読み込みと線形メモリを観察する](/practice/browser/wasm-memory-observation.html)
- [WebAssemblyへ配列とUTF-8を渡し、メモリ確保を観察する](/practice/browser/wasm-abi-observation.html)
- [Worker poolで受付上限・待機取消し・結果破棄を観察する](/practice/browser/worker-pool-observation.html)
- [Workerの競合とAtomicsの待機・通知を観察する](/practice/browser/atomics-observation.html)
- [Workerへのコピーと共有メモリをブラウザで観察する](/practice/browser/cross-origin-isolation-observation.html)
- [ブラウザでCookieの範囲とセッションIDを観察する](/practice/browser/cookie-session-observation.html)
- [ブラウザでPromise・await・timer・rAFの順序を観察する](/practice/browser/event-loop-observation.html)
- [ブラウザで同一オリジンとCORSの応答を比べる](/practice/browser/cors-observation.html)
- [リングバッファの満杯・折り返し・読み出し順を観察する](/practice/browser/ring-buffer-observation.html)

## 扱う範囲・増補する項目

- navigation
- DOM・CSS
- JavaScript実行
- event loop
- layout・paint・composite
- プロセス隔離
- キャッシュ・保存領域
