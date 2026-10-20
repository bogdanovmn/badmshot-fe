<template>
  <figure class="frame" :class="{ 'frame--full': full }">
    <div
      class="image-wrap"
      :class="{ 'effect-halftone': halftone, 'effect-blur': blur }"
      :style="[aspectStyle, effectStyle]"
    >
      <div v-if="!loaded" class="placeholder">Загрузка кадра...</div>
      <img
        :src="url"
        :alt="altText"
        loading="lazy"
        :style="{ filter: imageFilter }"
        @load="loaded = true"
        @error="loaded = true"
      />
      <canvas
        ref="pixelCanvas"
        class="fx-pixel"
        :class="{ visible: pixelate && pixelReady }"
        :style="{ filter: imageFilter }"
        aria-hidden="true"
      ></canvas>

      <div v-if="halftone" class="fx-halftone" aria-hidden="true"></div>
      <div v-if="blur" class="fx-vignette" aria-hidden="true"></div>
      <div v-if="showMeta" class="bottom-scrim" aria-hidden="true"></div>

      <div v-if="effects" class="fx-dock">
        <button
          class="fx-btn"
          type="button"
          :class="{ active: effectsOpen }"
          :title="effectsOpen ? 'Скрыть настройки эффектов' : 'Настроить эффекты'"
          aria-label="Настройки эффектов"
          @click="effectsOpen = !effectsOpen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>

        <div v-if="effectsOpen" class="fx-controls">
          <div class="fx-item">
            <label class="fx-toggle">
              <input v-model="halftone" type="checkbox" />
              <span>Газетная сетка</span>
            </label>
            <label v-if="halftone" class="fx-slider">
              <span>Сила <em>{{ halftoneStrength }}</em></span>
              <input v-model.number="halftoneStrength" type="range" min="0" max="100" step="1" />
            </label>
          </div>

          <div class="fx-item">
            <label class="fx-toggle">
              <input v-model="blur" type="checkbox" />
              <span>Кино-размытие</span>
            </label>
            <label v-if="blur" class="fx-slider">
              <span>Сила <em>{{ blurStrength }}</em></span>
              <input v-model.number="blurStrength" type="range" min="0" max="100" step="1" />
            </label>
          </div>

          <div class="fx-item">
            <label class="fx-toggle">
              <input v-model="pixelate" type="checkbox" />
              <span>Ретро-пиксели</span>
            </label>
            <label v-if="pixelate" class="fx-slider">
              <span>Пиксель <em>{{ pixelStrength }}</em></span>
              <input v-model.number="pixelStrength" type="range" min="0" max="100" step="1" />
            </label>
            <label v-if="pixelate" class="fx-slider">
              <span>Цвета <em>{{ pixelColors }}</em></span>
              <input v-model.number="pixelColors" type="range" min="2" max="16" step="1" />
            </label>
          </div>
        </div>
      </div>

      <div v-if="showMeta" class="caption">
        <div v-if="card.players.length" class="players">{{ card.players.join(' · ') }}</div>
        <div class="meta-row">
          <span v-if="card.matchDate" class="date">{{ formatDate(card.matchDate) }}</span>
          <span v-if="card.clubName" class="club">{{ card.clubName }}</span>
        </div>
      </div>

      <slot name="overlay"></slot>

      <button
        v-if="actionable"
        class="like-btn"
        :class="{ active: card.liked }"
        :disabled="busy"
        :title="card.liked ? 'Убрать из любимых' : 'В любимые'"
        :aria-label="card.liked ? 'Убрать из любимых' : 'В любимые'"
        @click="emit('toggle-like')"
      >
        <svg viewBox="0 0 24 24" :fill="card.liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { ScreenshotCard } from '@/api'
import { screenshotUrl } from '@/api'
import { formatDateRu } from '@/common'

const EFFECTS_STORAGE_KEY = 'badmshot.frameEffects.v2'

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
]

const props = withDefaults(defineProps<{
  card: ScreenshotCard
  width?: number
  showMeta?: boolean
  actionable?: boolean
  busy?: boolean
  full?: boolean
  effects?: boolean
}>(), {
  width: 640,
  showMeta: true,
  actionable: false,
  busy: false,
  full: false,
  effects: false
})

const emit = defineEmits<{ 'toggle-like': [] }>()

const loaded = ref(false)
const effectsOpen = ref(false)
const halftone = ref(true)
const halftoneStrength = ref(3)
const blur = ref(true)
const blurStrength = ref(0)
const pixelate = ref(true)
const pixelStrength = ref(0)
const pixelColors = ref(10)

const pixelCanvas = ref<HTMLCanvasElement | null>(null)
const pixelReady = ref(false)

const url = computed(() => screenshotUrl(props.card.id, props.full ? 1920 : props.width))
const altText = computed(() => props.card.players.join(', ') || 'Кадр из матча')

const aspectStyle = computed<CSSProperties>(() => ({
  aspectRatio: `${props.card.width} / ${props.card.height}`
}))

const effectStyle = computed<CSSProperties>(() => {
  const strength = clamp(halftoneStrength.value, 0, 100) / 100
  const step = 3 + strength * 8
  return {
    '--halftone-step': `${step.toFixed(1)}px`,
    '--halftone-dot': `${(step * 0.34).toFixed(2)}px`,
    '--halftone-opacity': `${(0.25 + strength * 0.55).toFixed(2)}`,
    '--blur-scale': `${(1.005 + (clamp(blurStrength.value, 0, 100) / 100) * 0.035).toFixed(3)}`
  } as CSSProperties
})

const imageFilter = computed(() => {
  const parts: string[] = []
  if (halftone.value) {
    const strength = clamp(halftoneStrength.value, 0, 100) / 100
    parts.push(
      `grayscale(${(0.35 + strength * 0.65).toFixed(2)})`,
      `contrast(${(1 + strength * 0.45).toFixed(2)})`
    )
  }
  if (blur.value) {
    const strength = clamp(blurStrength.value, 0, 100) / 100
    parts.push(
      `blur(${(strength * 7).toFixed(2)}px)`,
      `saturate(${(1 + strength * 0.3).toFixed(2)})`,
      `brightness(${(1 - strength * 0.12).toFixed(2)})`
    )
  }
  return parts.length ? parts.join(' ') : 'none'
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatDate(value: string): string {
  return formatDateRu(value)
}

function applyDefaults() {
  halftone.value = true
  halftoneStrength.value = 3
  blur.value = true
  blurStrength.value = 0
  pixelate.value = true
  pixelStrength.value = 0
  pixelColors.value = 10
}

function loadEffects() {
  try {
    const saved = JSON.parse(localStorage.getItem(EFFECTS_STORAGE_KEY) || 'null')
    if (!saved) {
      applyDefaults()
      return
    }
    halftone.value = Boolean(saved.halftone)
    halftoneStrength.value = numberOr(saved.halftoneStrength, 3)
    blur.value = Boolean(saved.blur)
    blurStrength.value = numberOr(saved.blurStrength, 0)
    pixelate.value = Boolean(saved.pixelate)
    pixelStrength.value = numberOr(saved.pixelStrength, 0)
    pixelColors.value = numberOr(saved.pixelColors, 10)
  } catch {
    applyDefaults()
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function saveEffects() {
  try {
    localStorage.setItem(EFFECTS_STORAGE_KEY, JSON.stringify({
      halftone: halftone.value,
      halftoneStrength: halftoneStrength.value,
      blur: blur.value,
      blurStrength: blurStrength.value,
      pixelate: pixelate.value,
      pixelStrength: pixelStrength.value,
      pixelColors: pixelColors.value
    }))
  } catch {
    // ignore storage errors
  }
}

let pixelSource: HTMLImageElement | null = null
let pixelSourceUrl: string | null = null
let sourceVersion = 0
let renderTimer: ReturnType<typeof setTimeout> | null = null

async function ensurePixelSource(): Promise<HTMLImageElement | null> {
  if (pixelSource && pixelSourceUrl === url.value) {
    return pixelSource
  }
  const version = ++sourceVersion
  const image = new Image()
  image.crossOrigin = 'anonymous'
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('image load failed'))
      image.src = url.value
    })
  } catch {
    return null
  }
  if (version !== sourceVersion) {
    return null
  }
  pixelSource = image
  pixelSourceUrl = url.value
  return image
}

async function renderPixelArt() {
  if (!pixelate.value) {
    pixelReady.value = false
    return
  }
  const source = await ensurePixelSource()
  const canvas = pixelCanvas.value
  if (!source || !canvas) {
    return
  }

  const width = Math.max(1, props.card.width || source.naturalWidth)
  const height = Math.max(1, props.card.height || source.naturalHeight)
  const block = Math.max(1, Math.round(1 + (clamp(pixelStrength.value, 0, 100) / 100) * 31))
  const smallWidth = Math.max(1, Math.floor(width / block))
  const smallHeight = Math.max(1, Math.floor(height / block))

  const small = document.createElement('canvas')
  small.width = smallWidth
  small.height = smallHeight
  const smallContext = small.getContext('2d', { willReadFrequently: true })
  if (!smallContext) {
    return
  }
  smallContext.imageSmoothingEnabled = true
  smallContext.drawImage(source, 0, 0, smallWidth, smallHeight)

  let pixels: ImageData
  try {
    pixels = smallContext.getImageData(0, 0, smallWidth, smallHeight)
  } catch {
    pixelReady.value = false
    return
  }
  applyDither(pixels, pixelColors.value)
  smallContext.putImageData(pixels, 0, 0)

  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  context.drawImage(small, 0, 0, smallWidth, smallHeight, 0, 0, width, height)
  pixelReady.value = true
}

function applyDither(image: ImageData, colors: number) {
  const data = image.data
  const levels = Math.max(2, Math.round(colors))
  const step = 255 / (levels - 1)
  const width = image.width
  const height = image.height
  for (let y = 0; y < height; y++) {
    const row = BAYER[y % 4]
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const threshold = (row[x % 4] / 16 - 0.5) * step
      for (let channel = 0; channel < 3; channel++) {
        const value = data[index + channel] + threshold
        data[index + channel] = Math.max(0, Math.min(255, Math.round(value / step) * step))
      }
      data[index + 3] = 255
    }
  }
}

function schedulePixelRender() {
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  renderTimer = setTimeout(() => {
    void renderPixelArt()
  }, 80)
}

function invalidatePixelSource() {
  sourceVersion++
  pixelSource = null
  pixelSourceUrl = null
  pixelReady.value = false
}

watch(
  [halftone, halftoneStrength, blur, blurStrength, pixelate, pixelStrength, pixelColors],
  () => {
    saveEffects()
    if (pixelate.value) {
      schedulePixelRender()
    } else {
      pixelReady.value = false
    }
  }
)

watch(
  () => props.card.id,
  () => {
    loaded.value = false
    invalidatePixelSource()
    if (pixelate.value) {
      schedulePixelRender()
    }
  }
)

onMounted(() => {
  loadEffects()
  if (pixelate.value) {
    schedulePixelRender()
  }
})

onBeforeUnmount(() => {
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  sourceVersion++
})
</script>

<style scoped>
.frame {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
  min-width: 0;
}

.frame--full {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
}

.image-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 10px;
  background: var(--color-primary-soft);
  isolation: isolate;
}

.frame--full .image-wrap {
  border-radius: 0;
  height: 100%;
  max-height: none;
  background: var(--image-bg);
}

.image-wrap img,
.fx-pixel {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.25s ease, transform 0.25s ease;
}

.frame--full .image-wrap img,
.frame--full .fx-pixel {
  object-fit: cover;
}

.fx-pixel {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  image-rendering: pixelated;
}

.fx-pixel.visible {
  display: block;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.fx-halftone {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image: radial-gradient(
    circle,
    var(--halftone-ink) var(--halftone-dot, 1px),
    transparent calc(var(--halftone-dot, 1px) + 0.6px)
  );
  background-size: var(--halftone-step, 4px) var(--halftone-step, 4px);
  mix-blend-mode: multiply;
  opacity: var(--halftone-opacity, 0.62);
}

.effect-blur img,
.effect-blur .fx-pixel {
  transform: scale(var(--blur-scale, 1.02));
}

.fx-vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 42%, var(--vignette-color) 100%);
}

.bottom-scrim {
  position: absolute;
  inset: auto 0 0 0;
  height: 42%;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    to top,
    var(--overlay-scrim-strong),
    var(--overlay-scrim-soft) 55%,
    transparent
  );
}

.fx-dock {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.45rem;
}

.fx-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--overlay-divider);
  border-radius: 50%;
  background: var(--overlay-panel);
  color: var(--text-primary);
  cursor: pointer;
  backdrop-filter: blur(6px);
}

.fx-btn:hover,
.fx-btn.active {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.fx-btn svg {
  width: 20px;
  height: 20px;
}

.fx-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(260px, calc(100vw - 1.5rem));
  padding: 0.6rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 10px;
  background: var(--overlay-panel);
  backdrop-filter: blur(8px);
}

.fx-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--overlay-divider);
}

.fx-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.fx-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.15rem 0.25rem;
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.fx-toggle input {
  accent-color: var(--text-primary);
  cursor: pointer;
}

.fx-slider {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0 0.25rem;
  color: var(--text-primary);
  font-size: 0.7rem;
}

.fx-slider span {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
}

.fx-slider em {
  font-style: normal;
  color: var(--text-primary);
  opacity: 0.8;
}

.fx-slider input[type='range'] {
  width: 100%;
  margin: 0;
  accent-color: var(--text-primary);
  cursor: pointer;
}

.caption {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  max-width: min(70%, 900px);
  color: var(--text-primary);
  text-shadow: 0 1px 4px var(--accent-dark);
}

.caption .players {
  font-size: clamp(0.9rem, 0.4vw + 0.75rem, 1.25rem);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: clamp(0.72rem, 0.3vw + 0.6rem, 0.95rem);
  color: var(--text-secondary);
}

.date {
  font-weight: 600;
  color: var(--text-primary);
}

.club {
  color: var(--text-secondary);
}

.like-btn {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 1px solid var(--overlay-divider);
  border-radius: 50%;
  cursor: pointer;
  background: var(--overlay-panel);
  color: var(--text-primary);
  backdrop-filter: blur(6px);
  transition: background-color 0.2s, color 0.2s;
}

.like-btn:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.like-btn.active {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.like-btn.active svg {
  color: var(--text-primary);
}

.like-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.like-btn svg {
  width: 34px;
  height: 34px;
}

.frame--full .caption {
  left: 1.5rem;
  bottom: 1.25rem;
}

@media (min-width: 900px) {
  .frame--full .caption {
    left: 2.5rem;
    bottom: 2rem;
  }

  .frame--full .like-btn {
    right: 2.5rem;
    bottom: 2rem;
  }

  .fx-dock {
    top: 1.25rem;
    right: 2rem;
  }
}

@media (max-width: 700px) {
  .frame--full .caption {
    max-width: calc(100% - 6rem);
  }
}
</style>
