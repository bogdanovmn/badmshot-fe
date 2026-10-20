<template>
  <div class="tags-page">
    <div class="heading">
      <h1>Облако тэгов</h1>
      <p class="hint">
        Размер тэга — количество матчей. Нажмите на тэг, чтобы открыть кадры с этим игроком или клубом.
      </p>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">Загрузка...</div>

    <template v-else>
      <section v-if="playerTags.length" class="cloud-section">
        <h2>Игроки</h2>
        <div class="cloud">
          <button
            v-for="tag in playerTags"
            :key="tag.id"
            class="tag"
            type="button"
            :style="tagStyle(tag, playerMax)"
            :title="`${tag.label} — матчей: ${tag.matches}`"
            @click="open('players', tag)"
          >
            {{ tag.label }}<span class="tag-count">{{ tag.matches }}</span>
          </button>
        </div>
      </section>

      <section v-if="clubTags.length" class="cloud-section">
        <h2>Клубы</h2>
        <div class="cloud">
          <button
            v-for="tag in clubTags"
            :key="tag.id"
            class="tag"
            type="button"
            :style="tagStyle(tag, clubMax)"
            :title="`${tag.label} — матчей: ${tag.matches}`"
            @click="open('clubs', tag)"
          >
            {{ tag.label }}<span class="tag-count">{{ tag.matches }}</span>
          </button>
        </div>
      </section>

      <div v-if="!playerTags.length && !clubTags.length" class="empty">Тэги пока не найдены.</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import { getClubTags, getPlayerTags } from '@/api'
import type { CatalogTag } from '@/api'

const router = useRouter()
const playerTags = ref<CatalogTag[]>([])
const clubTags = ref<CatalogTag[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const playerMax = computed(() => Math.max(1, ...playerTags.value.map(tag => tag.matches)))
const clubMax = computed(() => Math.max(1, ...clubTags.value.map(tag => tag.matches)))

function tagStyle(tag: CatalogTag, max: number): CSSProperties {
  const ratio = max > 0 ? Math.sqrt(tag.matches / max) : 0
  return {
    fontSize: `${(0.85 + ratio * 1.5).toFixed(2)}rem`,
    opacity: `${(0.68 + ratio * 0.32).toFixed(2)}`
  }
}

function open(kind: 'players' | 'clubs', tag: CatalogTag) {
  router.push({ path: '/explore', query: { [kind]: tag.id } })
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [players, clubs] = await Promise.all([getPlayerTags(), getClubTags()])
    playerTags.value = players
    clubTags.value = clubs
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить тэги'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.tags-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.heading {
  max-width: 760px;
}

.heading h1 {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.cloud-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.25rem 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.cloud-section h2 {
  font-size: 1.1rem;
}

.cloud {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.65rem;
  line-height: 1.15;
  padding: 0.5rem 0;
}

.tag {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  padding: 0.1rem 0.35rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-primary);
  font-weight: 600;
  line-height: 1.15;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.tag:hover {
  color: var(--color-primary-hover);
  background: var(--color-primary-soft);
}

.tag-count {
  font-size: 0.62em;
  font-weight: 500;
  color: var(--color-muted);
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
