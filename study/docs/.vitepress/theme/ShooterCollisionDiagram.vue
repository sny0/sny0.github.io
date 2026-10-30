<script setup lang="ts">
import { computed, ref } from 'vue'

const bulletRadius = 5
const enemyRadius = 16
const radiusSum = bulletRadius + enemyRadius
const drawingScale = 4
const enemyX = 350
const distance = ref(32)
const bulletX = computed(() => enemyX - distance.value * drawingScale)
const touching = computed(() => distance.value * distance.value <= radiusSum * radiusSum)
const presets = [
  { label: '離す', distance: 40 },
  { label: '接触の境界', distance: 21 },
  { label: '重ねる', distance: 12 }
]
</script>

<template>
  <figure class="shooter-collision">
    <figcaption class="shooter-collision-title">中心の距離を変えて、当たり判定を試す</figcaption>
    <p class="shooter-collision-intro">半径5の弾と半径16の敵を4倍に描いた模式図です。上下のずれを0にして、横の中心間距離だけを動かします。</p>
    <div class="shooter-collision-legend">
      <span><i class="bullet-dot" aria-hidden="true"></i>弾：半径5</span>
      <span><i class="enemy-dot" aria-hidden="true"></i>敵：半径16</span>
    </div>
    <svg viewBox="0 0 520 210" role="img" aria-labelledby="shooter-collision-title shooter-collision-description">
      <title id="shooter-collision-title">円の当たり判定：中心間距離 {{ distance }}、半径の合計21</title>
      <desc id="shooter-collision-description">金色の小さい円が弾、赤い大きい円が敵。中心間距離が21以下なら接触します。現在は{{ touching ? '接触している' : '離れている' }}状態です。</desc>
      <rect x="1" y="1" width="518" height="208" rx="12" fill="var(--vp-c-bg-soft)" />
      <line x1="70" y1="120" x2="450" y2="120" stroke="var(--vp-c-text-3)" stroke-width="1" stroke-dasharray="4 7" opacity="0.45" />
      <line :x1="bulletX" y1="46" :x2="enemyX" y2="46" stroke="currentColor" stroke-width="2" />
      <line :x1="bulletX" y1="39" :x2="bulletX" y2="53" stroke="currentColor" stroke-width="2" />
      <line :x1="enemyX" y1="39" :x2="enemyX" y2="53" stroke="currentColor" stroke-width="2" />
      <text :x="(bulletX + enemyX) / 2" y="29" text-anchor="middle" fill="currentColor" font-size="25" font-weight="600">d = {{ distance }}</text>
      <circle :cx="enemyX" cy="120" :r="enemyRadius * drawingScale" fill="#d85b4b" fill-opacity="0.18" stroke="#d85b4b" stroke-width="3" />
      <circle :cx="bulletX" cy="120" :r="bulletRadius * drawingScale" fill="#d89a22" fill-opacity="0.65" stroke="#93650b" stroke-width="3" />
      <circle :cx="enemyX" cy="120" r="4" fill="currentColor" />
      <circle :cx="bulletX" cy="120" r="4" fill="currentColor" />
    </svg>
    <label class="shooter-collision-label" for="shooter-collision-distance">中心間距離 d：{{ distance }}</label>
    <input id="shooter-collision-distance" v-model.number="distance" type="range" min="0" max="60" step="1" aria-describedby="shooter-collision-result">
    <div class="shooter-collision-presets">
      <button v-for="preset in presets" :key="preset.distance" type="button" @click="distance = preset.distance">
        {{ preset.label }} <span>d = {{ preset.distance }}</span>
      </button>
    </div>
    <p id="shooter-collision-result" class="shooter-collision-result" :class="{ 'is-touching': touching }" role="status" aria-live="polite" aria-atomic="true">
      <strong>{{ touching ? '当たる' : 'まだ当たらない' }}</strong>
      <span>{{ distance }}² {{ touching ? '≤' : '>' }} 21²</span>
    </p>
    <p class="shooter-collision-note">ちょうど21でも接触です。実装でも「未満」ではなく「以下」を使います。</p>
  </figure>
</template>

<style scoped>
.shooter-collision {
  margin: 28px 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.shooter-collision-title { font-size: 1rem; font-weight: 700; line-height: 1.7; }
.shooter-collision-intro, .shooter-collision-note { color: var(--vp-c-text-2); font-size: .85rem; line-height: 1.8; }
.shooter-collision-intro { margin: 8px 0 16px; }
.shooter-collision-legend { display: flex; flex-wrap: wrap; gap: 12px 24px; font-size: .9rem; }
.shooter-collision-legend span { display: inline-flex; align-items: center; gap: 8px; }
.shooter-collision-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
.bullet-dot { background: #d89a22; }
.enemy-dot { background: #d85b4b; }
.shooter-collision svg { display: block; width: 100%; max-width: 560px; margin: 14px auto 16px; }
.shooter-collision-label { display: block; font-size: .9rem; font-weight: 600; }
.shooter-collision input { display: block; width: 100%; height: 32px; accent-color: var(--vp-c-brand-1); cursor: pointer; }
.shooter-collision-presets { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 16px; }
.shooter-collision-presets button { flex: 1 1 100px; padding: 8px 10px; border: 1px solid var(--vp-c-border); border-radius: 6px; background: var(--vp-c-bg-soft); font-size: .85rem; line-height: 1.6; cursor: pointer; }
.shooter-collision-presets button:hover { border-color: var(--vp-c-brand-1); }
.shooter-collision-presets span { display: block; color: var(--vp-c-text-2); font-size: .75rem; }
.shooter-collision :is(input, button):focus-visible { outline: 3px solid var(--vp-c-brand-1); outline-offset: 3px; }
.shooter-collision-result { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin: 12px 0 0; padding: 12px 14px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); font-size: .95rem; }
.shooter-collision-result.is-touching { border-color: #d85b4b; }
.shooter-collision-result span { font-family: var(--vp-font-family-mono); }
.shooter-collision-note { margin: 10px 0 0; }
@media (max-width: 480px) { .shooter-collision { padding: 14px; } }
</style>
