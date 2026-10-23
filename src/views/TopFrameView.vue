<template>
  <div class="top-frame">
    <ScreenshotFrame
      v-if="card"
      ref="frameRef"
      :card="card"
      :width="1920"
      full
      actionable
      views-top-right
      :busy="liking"
      @toggle-like="toggleLike"
    >
      <template #overlay>
        <router-link class="top-badge" to="/top" title="Вернуться к ТОПу">
          Кадр из ТОПа
        </router-link>

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
          :disabled="!canNext || transitioning"
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

    <div v-else class="stage">
      <div v-if="loading" class="stage-text">Загрузка кадра...</div>
      <template v-else>
        <ErrorNotice :message="error || 'Кадр не найден в ТОПе'" class="stage-error-notice" />
        <router-link class="stage-cta" to="/top">Вернуться к ТОПу</router-link>
      </template>
    </div>

    <div v-if="error && card" class="toast">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getErrorMessage,
  getTopScreenshots,
  likeScreenshot,
  registerScreenshotView,
  unlikeScreenshot
} from '@/api'
import type { ScreenshotCard } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'

const route = useRoute()
const router = useRouter()

const frameRef = ref<InstanceType<typeof ScreenshotFrame> | null>(null)
const cards = ref<ScreenshotCard[]>([])
const index = ref(-1)
const loading = ref(true)
const liking = ref(false)
const transitioning = ref(false)
const error = ref<string | null>(null)

const card = computed<ScreenshotCard | null>(() => cards.value[index.value] ?? null)
const canPrev = computed(() => index.value > 0)
const canNext = computed(() => index.value >= 0 && index.value < cards.value.length - 1)

async function load() {
  loading.value = true
  error.value = null
  try {
    cards.value = await getTopScreenshots()
    const frameId = typeof route.params.id === 'string' ? route.params.id : ''
    const position = cards.value.findIndex(item => item.id === frameId)
    if (position < 0) {
      index.value = -1
      error.value = cards.value.length
        ? 'Этот кадр больше не входит в ТОП.'
        : 'В ТОПе пока нет кадров.'
    } else {
      index.value = position
    }
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить ТОП')
  } finally {
    loading.value = false
  }
}

async function selectIndex(target: number) {
  const nextCard = cards.value[target]
  if (!nextCard) {
    return
  }
  index.value = target
  error.value = null
  await router.replace({ name: 'top-frame', params: { id: nextCard.id } })
}

async function step(delta: number) {
  if (loading.value || transitioning.value) {
    return
  }
  const target = index.value + delta
  if (target < 0 || target >= cards.value.length) {
    return
  }
  transitioning.value = true
  try {
    const swap = () => selectIndex(target)
    if (frameRef.value) {
      await frameRef.value.runTransition(swap)
    } else {
      await swap()
    }
  } finally {
    transitioning.value = false
  }
}

function next() {
  void step(1)
}

function prev() {
  void step(-1)
}

async function toggleLike() {
  if (!card.value || liking.value) {
    return
  }
  liking.value = true
  const current = card.value
  const position = index.value
  const nextLiked = !current.liked
  cards.value[position] = {
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
    cards.value[position] = current
    error.value = getErrorMessage(e, 'Не удалось изменить лайк')
  } finally {
    liking.value = false
  }
}

watch(
  () => route.params.id,
  id => {
    if (typeof id !== 'string' || !cards.value.length) {
      return
    }
    const position = cards.value.findIndex(item => item.id === id)
    if (position >= 0) {
      index.value = position
    }
  }
)

watch(
  () => card.value?.id,
  id => {
    if (id) {
      void registerScreenshotView(id)
    }
  }
)

onMounted(load)
</script>

<style scoped>
.top-frame {
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  min-height: 0;
  background: var(--image-bg);
}

.stage-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.stage-error-notice {
  max-width: min(90%, 480px);
}

.stage-cta {
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--btn-ghost-border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-weight: 600;
  text-decoration: none;
}

.stage-cta:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
  text-decoration: none;
}

.top-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 4;
  padding: 0.45rem 0.9rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 999px;
  background: var(--overlay-panel);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
  transition: background-color 0.2s, color 0.2s;
}

.top-badge:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
  text-decoration: none;
}

.slider-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
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
  width: 34px;
  height: 34px;
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
  .top-badge {
    top: 1.25rem;
    left: 2rem;
  }

  .slider-btn.prev {
    left: 2rem;
  }

  .slider-btn.next {
    right: 2rem;
  }
}
</style>
