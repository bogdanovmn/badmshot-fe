<template>
  <figure class="frame" :class="{ 'frame--full': full, 'frame--admin': auth.isAdmin }">
    <div
      class="image-wrap"
      :class="{ 'effect-halftone': halftone, 'effect-blur': blur }"
      :style="[full ? null : aspectStyle, effectStyle]"
    >
      <div v-if="!loaded" class="placeholder">Загрузка кадра...</div>
      <img
        v-if="url"
        ref="frameImg"
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
        :class="{ visible: pixelReady && (pixelate || transitionBoost > 0.001) }"
        :style="{ filter: imageFilter }"
        aria-hidden="true"
      ></canvas>

      <div v-if="halftone" class="fx-halftone" aria-hidden="true"></div>

      <div v-if="blur" class="fx-vignette" aria-hidden="true"></div>
      <div v-if="showMeta" class="bottom-scrim" aria-hidden="true"></div>

      <div v-if="canConfigure || auth.isAdmin" class="fx-dock">
        <router-link
          v-if="auth.isAdmin"
          class="fx-btn"
          :to="`/archive/matches/${card.matchId}`"
          title="Редактировать кадр"
          aria-label="Редактировать кадр"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
        </router-link>
        <button
          v-if="canConfigure"
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
      </div>

      <div
        v-if="canConfigure && effectsOpen"
        class="fx-controls"
        :class="{ 'fx-controls--with-edit': auth.isAdmin }"
      >
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

        <div class="fx-item">
          <label class="fx-toggle">
            <input v-model="transitionEnabled" type="checkbox" />
            <span>Пиксельный переход</span>
          </label>
          <template v-if="transitionEnabled">
            <label class="fx-slider">
              <span>Задержка <em>{{ transitionDuration }} мс</em></span>
              <input v-model.number="transitionDuration" type="range" min="1000" max="8000" step="100" />
            </label>
            <label class="fx-slider">
              <span>Пикселизация <em>{{ transitionPixels }}</em></span>
              <input v-model.number="transitionPixels" type="range" min="0" max="100" step="1" />
            </label>
          </template>
        </div>

        <button
          class="fx-save"
          type="button"
          :disabled="!settingsDirty || saveState === 'saving'"
          @click="saveSettings"
        >
          {{ saveState === 'saving' ? 'Сохранение...' : 'Сохранить' }}
        </button>

        <p class="fx-hint fx-status">{{ saveStatusText }}</p>
      </div>

      <div v-if="showMeta" class="caption">
        <div v-if="card.players.length" class="players">{{ card.players.join(' · ') }}</div>
        <div class="meta-row">
          <span v-if="card.matchDate" class="date">{{ formatDate(card.matchDate) }}</span>
          <span v-if="card.clubName" class="club">{{ card.clubName }}</span>
        </div>
      </div>

      <slot name="overlay"></slot>

      <div
        v-if="showViews"
        class="views"
        :class="{ 'views--with-like': actionable && !viewsTopRight, 'views--top-right': viewsTopRight }"
        :title="`Просмотров: ${formatViews(card.views)}`"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{{ formatViews(card.views) }}</span>
      </div>

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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { FrameEffectSettings, ScreenshotCard } from '@/api'
import { screenshotImageUrl } from '@/api'
import { formatDateRu } from '@/common'
import { DEFAULT_FRAME_EFFECTS, frameEffectsStore } from '@/stores/frameEffects'
import { authStore } from '@/stores/auth'

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
  viewsTopRight?: boolean
}>(), {
  width: 640,
  showMeta: true,
  actionable: false,
  busy: false,
  full: false,
  effects: false,
  viewsTopRight: false
})

const emit = defineEmits<{ 'toggle-like': [] }>()

const auth = authStore()
const settingsStore = frameEffectsStore()

const loaded = ref(false)
const effectsOpen = ref(false)
const halftone = ref(DEFAULT_FRAME_EFFECTS.halftone)
const halftoneStrength = ref(DEFAULT_FRAME_EFFECTS.halftoneStrength)
const blur = ref(DEFAULT_FRAME_EFFECTS.blur)
const blurStrength = ref(DEFAULT_FRAME_EFFECTS.blurStrength)
const pixelate = ref(DEFAULT_FRAME_EFFECTS.pixelate)
const pixelStrength = ref(DEFAULT_FRAME_EFFECTS.pixelStrength)
const pixelColors = ref(DEFAULT_FRAME_EFFECTS.pixelColors)

const transitionEnabled = ref(DEFAULT_FRAME_EFFECTS.transitionEnabled)
const transitionDuration = ref(DEFAULT_FRAME_EFFECTS.transitionDuration)
const transitionPixels = ref(DEFAULT_FRAME_EFFECTS.transitionPixels)

const transitionBoost = ref(0)
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const settingsDirty = ref(false)

const frameImg = ref<HTMLImageElement | null>(null)
const pixelCanvas = ref<HTMLCanvasElement | null>(null)
const pixelReady = ref(false)

const canConfigure = computed(() => props.effects && auth.isAdmin)
const showViews = computed(() => props.viewsTopRight || props.card.views > 1)

const saveStatusText = computed(() => {
  if (saveState.value === 'saving') {
    return 'Сохранение...'
  }
  if (saveState.value === 'saved') {
    return 'Сохранено для всех пользователей'
  }
  if (saveState.value === 'error') {
    return 'Не удалось сохранить настройки'
  }
  if (settingsDirty.value) {
    return 'Есть несохранённые изменения'
  }
  return 'Настройки применяются ко всем пользователям'
})

let settingsReady = false

const url = ref('')
const altText = computed(() => props.card.players.join(', ') || 'Кадр из матча')

let currentObjectUrl: string | null = null
let imageVersion = 0

async function loadImage() {
  const version = ++imageVersion
  loaded.value = false
  invalidatePixelSource()
  try {
    const nextUrl = await screenshotImageUrl(
      props.card.id,
      props.full ? props.card.width : props.width
    )
    if (version !== imageVersion) {
      if (nextUrl.startsWith('blob:')) {
        URL.revokeObjectURL(nextUrl)
      }
      return
    }
    const previous = currentObjectUrl
    currentObjectUrl = nextUrl.startsWith('blob:') ? nextUrl : null
    url.value = nextUrl
    if (previous && previous !== nextUrl) {
      await nextTick()
      URL.revokeObjectURL(previous)
    }
    if (pixelate.value || transitionBoost.value > 0.001) {
      schedulePixelRender()
    } else {
      pixelReady.value = false
    }
  } catch {
    if (version === imageVersion) {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
        currentObjectUrl = null
      }
      url.value = ''
      loaded.value = true
    }
  }
}

function releaseObjectUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

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

function formatViews(value: number): string {
  return value.toLocaleString('ru-RU')
}

function applySettings(settings: FrameEffectSettings) {
  halftone.value = settings.halftone
  halftoneStrength.value = settings.halftoneStrength
  blur.value = settings.blur
  blurStrength.value = settings.blurStrength
  pixelate.value = settings.pixelate
  pixelStrength.value = settings.pixelStrength
  pixelColors.value = settings.pixelColors
  transitionEnabled.value = settings.transitionEnabled
  transitionDuration.value = settings.transitionDuration
  transitionPixels.value = settings.transitionPixels
}

function currentSettings(): FrameEffectSettings {
  return {
    halftone: halftone.value,
    halftoneStrength: halftoneStrength.value,
    blur: blur.value,
    blurStrength: blurStrength.value,
    pixelate: pixelate.value,
    pixelStrength: pixelStrength.value,
    pixelColors: pixelColors.value,
    transitionEnabled: transitionEnabled.value,
    transitionDuration: transitionDuration.value,
    transitionPixels: transitionPixels.value
  }
}

async function loadSettings() {
  const settings = await settingsStore.ensureLoaded()
  applySettings(settings)
  await nextTick()
  settingsReady = true
}

async function saveSettings() {
  if (!canConfigure.value || !settingsDirty.value || saveState.value === 'saving') {
    return
  }
  saveState.value = 'saving'
  try {
    await settingsStore.persist(currentSettings())
    settingsDirty.value = false
    saveState.value = 'saved'
  } catch {
    saveState.value = 'error'
  }
}

let pixelSource: HTMLImageElement | null = null
let pixelSourceUrl: string | null = null
let sourceVersion = 0
let renderTimer: ReturnType<typeof setTimeout> | null = null
let renderBusy = false
let renderQueued = false
let lastRenderAt = 0
let transitionRaf = 0

const transitionRunning = ref(false)

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

function basePixelBlock(): number {
  return 1 + (clamp(pixelStrength.value, 0, 100) / 100) * 31
}

function currentPixelBlock(): number {
  const base = pixelate.value ? basePixelBlock() : 1
  if (transitionBoost.value <= 0.0001) {
    return Math.max(1, Math.round(base))
  }
  const target = 1 + (clamp(transitionPixels.value, 0, 100) / 100) * 63
  return Math.max(1, Math.round(base + (target - base) * transitionBoost.value))
}

function currentPixelColors(): number {
  const base = Math.max(2, Math.round(pixelColors.value))
  if (transitionBoost.value <= 0.0001) {
    return base
  }
  const reduced = Math.round(base - (base - 2) * transitionBoost.value)
  return Math.max(2, reduced)
}

async function drawPixelCanvas(
  canvas: HTMLCanvasElement | null,
  block: number,
  colors: number,
  dither = true
): Promise<boolean> {
  if (!canvas) {
    return false
  }
  const source = await ensurePixelSource()
  if (!source) {
    return false
  }

  const width = Math.max(1, props.card.width || source.naturalWidth)
  const height = Math.max(1, props.card.height || source.naturalHeight)
  const size = Math.max(1, Math.round(block))
  const smallWidth = Math.max(1, Math.floor(width / size))
  const smallHeight = Math.max(1, Math.floor(height / size))

  const small = document.createElement('canvas')
  small.width = smallWidth
  small.height = smallHeight
  const smallContext = small.getContext('2d', { willReadFrequently: true })
  if (!smallContext) {
    return false
  }
  smallContext.imageSmoothingEnabled = true
  smallContext.drawImage(source, 0, 0, smallWidth, smallHeight)

  if (dither) {
    let pixels: ImageData
    try {
      pixels = smallContext.getImageData(0, 0, smallWidth, smallHeight)
    } catch {
      return false
    }
    applyDither(pixels, colors)
    smallContext.putImageData(pixels, 0, 0)
  }

  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    return false
  }
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  context.drawImage(small, 0, 0, smallWidth, smallHeight, 0, 0, width, height)
  return true
}

async function renderPixelArt() {
  const active = pixelate.value || transitionBoost.value > 0.001
  if (!active) {
    pixelReady.value = false
    return
  }
  const ok = await drawPixelCanvas(pixelCanvas.value, currentPixelBlock(), currentPixelColors(), pixelate.value)
  pixelReady.value = ok
}

async function runRenderLoop() {
  if (renderBusy) {
    renderQueued = true
    return
  }
  renderBusy = true
  try {
    do {
      renderQueued = false
      await renderPixelArt()
    } while (renderQueued)
  } finally {
    renderBusy = false
  }
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
    void runRenderLoop()
  }, 80)
}

function requestRender(minInterval = 55) {
  const now = performance.now()
  if (now - lastRenderAt < minInterval) {
    return
  }
  lastRenderAt = now
  void runRenderLoop()
}

function invalidatePixelSource() {
  sourceVersion++
  pixelSource = null
  pixelSourceUrl = null
}

function animateTransition(from: number, to: number, duration: number): Promise<void> {
  return new Promise(resolve => {
    const started = performance.now()
    const frame = (now: number) => {
      const t = clamp((now - started) / duration, 0, 1)
      const eased = t * t * (3 - 2 * t)
      transitionBoost.value = from + (to - from) * eased
      requestRender(33)
      if (t < 1) {
        transitionRaf = requestAnimationFrame(frame)
      } else {
        transitionRaf = 0
        transitionBoost.value = to
        resolve()
      }
    }
    transitionRaf = requestAnimationFrame(frame)
  })
}

async function waitForFrameImage(timeoutMs: number): Promise<void> {
  const started = performance.now()
  while (!loaded.value && performance.now() - started < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}

async function runTransition(swap: () => void | Promise<void>): Promise<void> {
  if (!transitionEnabled.value || transitionRunning.value || clamp(transitionPixels.value, 0, 100) <= 0) {
    await swap()
    return
  }
  transitionRunning.value = true
  const duration = clamp(Math.round(transitionDuration.value), 400, 15000)
  const half = duration / 2
  try {
    await animateTransition(0, 1, half)
    await swap()
    await nextTick()
    await waitForFrameImage(900)
    await animateTransition(1, 0, half)
  } finally {
    transitionBoost.value = 0
    transitionRunning.value = false
    if (pixelate.value) {
      schedulePixelRender()
    } else {
      pixelReady.value = false
    }
  }
}

defineExpose({ runTransition })

watch(
  [
    halftone,
    halftoneStrength,
    blur,
    blurStrength,
    pixelate,
    pixelStrength,
    pixelColors,
    transitionEnabled,
    transitionDuration,
    transitionPixels
  ],
  () => {
    if (settingsReady && canConfigure.value) {
      settingsDirty.value = true
      if (saveState.value !== 'saving') {
        saveState.value = 'idle'
      }
    }
    if (pixelate.value || transitionBoost.value > 0.001) {
      schedulePixelRender()
    } else {
      pixelReady.value = false
    }
  }
)

watch(
  () => [props.card.id, props.full ? props.card.width : props.width],
  () => {
    void loadImage()
  },
  { immediate: true }
)

onMounted(() => {
  auth.update()
  applySettings(settingsStore.settings)
  if (pixelate.value) {
    schedulePixelRender()
  }
  void loadSettings().then(() => {
    if (pixelate.value) {
      schedulePixelRender()
    }
  })
})

onBeforeUnmount(() => {
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  if (transitionRaf) {
    cancelAnimationFrame(transitionRaf)
  }
  sourceVersion++
  imageVersion++
  releaseObjectUrl()
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
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  image-rendering: pixelated;
  opacity: 0;
  transition: opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease;
}

.fx-pixel.visible {
  opacity: 1;
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
  width: 64px;
  height: 64px;
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
  width: 34px;
  height: 34px;
}

.fx-controls {
  position: absolute;
  top: calc(0.75rem + 64px + 0.45rem);
  right: 0.75rem;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(260px, calc(100vw - 1.5rem));
  max-height: calc(50% - 7rem);
  padding: 0.6rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 10px;
  background: var(--overlay-panel);
  backdrop-filter: blur(8px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.fx-controls--with-edit {
  top: calc(0.75rem + 2 * 64px + 2 * 0.45rem);
}

.fx-save {
  min-height: 34px;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 8px;
  background: var(--text-primary);
  color: var(--accent-dark);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.fx-save:disabled {
  opacity: 0.4;
  cursor: default;
}

.fx-hint {
  padding: 0 0.25rem;
  color: var(--text-secondary);
  font-size: 0.65rem;
  line-height: 1.3;
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

.views {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.65;
  pointer-events: none;
  text-shadow: 0 1px 4px var(--accent-dark);
}

.views--with-like {
  right: calc(0.75rem + 64px + 0.5rem);
}

.views svg {
  width: 20px;
  height: 20px;
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

  .frame--full .views {
    right: 2.5rem;
    bottom: 2rem;
  }

  .frame--full .views--with-like {
    right: calc(2.5rem + 64px + 0.5rem);
  }

  .fx-dock {
    top: 1.25rem;
    right: 2rem;
  }

  .fx-controls {
    top: calc(1.25rem + 64px + 0.45rem);
    right: 2rem;
  }

  .fx-controls--with-edit {
    top: calc(1.25rem + 2 * 64px + 2 * 0.45rem);
  }
}

@media (max-width: 700px) {
  .frame--full .caption {
    max-width: calc(100% - 6rem);
  }
}

.views--top-right,
.frame--full .views--top-right {
  top: 0.75rem;
  right: 0.75rem;
  bottom: auto;
  gap: 0.4rem;
  font-size: clamp(1.2rem, 2.2vw, 1.8rem);
  opacity: 0.5;
}

.views--top-right svg {
  width: clamp(24px, 3vw, 32px);
  height: clamp(24px, 3vw, 32px);
}

.frame--admin .views--top-right {
  right: calc(0.75rem + 64px + 0.5rem);
}

@media (min-width: 900px) {
  .frame--full .views--top-right {
    top: 1.25rem;
    right: 2rem;
  }

  .frame--admin.frame--full .views--top-right {
    right: calc(2rem + 64px + 0.5rem);
  }
}
</style>
