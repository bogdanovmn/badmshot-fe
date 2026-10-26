<template>
  <div class="tags-page">
    <div class="heading">
      <h1>Статистика</h1>
      <p class="hint">
        <template v-if="auth.isAuthenticated">
          Облако тэгов: размер тэга — количество матчей. Нажмите на тэг, чтобы открыть кадры с этим игроком или клубом.
        </template>
        <template v-else>
          Облако тэгов: размер тэга — количество матчей. Войдите в систему, чтобы открыть кадры по тэгу.
        </template>
      </p>
    </div>

    <div class="tabs">
      <button
        v-for="tab in typeTabs"
        :key="tab.key"
        class="tab"
        :class="{ active: archiveType === tab.key }"
        @click="selectType(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <ErrorNotice v-if="error" :message="error" />
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
            :disabled="!auth.isAuthenticated"
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
            :disabled="!auth.isAuthenticated"
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
import { getClubTags, getErrorMessage, getPlayerTags } from '@/api'
import type { ArchiveType, CatalogTag } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'
import { authStore } from '@/stores/auth'

const router = useRouter()
const auth = authStore()
const playerTags = ref<CatalogTag[]>([])
const clubTags = ref<CatalogTag[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const archiveType = ref<ArchiveType>('GAMES')

const typeTabs: { key: ArchiveType; label: string }[] = [
  { key: 'GAMES', label: 'Игры' },
  { key: 'INDI', label: 'Индивидуальные' }
]

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
  if (!auth.isAuthenticated) {
    return
  }
  const query: Record<string, string> = { [kind]: tag.id }
  if (archiveType.value === 'INDI') {
    query.indi = '1'
  }
  router.push({ path: '/explore', query })
}

function sorted(tags: CatalogTag[]): CatalogTag[] {
  return [...tags].sort((left, right) => left.label.localeCompare(right.label, 'ru'))
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [players, clubs] = await Promise.all([
      getPlayerTags(archiveType.value),
      getClubTags(archiveType.value)
    ])
    playerTags.value = sorted(players)
    clubTags.value = sorted(clubs)
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить тэги')
  } finally {
    loading.value = false
  }
}

function selectType(type: ArchiveType) {
  if (type === archiveType.value) {
    return
  }
  archiveType.value = type
  load()
}

onMounted(() => {
  auth.update()
  load()
})
</script>

<style scoped>
.tags-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.heading {
  max-width: none;
}

.heading h1 {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab {
  min-height: 38px;
  padding: 0.4rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
}

.tab:hover {
  border-color: var(--color-primary);
}

.tab.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
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

.tag:hover:not(:disabled) {
  color: var(--color-primary-hover);
  background: var(--color-primary-soft);
}

.tag:disabled {
  cursor: default;
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
