export const sections = [
  { id: 'reference', title: '技術辞典', action: '調べる', url: '/', description: '用語、仕組み、内部動作を、分野と名前から調べる。' },
  { id: 'learning', title: '学習ガイド', action: '順番に学ぶ', url: '/learn/', description: '前提知識と読む順番を選び、辞典の解説へ進む。' },
  { id: 'practice', title: '実践・サンプル', action: '作る・試す', url: '/practice/', description: '制作手順、コード例、演習を通して確かめる。' }
]

export const formatLabels = {
  article: '解説', glossary: '用語集', history: '技術史', references: '参考資料',
  index: '目次', path: '学習経路', tutorial: '制作手順', exercise: '演習', sample: 'サンプル'
}

export const statusLabels = { published: '公開中', outline: '学習計画・概要', draft: '草稿', planned: '執筆予定' }

export const collections = [
  { id: 'questions', section: 'learning', title: '疑問から選ぶ読み順', description: 'メモリ確保、実行、描画など、いまの疑問から関連する本文をたどる。', start: '/guide/learning-paths.html' },
  { id: 'cpp-design', section: 'learning', title: 'C++とゲーム設計を学ぶ', description: '設計原則、言語、メモリ、ビルド、エンジンとの対応を目的別に読む。', start: '/guide/cpp-roadmap.html' },
  { id: 'rendering', section: 'learning', title: 'リアルタイム描画を学ぶ', description: 'GPUと数学から、パイプライン、シェーダ、描画APIへ進む。', start: '/guide/rendering/roadmap.html' },
  { id: 'low-level', section: 'learning', title: '低レイヤからゲームの仕組みを学ぶ', description: 'CPU・メモリ・OSからゲームまでの学習計画。詳解が未整備のテーマも明示。', start: '/guide/low-level/', linear: true },
  { id: 'shooter', section: 'practice', title: '小さなシューティングを作る', description: '共通の設計を読み、C++版またはUnityのC#版で実装する。', start: '/game/shooter-design.html' },
  { id: 'renderer-project', section: 'practice', title: '小さなレンダラーを作る', description: '設計、デバイス、リソース、三角形、1フレームの構成を、主要コードの断片とともに追う。', start: '/graphics/capstone/01-design.html', linear: true },
  { id: 'cpp-exercises', section: 'practice', title: 'C++と設計の演習', description: '分野別の問題と総合演習で、判断理由と実装の理解を確かめる。', start: '/guide/exercises/' },
  { id: 'cpp-samples', section: 'practice', title: 'C++のビルドサンプル', description: '翻訳単位やCMakeの小さなコードを手元で動かす。', start: '/tools/build/samples/' },
  { id: 'design-refactoring', section: 'practice', title: '小さなアプリで設計を試す', description: '注文アプリを題材に、依存関係、テスト、リファクタリングを考える。', start: '/design/notebook/practice.html' }
]
