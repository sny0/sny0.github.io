# Windows/C++20で名前解決APIの結果を観察する

defaultは`127.0.0.1`、`::1`、`localhost`をOS APIへ渡します。`--live`を指定した場合だけ、IANAの文書用ドメイン`example.com.`を追加します。外部名・名前解決サーバーを自由入力する機能はありません。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\name_resolution_observation.exe
.\build\Release\name_resolution_observation.exe --live
```

CMake 3.20以降とVisual Studio 2022のC++環境を使います。Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`でdefault/live各3回、無警告・終了0でした。他OS/コンパイラ・Unityでは未実行です。

`GetAddrInfoExW`をNS_ALLで呼び、数値IPだけAI_NUMERICHOSTを指定します。名前、hints、result、OVERLAPPED、専用manual-reset event、取消handleを完了まで保持します。pending時のイベント待機を8秒とし、必要なら`GetAddrInfoExCancel`後に利用者向けの終端完了を回収します。pTimeoutはnullptrです。結果は`FreeAddrInfoExW`、eventはCloseHandleで解放してからWSACleanupします。取消handleは通常のkernel handleではないためCloseHandleしません。

SOCK_STREAM/IPPROTO_TCPは返す接続候補の条件で、DNSをTCPで問い合わせる指定や観測ではありません。

8秒は取消要求の期限です。回収待ちを含む厳密な終了時刻や、内部の名前解決provider全停止は保証しません。専用eventの終端確認自体が壊れた場合、pending領域を巻き戻さず異常停止する防御経路があります。今回は取消・失敗・この異常経路を故意に再現していません。

数値IPは入力アドレスとfamilyの一致、localhostはloopbackを含むこと、公開名は有効なIPv4/IPv6が得られたことを検査します。公開名のIP・件数・順序は固定しません。解決失敗/取消等は報告して終了1、未知の引数は2です。

ソースと出力はASCIIです。hosts/Firewall/サーバー設定変更、cache flush、接続・HTTP・TLS処理はありません。defaultは外部名を指定しませんが、NS_ALL/OS方針を通すため、packet traceなしでネットワーク照会の有無や経路を断定しません。所要時間からcache hitを推定する例でもありません。

解説: https://sny0.com/study/practice/network/name-resolution-observation.html
