<template>
  <div class="page">
    <h1>ТОП кадров</h1>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="cards.length === 0" class="empty">Пока нет пролайканных кадров.</div>
    <div v-else class="grid">
      <ScreenshotFrame
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :width="480"
        :actionable="auth.isAuthenticated"
        :busy="busyId === card.id"
        @toggle-like="toggleLike(card)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { authStore } from '@/stores/auth'
import { getTopScreenshots, likeScreenshot, unlikeScreenshot } from '@/api'
import type { ScreenshotCard } from '@/api'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'

const auth = authStore()
const cards = ref<ScreenshotCard[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    cards.value = await getTopScreenshots()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить ТОП'
  } finally {
    loading.value = false
  }
}

async function toggleLike(card: ScreenshotCard) {
  if (busyId.value) {
    return
  }
  busyId.value = card.id
  const nextLiked = !card.liked
  card.liked = nextLiked
  card.likes += nextLiked ? 1 : -1
  try {
    if (nextLiked) {
      await likeScreenshot(card.id)
    } else {
      await unlikeScreenshot(card.id)
    }
  } catch (e) {
    card.liked = !nextLiked
    card.likes += nextLiked ? -1 : 1
    error.value = e instanceof Error ? e.message : 'Не удалось изменить лайк'
  } finally {
    busyId.value = null
  }
}

onMounted(() => {
  auth.update()
  load()
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h1 {
  font-size: 1.4rem;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1000px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.loading,
.empty,
.error {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--color-muted);
}

.error {
  color: var(--color-danger);
}

.empty {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
