<template>
  <div class="page">
    <h1>Любимые кадры</h1>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="cards.length === 0" class="empty">
      Вы ещё не добавили ни одного кадра в любимые.
    </div>
    <div v-else class="grid">
      <ScreenshotFrame
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :width="480"
        actionable
        :busy="busyId === card.id"
        @toggle-like="unlike(card)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getLikedScreenshots, unlikeScreenshot } from '@/api'
import type { ScreenshotCard } from '@/api'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'

const cards = ref<ScreenshotCard[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    cards.value = await getLikedScreenshots()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить любимые кадры'
  } finally {
    loading.value = false
  }
}

async function unlike(card: ScreenshotCard) {
  if (busyId.value) {
    return
  }
  busyId.value = card.id
  try {
    await unlikeScreenshot(card.id)
    cards.value = cards.value.filter(item => item.id !== card.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось убрать лайк'
  } finally {
    busyId.value = null
  }
}

onMounted(load)
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
