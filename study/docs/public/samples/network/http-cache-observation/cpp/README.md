# C++ / WinHTTPで条件付きGETを観察する

Windows、Visual Studio 2022のC++環境、CMake 3.20以降を使います。main.cppとCMakeLists.txtを同じフォルダへ保存します。ビルド生成物は配布ソースとは分けてください。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
$cachePort = 54321 # server.cjsが表示したport値へ置き換える
.\build\Release\http_cache_observation.exe $cachePort
```

先に親フォルダの`server.cjs`を別ターミナルで起動します。54321は説明用で、固定の待受portではありません。入力は1〜65535のport一つだけで、接続先は常に`127.0.0.1`です。proxy、redirect、Cookie、自動認証を無効にします。

4回のGETで200/304/304/200、本文10/0/0/10バイト、ETagを検査します。304では最初に保存した本文を自分で再利用します。3回目のvalidatorは`"other,tag", W/"study-v1"`で、quoted commaと弱い比較を含みます。4回目の`"study-old"`は意図的不一致で、サーバーの更新ではありません。

WinHTTPは同期呼出しです。各phaseのtimeoutは最大8秒、単調時計の全体予算は30秒で、各I/O呼出しの前後に確認します。進行中のAPIをその瞬間に必ず止める厳密な実時間の保証ではありません。本文は各4KiBを上限に読み、API失敗や検査不一致は終了1、引数不正は2です。HINTERNETはRAIIで閉じます。

ブラウザの自動キャッシュを検証したコードではなく、WinHTTPによる実HTTP要求と明示的なメモリ内キャッシュのモデルです。ソース・出力はASCIIです。検証条件・未確認範囲: https://sny0.com/study/practice/network/http-cache-observation.html
