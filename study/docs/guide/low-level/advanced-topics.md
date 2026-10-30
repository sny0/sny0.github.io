---
title: 発展編 専門テーマを選ぶ
study:
  source: IT教本
  status: outline
  summary: |-
    本編から先に調べる専門テーマと、そのための教材・演習を選ぶ学習計画・概要です。すべてを必修にせず、実装したいものや観測した問題に合わせて選びます。Rust、Linuxカーネル、ゲーム通信、オーディオなどの専用本文は未整備です。

    ## 関連する辞典本文・実践

    - [並行処理のバグ](/ru
  section: learning
  format: path
  domain: game
  collection: low-level
  order: 21
---

<div id="発展編-──-普通のゲームプログラマは学ばなくてよいが、トップを目指すなら価値が高いトピック" class="study-legacy-anchor" aria-hidden="true"></div>

# 発展編 専門テーマを選ぶ

## このページで案内すること

本編から先に調べる専門テーマと、そのための教材・演習を選ぶ**学習計画・概要**です。すべてを必修にせず、実装したいものや観測した問題に合わせて選びます。Rust、Linuxカーネル、ゲーム通信、オーディオなどの専用本文は未整備です。

## 関連する辞典本文・実践

- [並行処理のバグ](/runtime/memory/concurrency-bugs.html)、[Compute Shader](/graphics/compute/compute-shader.html)で、並行・並列処理を調べられます。
- [レイトレーシング](/graphics/lighting/raytracing.html)と[UBT・Module](/game/unreal/build-system-ubt.html)は、描画とビルドの専門テーマへ進む入口です。

本編(第0〜19章)では、ゲームを支える主要な層の関係を学ぶ。
ここから先は、担当する機能や関心に合わせて深掘りする専門テーマである。
すべてやる必要はない。**自分の目指す専門性に合わせて2〜3本選ぶ**こと。
各トピックに「誰が学ぶべきか」を明記した。

---

## A. CPU・低レイヤ系

### A-1. SIMD(SSE/AVX/NEON)
- **誰向け**: 物理・アニメ・オーディオ・数学ライブラリを書く人
- 1命令で4〜16個のfloatを処理。DirectXMath/Burstの中身。
  イントリンシクス(`_mm_mul_ps`)、シャッフル、水平演算、
  AoS→SoA変換(第3章の本当の動機)
- 教材: Intel Intrinsics Guide、Agner Fogの最適化マニュアル、
  DirectXMathのソース
- 演習: 自作Vec4/行列乗算をSSEで書き、スカラ版と計測比較

### A-2. CPUマイクロアーキテクチャ深掘り
- **誰向け**: エンジン最適化の最終責任者になりたい人
- パイプライン段数、スーパースカラ、アウトオブオーダー、
  リオーダバッファ、分岐予測器の実装、投機実行、
  ポート競合、μop、Spectre/Meltdownの原理
- 教材: Agner Fog "The microarchitecture of Intel, AMD and VIA CPUs"、
  『プロセッサを支える技術』、uops.info
- 演習: VTune/uProfでIPC・分岐ミス率・ポート使用率を読む

### A-3. ロックフリープログラミングとメモリモデル
- **誰向け**: ジョブシステム・オーディオエンジンを書く人
- C++メモリモデル(acquire/release/seq_cst)、CAS、ABA問題、
  SPSC/MPMCキュー、ヘイズポインタ
- 教材: 『C++ Concurrency in Action』、Preshing on Programmingブログ
- 演習: SPSCリングバッファを書き、TSanで検証(オーディオスレッドへの
  コマンド送信は実務でそのまま使う)

## B. コンパイラ・言語系

### B-4. LLVM
- **誰向け**: シェーダコンパイラ・スクリプト処理系・ツールチェーン担当
- IR、パス、バックエンド。Clang/DXC/Burst/IL2CPPの土台。
  「自作言語→LLVM IR→ネイティブ」の体験は視界を変える
- 教材: 公式Kaleidoscopeチュートリアル、『きつねさんでもわかるLLVM』
- 演習: Kaleidoscope完走。自作ミニ言語をJIT実行

### B-5. JITとVM・GC実装
- **誰向け**: スクリプト組み込み(Lua)・Mod対応・処理系好き
- バイトコードVM(スタック/レジスタ型)、インラインキャッシュ、
  トレーシングJIT。GCアルゴリズム(世代別・インクリメンタル・
  ムービング)── Unity/UEのGC(16,17章)の一般理論
- 教材: 『Crafting Interpreters』(無料Web・傑作)、LuaJITソース、
  『ガベージコレクション』(中村成洋ら)
- 演習: Crafting Interpretersのclox(バイトコードVM+GC)完走 →
  自作エンジンにLuaを組み込む

### B-6. Rust
- **誰向け**: 次世代エンジン・ツール開発、所有権思考を極めたい人
- 所有権・借用・ライフタイム=第6,9章の「所有権規約」を型システムで
  強制したもの。ゲームでは Bevy、各社ツール系で採用増
- 教材: The Rust Book(公式・和訳あり)、Bevyソース
- 演習: 第15章のミニECSをRustで書き直す(borrow checkerとの戦いが
  最高の所有権訓練)

## C. OS・インフラ系

### C-7. Linuxカーネル読解 / OS自作完走
- **誰向け**: サーバ・コンソールプラットフォーム担当、低レイヤ極道
- スケジューラ(CFS/EEVDF)、メモリ管理(buddy/slab)、io_uring。
  または『ゼロからのOS自作入門』完走
- 教材: 『詳解Linuxカーネル』、カーネルソース、MikanOS
- 演習: straceとftraceで自作ゲームのシステムコールを全部説明する

### C-8. コンソール開発の流儀(学べる範囲で)
- **誰向け**: 家庭用タイトルの最適化担当を目指す人
- 固定ハードの強み: 統合メモリ、明示的なコア割り当て、
  プラットフォーム固有API、TRC/ロットチェック文化、認証要件
- NDA外で学べるもの: GDC講演(各社ポストモーテム)、
  統合メモリ=第11章、SPU時代の資料(データ指向の源流として今も価値)
- 演習: 「メモリ予算表」「フレーム予算表」を自作ゲームに作る
  (コンソール開発の文化を先取りする訓練)

## D. グラフィックス発展系

### D-9. レイトレーシングとGI
- **誰向け**: レンダリングエンジニア志望
- BVH走査、DXR/Vulkan RT、デノイズ、パストレーシング理論、
  Lumen/ReSTIRの論文群
- 教材: "Ray Tracing in One Weekend"(無料・まずこれ)、PBRT(聖典)
- 演習: One Weekend三部作→DXRで三角形1枚→自作エンジンにRT影

### D-10. GPU駆動レンダリングとNanite的世界
- **誰向け**: 大規模シーン・次世代レンダラ担当
- インダイレクトドロー、GPUカリング、メッシュレット、
  バインドレス、Naniteの仕組み(SIGGRAPH講演)
- 教材: SIGGRAPH Advances in Real-Time Rendering、Naniteの
  "A Deep Dive into Nanite" 講演、vkguideのGPU-driven章
- 演習: コンピュートシェーダでフラスタムカリング→
  ExecuteIndirectで10万オブジェクト描画

### D-11. コンピュートシェーダとGPGPU
- **誰向け**: エフェクト・シミュレーション・AI推論をGPUでやる人
- スレッドグループ、共有メモリ、リダクション、prefix sum、
  パーティクル/流体/クロスシミュレーション
- 教材: CUDAプログラミングガイド(概念習得に最適)、
  各種compute shaderチュートリアル
- 演習: GPUパーティクル100万個(更新も描画もGPU)

## E. ゲームシステム発展系

### E-12. 物理エンジン自作
- **誰向け**: 物理・キャラクタ挙動の専門家志望
- 積分器(semi-implicit Euler)、broadphase(SAP/BVH)、
  narrowphase(GJK/EPA)、拘束ソルバ(sequential impulse)、
  スタッキングの安定化
- 教材: Box2Dソース+Erin Cattoの GDC講演群(全部公開)、
  "Game Physics Engine Development"
- 演習: 2D剛体エンジン(円と箱、衝突応答、スタック)を自作 →
  Box2Dと比較読解

### E-13. ネットワーク(マルチプレイヤー)
- **誰向け**: オンラインゲーム担当(現代ではほぼ必修に近い)
- TCP/UDP、クライアントサーバ/P2P、予測と補間、ラグ補償、
  スナップショット圧縮、**決定性ロールバック**(GGPO、第14章の延長)、
  UEのレプリケーション内部
- 教材: Gaffer On Games(無料・必読)、"Multiplayer Game Programming"、
  GGPO/Photon/UE Replicationソース
- 演習: UDPで2人対戦Pong(予測・補間・ロールバック付き)

### E-14. オーディオプログラミング
- **誰向け**: サウンドプログラマ志望(希少価値が高い)
- サンプリング定理、ミキシング、リングバッファとレイテンシ(第10章回収)、
  DSP(フィルタ・リバーブ)、WASAPI/XAudio2、ミドルウェア(Wwise)の内部像
- 教材: "The Audio Programming Book"、miniaudioソース
- 演習: miniaudioで自作ミキサ(同時32音・ピッチ・3Dパン)

## F. その他

### F-15. ビルドインフラとDevOps for Games
- **誰向け**: テックリード・エンジンチーム
- 分散ビルド(IncrediBuild/FASTBuild)、CI/CD、アセットビルドファーム、
  パッチ配信、クラッシュ収集基盤(Sentry/Backtrace)
- 演習: 自作エンジンにGitHub Actionsでビルド+テスト+
  クラッシュダンプ収集を整備

### F-16. セキュリティとアンチチート
- **誰向け**: オンラインゲーム・ライブサービス担当
- メモリ改竄(Cheat Engineの原理=第6,8章)、パケット改竄、
  サーバ権威設計、難読化とその限界
- 演習: 自作ゲームをCheat Engineで自分でチートし、
  サーバ権威化で防ぐ(攻撃を知る者だけが守れる)

---

## 選び方の指針

| 目指す専門 | 推奨セット |
|---|---|
| レンダリングエンジニア | D-9, D-10, D-11 (+A-1) |
| エンジン/コアテック | A-1, A-3, B-4 or B-5, E-12 |
| ゲームプレイ/ネットワーク | E-13, B-5(スクリプト), F-16 |
| 最適化スペシャリスト | A-1, A-2, A-3, C-8 |
| ツール/パイプライン | B-4, B-6, F-15 |
| サウンド | E-14, A-1, A-3 |

**共通の助言**: 発展トピックは「本編の該当章に不安があるなら戻る」が
鉄則。基礎の複利が最も効く投資であることは、ここまで来たあなたなら
もう体感しているはずだ。
