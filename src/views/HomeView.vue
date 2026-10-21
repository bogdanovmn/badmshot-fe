<template>
  <div class="home">
    <ScreenshotFrame
      v-if="card"
      ref="frameRef"
      :card="card"
      :width="1920"
      full
      effects
      :actionable="auth.isAuthenticated"
      :busy="busy"
      @toggle-like="toggleLike"
    >
      <template #overlay>
        <button
          class="slider-btn prev"
          type="button"
          :disabled="!canPrev || transitioning"
          title="Предыдущий кадр"
          aria-label="Предыдущий кадр"
          @click="prev"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          class="slider-btn next"
          type="button"
          :disabled="busy || transitioning"
          title="Следующий кадр"
          aria-label="Следующий кадр"
          @click="next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </template>
    </ScreenshotFrame>

    <div v-else-if="promo" class="teaser-end">
      <div class="teaser-card">
        <h1>Badm Shot</h1>
        <p>
          Сервис показывает случайные кадры из архива матчей по бадминтону.
        </p>
        <p>
          Гостям доступно по одному случайному кадру из каждого клуба.
          Полный архив, выбор кадров по игрокам и клубам, лайки и любимые кадры
          открываются после регистрации.
        </p>
        <div class="teaser-actions">
          <button class="stage-cta" type="button" @click="login">
            Войти или зарегистрироваться
          </button>
          <button class="stage-link" type="button" @click="backToFrames">
            Вернуться к кадрам
          </button>
        </div>
      </div>
    </div>

    <div v-else class="stage">
      <div v-if="busy" class="stage-text">Загрузка кадра...</div>
      <div v-else-if="error" class="stage-text stage-error">{{ error }}</div>
      <button v-else class="stage-cta" type="button" @click="next">Показать кадр</button>
    </div>

    <div v-if="error && card" class="toast">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authStore } from '@/stores/auth'
import {
  getRandomScreenshot,
  getTeaserScreenshots,
  likeScreenshot,
  registerScreenshotView,
  unlikeScreenshot
} from '@/api'
import type { ScreenshotCard } from '@/api'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'

const auth = authStore()
const router = useRouter()

const frameRef = ref<InstanceType<typeof ScreenshotFrame> | null>(null)
const history = ref<ScreenshotCard[]>([])
const historyIndex = ref(-1)
const promo = ref(false)
const busy = ref(false)
const transitioning = ref(false)
const error = ref<string | null>(null)

const card = computed<ScreenshotCard | null>(() =>
  promo.value ? null : history.value[historyIndex.value] ?? null
)
const canPrev = computed(() => historyIndex.value > 0)

async function loadTeaser() {
  busy.value = true
  error.value = null
  try {
    const cards = await getTeaserScreenshots()
    history.value = cards
    historyIndex.value = cards.length ? 0 : -1
    if (!cards.length) {
      error.value = 'Кадры не найдены'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить кадры'
  } finally {
    busy.value = false
  }
}

async function loadNext() {
  if (busy.value) {
    return
  }
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    return
  }
  busy.value = true
  error.value = null
  try {
    const nextCard = await getRandomScreenshot()
    history.value = [...history.value, nextCard]
    historyIndex.value = history.value.length - 1
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить кадр'
  } finally {
    busy.value = false
  }
}

async function next() {
  if (busy.value || transitioning.value) {
    return
  }
  if (!auth.isAuthenticated && historyIndex.value >= history.value.length - 1) {
    promo.value = true
    return
  }
  transitioning.value = true
  try {
    if (frameRef.value) {
      await frameRef.value.runTransition(loadNext)
    } else {
      await loadNext()
    }
  } finally {
    transitioning.value = false
  }
}

function backToFrames() {
  promo.value = false
}

async function prev() {
  if (transitioning.value || historyIndex.value <= 0) {
    return
  }
  const swap = () => {
    if (historyIndex.value > 0) {
      historyIndex.value--
    }
  }
  transitioning.value = true
  try {
    if (frameRef.value) {
      await frameRef.value.runTransition(swap)
    } else {
      swap()
    }
  } finally {
    transitioning.value = false
  }
}

function login() {
  void router.push('/login')
}

async function toggleLike() {
  if (!card.value || busy.value) {
    return
  }
  busy.value = true
  const current = card.value
  const index = historyIndex.value
  const nextLiked = !current.liked
  history.value[index] = {
    ...current,
    liked: nextLiked,
    likes: current.likes + (nextLiked ? 1 : -1)
  }
  try {
    if (nextLiked) {
      await likeScreenshot(current.id)
    } else {
      await unlikeScreenshot(current.id)
    }
  } catch (e) {
    history.value[index] = current
    error.value = e instanceof Error ? e.message : 'Не удалось изменить лайк'
  } finally {
    busy.value = false
  }
}

watch(
  () => card.value?.id,
  id => {
    if (id && auth.isAuthenticated) {
      void registerScreenshotView(id)
    }
  }
)

onMounted(() => {
  auth.update()
  if (auth.isAuthenticated) {
    void loadNext()
  } else {
    void loadTeaser()
  }
})
</script>

<style scoped>
.home {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.stage {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  background: var(--image-bg);
}

.stage-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.stage-error {
  color: var(--color-danger);
  padding: 0 1rem;
  text-align: center;
}

.stage-cta {
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--btn-ghost-border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
}

.stage-cta:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.stage-link {
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
}

.stage-link:hover {
  color: var(--text-primary);
}

.teaser-end {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  padding: 2rem 1rem;
  background: var(--image-bg);
}

.teaser-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 560px;
  padding: 2rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 16px;
  background: var(--overlay-panel);
  color: var(--text-primary);
  text-align: center;
  backdrop-filter: blur(8px);
}

.teaser-card h1 {
  font-size: 1.6rem;
}

.teaser-card p {
  color: var(--text-secondary);
  line-height: 1.5;
}

.teaser-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.slider-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid var(--overlay-divider);
  border-radius: 50%;
  background: var(--overlay-panel);
  color: var(--text-primary);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background-color 0.2s, color 0.2s, opacity 0.2s;
}

.slider-btn:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.slider-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.slider-btn svg {
  width: 28px;
  height: 28px;
}

.slider-btn.prev {
  left: 0.75rem;
}

.slider-btn.next {
  right: 0.75rem;
}

.toast {
  position: fixed;
  top: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  max-width: min(90vw, 420px);
  padding: 0.6rem 1rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 8px;
  background: var(--overlay-panel);
  color: var(--text-primary);
  text-align: center;
  font-size: 0.9rem;
  backdrop-filter: blur(8px);
}

@media (min-width: 900px) {
  .slider-btn.prev {
    left: 2rem;
  }

  .slider-btn.next {
    right: 2rem;
  }
}

@media (max-width: 700px) {
  .slider-btn {
    width: 48px;
    height: 48px;
  }

  .slider-btn svg {
    width: 24px;
    height: 24px;
  }
}
</style>
