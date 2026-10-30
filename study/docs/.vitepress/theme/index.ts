import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import StudyCatalog from './StudyCatalog.vue'
import ArticleMeta from './ArticleMeta.vue'
import AnnualHighlights from './AnnualHighlights.vue'
import ShooterCollisionDiagram from './ShooterCollisionDiagram.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'doc-before': () => h(ArticleMeta)
  }),
  enhanceApp({ app }) {
    app.component('StudyCatalog', StudyCatalog)
    app.component('AnnualHighlights', AnnualHighlights)
    app.component('ShooterCollisionDiagram', ShooterCollisionDiagram)
  }
} satisfies Theme
