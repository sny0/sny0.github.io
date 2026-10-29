# tu_demo — 翻訳単位・ヘッダー・リンクの実験場

docs/06_cpp_internals/02〜04 と docs/08_build_system の演習用マルチファイル構成。

## ビルド(手動: 各段階を体験する)

```
g++ -std=c++2a -Wall -Wextra -c enemy.cpp -o enemy.o
g++ -std=c++2a -Wall -Wextra -c radar.cpp -o radar.o
g++ -std=c++2a -Wall -Wextra -c main.cpp  -o main.o
g++ main.o enemy.o radar.o -o tu_demo.exe
./tu_demo.exe
```

## 実験メニュー

1. `nm enemy.o` でシンボル表を見る(提供=T、要求=U)。`c++filt`で修飾名を復元
2. enemy.cpp をリンク対象から外す → **未解決外部シンボル**の再現
3. enemy.h の `Description()` から `inline` を外す → **多重定義**の再現
4. radar.h の `#include "enemy.h"` を前方宣言に置き換える実験(現状は前方宣言版)
5. `ar rcs libenemy.a enemy.o` → `g++ main.o radar.o -L. -lenemy` で静的ライブラリ体験
