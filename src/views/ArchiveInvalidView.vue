<template>
  <div class="page">
    <div class="heading-row">
      <BackButton fallback="/archive" />
      <h1>Невалидные файлы</h1>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading && page.items.length === 0" class="loading">Загрузка...</div>
    <div v-else-if="page.items.length === 0" class="empty">Невалидных файлов нет.</div>
    <template v-else>
      <div class="list">
        <router-link
          v-for="match in page.items"
          :key="match.id"
          class="card"
          :to="`/archive/matches/${match.id}`"
        >
          <span class="name">{{ match.fileName }}</span>
          <span class="path">{{ match.relPath }}</span>
          <span class="reason">{{ match.validationError }}</span>
        </router-link>
      </div>
      <div class="pager">
        <span class="pager-info">Показано {{ page.items.length }} из {{ page.total }}</span>
        <button v-if="page.items.length < page.total" class="btn-secondary" :disabled="loading" @click="loadMore">
          Показать ещё
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getInvalidMatches } from '@/api'
import type { MatchPage } from '@/api'
import BackButton from '@/components/BackButton.vue'

const LIMIT = 50

const page = ref<MatchPage>({ total: 0, items: [] })
const loading = ref(true)
const error = ref<string | null>(null)

async function load(offset = 0) {
  loading.value = true
  error.value = null
  try {
    const result = await getInvalidMatches(LIMIT, offset)
    page.value = offset === 0
      ? result
      : { total: result.total, items: [...page.value.items, ...result.items] }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить список'
  } finally {
    loading.value = false
  }
}

function loadMore() {
  load(page.value.items.length)
}

onMounted(() => load(0))
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.heading-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

h1 {
  font-size: 1.4rem;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--color-danger);
  border-radius: 8px;
  background: var(--color-danger-soft);
  text-decoration: none;
  color: var(--color-text);
}

.card:hover {
  border-color: var(--color-primary);
}

.name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.path {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--color-muted);
  word-break: break-all;
}

.reason {
  color: var(--color-danger);
  font-size: 0.85rem;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pager-info {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.btn-secondary {
  min-height: 40px;
  padding: 0.5rem 1.2rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.loading,
.empty,
.error {
  text-align: center;
  padding: 2rem 1rem;
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
