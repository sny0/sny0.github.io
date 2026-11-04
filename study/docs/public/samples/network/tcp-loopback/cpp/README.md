# Windows/C++20でTCP loopbackと半閉鎖を観察する

一つのプロセスでIPv4 `127.0.0.1:0`へlistenし、OSが割り当てたportへ自己clientを接続します。外部host・wildcard bind・固定portは使いません。

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\tcp_loopback_observation.exe
```

Windows x64、MSVC 19.35.32217.1、CMake 3.26.3、C++20 Release、`/W4 /WX /permissive- /EHsc /utf-8`で3回確認し、無警告・終了0・14 checksでした。Winsock 2.2をRAIIで開始/終了し、socketもRAIIでcloseします。

全socketをnonblockingにし、WouldBlockでは`select`のread/write＋error集合と`SO_ERROR`を使います。全phaseで一つのmonotonic絶対deadline8秒を共有し、Sleep・busy waitは使いません。resetやtimeoutはEOFへ変換せず失敗とします。

clientは2byte big-endian length付きの2frames（計14bytes）を送り、SENDを半閉鎖します。serverは本文を復元し、正のrecv要求で0を確認した後、application ACK `4F 4B 00 01`を返してSENDを半閉鎖します。clientはACK4bytesとEOFを確認します。各send/recv要求は最大3bytes、戻り値を累積します。長さ上限8、binary NUL、両方向のbytes、3socketcloseも検査します。

これは小さな単一会話を段階実行する例で、大量双方向同時通信のevent loopではありません。要求の分割やAPI回数はTCP packetの分割/個数を表しません。loopbackなので外部の物理NIC経路を観測せず、packet trace・負荷/性能測定・故意のtimeout/peer故障注入は未実施です。IPv4限定は観察範囲の固定で、一般clientへIPv6非対応を推奨するものではありません。他OS/コンパイラ・Unityは未検証です。ソースと出力はASCII、入力・ファイルI/O・外部依存取得はありません。

解説: https://sny0.com/study/practice/network/tcp-loopback-observation.html
