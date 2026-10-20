<template>
  <div class="home">
    <div class="intro">
      <h1>Случайный кадр</h1>
      <p class="hint" v-if="!auth.isAuthenticated">
        Войдите, чтобы выбирать кадры по игрокам и клубам и ставить лайки.
      </p>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!card && !error" class="loading">Загрузка...</div>

    <template v-else-if="card">
      <ScreenshotFrame
        :card="card"
        :width="1920"
        full
        effects
        :actionable="auth.isAuthenticated"
        :busy="busy"
        @toggle-like="toggleLike"
      />
      <button class="btn-secondary" :disabled="busy" @click="load">Другой кадр</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { authStore } from '@/stores/auth'
import { getRandomScreenshot, likeScreenshot, unlikeScreenshot } from '@/api'
import type { ScreenshotCard } from '@/api'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'

const REFRESH_SECONDS = 300

const auth = authStore()
const card = ref<ScreenshotCard | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

async function load() {
  error.value = null
  const current = card.value
  try {
    card.value = await getRandomScreenshot({
      excludeMatchId: current?.matchId,
      excludeClubId: current?.clubId || undefined
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить кадр'
  }
}

async function toggleLike() {
  if (!card.value || busy.value) {
    return
  }
  busy.value = true
  const current = card.value
  const nextLiked = !current.liked
  card.value = {
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
    card.value = current
    error.value = e instanceof Error ? e.message : 'Не удалось изменить лайк'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  auth.update()
  await load()
  timer = setInterval(load, REFRESH_SECONDS * 1000)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.intro {
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.hint {
  color: var(--color-muted);
}

.loading,
.error {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-muted);
}

.error {
  color: var(--color-danger);
}

.btn-secondary {
  align-self: center;
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
