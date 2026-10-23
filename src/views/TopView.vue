<template>
  <div class="page">
    <h1>ТОП кадров</h1>
    <ErrorNotice v-if="error" :message="error" />
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="cards.length === 0" class="empty">Пока нет пролайканных кадров.</div>
    <div v-else class="grid">
      <ScreenshotFrame
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :width="480"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getErrorMessage, getTopScreenshots } from '@/api'
import type { ScreenshotCard } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'

const cards = ref<ScreenshotCard[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    cards.value = await getTopScreenshots()
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить ТОП')
  } finally {
    loading.value = false
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
