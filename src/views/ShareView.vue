<template>
  <div class="share-page">
    <ScreenshotFrame
      v-if="card"
      :card="card"
      :share-token="token"
      :width="1920"
      full
      views-top-right
      :actionable="auth.isAuthenticated"
      :busy="liking"
      @toggle-like="toggleLike"
    >
      <template #overlay>
        <router-link class="share-badge" to="/" title="Открыть Badm Shot">
          Кадр по ссылке
        </router-link>
      </template>
    </ScreenshotFrame>

    <div v-else class="stage">
      <div v-if="loading" class="stage-text">Загрузка кадра...</div>
      <template v-else>
        <ErrorNotice :message="error || 'Ссылка не найдена'" class="stage-error-notice" />
        <router-link class="stage-cta" to="/">Открыть Badm Shot</router-link>
      </template>
    </div>

    <div v-if="error && card" class="toast">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  getErrorMessage,
  getPublicSharedFrame,
  likeScreenshot,
  registerSharedFrameView,
  unlikeScreenshot
} from '@/api'
import type { PublicSharedFrame, ScreenshotCard } from '@/api'
import { authStore } from '@/stores/auth'
import ErrorNotice from '@/components/ErrorNotice.vue'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'

const route = useRoute()
const auth = authStore()
const token = computed(() => typeof route.params.token === 'string' ? route.params.token : '')
const frame = ref<PublicSharedFrame | null>(null)
const loading = ref(true)
const liking = ref(false)
const error = ref<string | null>(null)

const card = computed<ScreenshotCard | null>(() => {
  const value = frame.value
  if (!value) {
    return null
  }
  return {
    id: value.screenshotId,
    matchId: '',
    timecodeSeconds: value.timecodeSeconds,
    imageFormat: value.imageFormat,
    width: value.width,
    height: value.height,
    createdAt: value.createdAt,
    year: value.year,
    month: value.month,
    matchDate: value.matchDate,
    clubId: null,
    clubName: value.clubName,
    tournament: value.tournament,
    players: value.players,
    likes: value.likes,
    shares: value.shares,
    comments: value.comments,
    lastCommentAt: null,
    liked: value.liked,
    views: value.views
  }
})

async function toggleLike() {
  if (!frame.value || liking.value) {
    return
  }
  liking.value = true
  error.value = null
  const current = frame.value
  const nextLiked = !current.liked
  frame.value = {
    ...current,
    liked: nextLiked,
    likes: current.likes + (nextLiked ? 1 : -1)
  }
  try {
    if (nextLiked) {
      await likeScreenshot(current.screenshotId)
    } else {
      await unlikeScreenshot(current.screenshotId)
    }
  } catch (e) {
    frame.value = current
    error.value = getErrorMessage(e, 'Не удалось изменить лайк')
  } finally {
    liking.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    frame.value = await getPublicSharedFrame(token.value)
    void registerSharedFrameView(token.value).catch(() => undefined)
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось открыть кадр по ссылке')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  auth.update()
  void load()
})
</script>

<style scoped>
.share-page {
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

.share-badge {
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

.share-badge:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
  text-decoration: none;
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
  .share-badge {
    top: 1.25rem;
    left: 2rem;
  }
}
</style>
