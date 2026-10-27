<template>
  <div class="frame-sequence">
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
        <router-link class="sequence-badge" :to="config.badgeTo" :title="config.badgeTitle">
          {{ config.badgeText }}
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
        <ErrorNotice :message="error || 'Кадр не найден'" class="stage-error-notice" />
        <router-link class="stage-cta" :to="config.badgeTo">{{ config.backText }}</router-link>
      </template>
    </div>

    <div v-if="error && card" class="toast">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getCommentedScreenshots,
  getErrorMessage,
  getLikedScreenshots,
  getMyCommentedScreenshots,
  getScreenshotCard,
  likeScreenshot,
  registerScreenshotView,
  unlikeScreenshot
} from '@/api'
import type { ScreenshotCard } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'
import { topFramesStore } from '@/stores/topFrames'

type SequenceKind = 'top' | 'liked' | 'comments' | 'profile-comments'

interface SequenceConfig {
  loader: () => Promise<ScreenshotCard[]>
  routeName: string
  badgeText: string
  badgeTitle: string
  badgeTo: string
  backText: string
  loadError: string
  notFound: string
  empty: string
}

const CONFIGS: Record<SequenceKind, SequenceConfig> = {
  top: {
    loader: loadTopCards,
    routeName: 'top-frame',
    badgeText: 'Кадр из ТОПа',
    badgeTitle: 'Вернуться к ТОПу',
    badgeTo: '/top',
    backText: 'Вернуться к ТОПу',
    loadError: 'Не удалось загрузить ТОП',
    notFound: 'Этот кадр больше не входит в ТОП.',
    empty: 'В ТОПе пока нет кадров.'
  },
  liked: {
    loader: getLikedScreenshots,
    routeName: 'liked-frame',
    badgeText: 'Любимый кадр',
    badgeTitle: 'Вернуться к любимым',
    badgeTo: '/liked',
    backText: 'Вернуться к любимым',
    loadError: 'Не удалось загрузить любимые кадры',
    notFound: 'Этот кадр больше не в любимых.',
    empty: 'В любимых пока нет кадров.'
  },
  comments: {
    loader: getCommentedScreenshots,
    routeName: 'comments-frame',
    badgeText: 'Свежий комментарий',
    badgeTitle: 'Вернуться к последним комментариям',
    badgeTo: '/comments',
    backText: 'К последним комментариям',
    loadError: 'Не удалось загрузить последние комментарии',
    notFound: 'У этого кадра больше нет свежих комментариев.',
    empty: 'Комментариев пока нет.'
  },
  'profile-comments': {
    loader: getMyCommentedScreenshots,
    routeName: 'profile-comment-frame',
    badgeText: 'Мой комментарий',
    badgeTitle: 'Вернуться к моим комментариям',
    badgeTo: '/profile?tab=comments',
    backText: 'К моим комментариям',
    loadError: 'Не удалось загрузить мои комментарии',
    notFound: 'Вы больше не комментировали этот кадр.',
    empty: 'Вы пока не оставляли комментариев.'
  }
}

const route = useRoute()
const router = useRouter()
const topFrames = topFramesStore()

const frameRef = ref<InstanceType<typeof ScreenshotFrame> | null>(null)
const cards = ref<ScreenshotCard[]>([])
const index = ref(-1)
const loading = ref(true)
const liking = ref(false)
const transitioning = ref(false)
const error = ref<string | null>(null)

let likeVersion = 0
let likedRequest = 0

/**
 * ТОП уже загружен списком на странице /top, повторно его не запрашиваем.
 * Персональный флаг `liked` в ответе ТОПа отсутствует — его добираем для текущего кадра.
 */
function loadTopCards(): Promise<ScreenshotCard[]> {
  return topFrames.ensureLoaded()
    .then(items => items.map(item => ({ ...item, liked: false })))
}

const kind = computed<SequenceKind>(() => {
  const sequence = route.meta.sequence
  if (sequence === 'liked' || sequence === 'comments' || sequence === 'profile-comments') {
    return sequence
  }
  return 'top'
})
const config = computed(() => CONFIGS[kind.value])
const card = computed<ScreenshotCard | null>(() => cards.value[index.value] ?? null)
const canPrev = computed(() => index.value > 0)
const canNext = computed(() => index.value >= 0 && index.value < cards.value.length - 1)

async function load() {
  loading.value = true
  error.value = null
  try {
    cards.value = await config.value.loader()
    const frameId = typeof route.params.id === 'string' ? route.params.id : ''
    const position = cards.value.findIndex(item => item.id === frameId)
    if (position < 0) {
      index.value = -1
      error.value = cards.value.length ? config.value.notFound : config.value.empty
    } else {
      index.value = position
    }
  } catch (e) {
    error.value = getErrorMessage(e, config.value.loadError)
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
  await router.replace({ name: config.value.routeName, params: { id: nextCard.id } })
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
  likeVersion += 1
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
    // Счётчики в ТОПе изменились — при следующем заходе список перечитаем.
    topFrames.invalidate()
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
  () => route.meta.sequence,
  () => {
    cards.value = []
    index.value = -1
    void load()
  }
)

watch(
  () => card.value?.id,
  id => {
    if (!id) {
      return
    }
    void registerScreenshotView(id)
    if (kind.value === 'top') {
      void refreshLiked(id)
    }
  }
)

/**
 * В ТОПе флаг `liked` не приходит (ответ общий для всех), поэтому для текущего кадра
 * запрашиваем полную карточку. Гонки с быстрыми переключениями и лайками отсекаем счётчиками.
 */
async function refreshLiked(id: string) {
  const request = ++likedRequest
  const version = likeVersion
  const sequence = kind.value
  try {
    const fresh = await getScreenshotCard(id)
    if (request !== likedRequest || version !== likeVersion || sequence !== kind.value) {
      return
    }
    const position = cards.value.findIndex(item => item.id === id)
    if (position < 0) {
      return
    }
    const current = cards.value[position]
    if (!current) {
      return
    }
    cards.value[position] = { ...current, liked: fresh.liked }
  } catch {
    // Флаг не критичен: без него сердечко просто останется неактивным.
  }
}

onMounted(load)
</script>

<style scoped>
.frame-sequence {
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

.sequence-badge {
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

.sequence-badge:hover {
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
  .sequence-badge {
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
