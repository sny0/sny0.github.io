# ETagによるHTTP再検証を観察する

Node標準HTTPサーバーと、C++/C#の4回のGETを使います。ブラウザキャッシュを操作する例ではなく、実際の条件付きHTTP要求と、クライアントのメモリ内に保存した本文を組み合わせる小さなモデルです。外部パッケージ、外部host、ファイル保存は使いません。

```powershell
node .\server.cjs
```

サーバーは必ず`127.0.0.1:0`へbindし、OSが割り当てた`port=`とURLを表示します。そのportを別ターミナルのC++またはC#クライアントへ渡します。手順は各言語のREADMEにあります。終了はCtrl+C、またはサーバー標準入力へ`stop`と入力します。受付を閉じ、残存接続は後片付け期限後に切断します。

`server.cjs`はCommonJSを明示する拡張子です。親フォルダのpackage.jsonがtype:moduleでも配布実体をそのまま実行できます。

`/resource`はUTF-8の`Cache あ\n`（10バイト）、ETag `"study-v1"`、Cache-Control `no-cache`を返します。no-cacheは保存禁止ではなく、再利用前の再検証を要求する指定です。GET/HEADだけを受け付け、200のContent-Lengthは10、304は本文とContent-Lengthを省略し、ETag・Cache-Control・Dateを返します。

If-None-Matchは単独`*`、または最大16個のentity-tagを扱います。弱い比較を行い、引用符内のcommaはtagの一部として読みます。フィールド値は最大1024文字、HTTPヘッダー全体は4096バイトに制限します。空のlist要素や末尾commaは受け付けない限定parserで、HTTP一般の完全parserではありません。要求本文、他の前提条件、Range等はこの固定会話の対象外です。

両クライアントは200→304→304→200を確認します。1回目の本文とETagを保存し、2回目は同tag、3回目は別tagとW/同tagのlist、4回目は意図的に不一致のtagを送ります。4回目はサーバー更新を再現したものではありません。各本文は4KiBを上限に読みます。

Nodeのheaders timeout 5秒・request/socket timeout 8秒、クライアント側の有限予算を設けますが、厳密な実時間の終了保証ではありません。検証条件・未確認範囲: https://sny0.com/study/practice/network/http-cache-observation.html
