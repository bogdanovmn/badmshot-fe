<template>
  <div class="page">
    <header class="page-head">
      <h1>ТОП кадров</h1>
      <p class="subtitle">Сначала по лайкам, затем по комментариям и просмотрам</p>
    </header>

    <ErrorNotice v-if="error" :message="error" />
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="cards.length === 0" class="stage">
      <TvPlaceholder
        title="В ТОПе пока пусто"
        text="Здесь появятся кадры, которые лайкнули или посмотрели. Загляните в раздел «Кадры» и поставьте лайк понравившемуся."
      >
        <router-link class="stage-link" to="/explore">Перейти к кадрам</router-link>
      </TvPlaceholder>
    </div>
    <div v-else class="list">
      <FrameThumb
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :to="{ name: 'top-frame', params: { id: card.id } }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getErrorMessage, getTopScreenshots } from '@/api'
import type { ScreenshotCard } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'
import FrameThumb from '@/components/FrameThumb.vue'
import TvPlaceholder from '@/components/TvPlaceholder.vue'

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

.page-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

h1 {
  font-size: 1.4rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.stage {
  position: relative;
  min-height: min(60vh, 460px);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.stage-link {
  margin-top: 0.4rem;
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--btn-ghost-border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-weight: 600;
  text-decoration: none;
}

.stage-link:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
  text-decoration: none;
}

.loading {
  padding: 2.5rem 1rem;
  color: var(--color-muted);
  text-align: center;
}
</style>
