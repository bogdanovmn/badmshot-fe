<template>
  <div class="page">
    <div class="heading-row">
      <h1>Архив</h1>
      <div class="heading-links">
        <router-link to="/archive/index-job" class="link-btn">Индексация</router-link>
        <router-link to="/archive/invalid" class="link-btn">Невалидные</router-link>
        <router-link to="/archive/stats" class="link-btn">Статистика</router-link>
      </div>
    </div>

    <div v-if="treeError" class="error">{{ treeError }}</div>
    <div v-else-if="treeLoading" class="loading">Загрузка дерева...</div>
    <div v-else class="tree">
      <div v-for="year in tree" :key="year.year" class="year">
        <div class="year-head">
          <span class="year-title">{{ year.year }}</span>
          <span class="year-meta">
            {{ year.matches }} матчей<template v-if="year.invalid"> · {{ year.invalid }} невалидных</template>
          </span>
        </div>
        <div class="months">
          <button
            class="month"
            :class="{ active: isSelected(year.year, month.month) }"
            v-for="month in year.months"
            :key="month.month"
            @click="selectMonth(year.year, month.month)"
          >
            <span class="month-name">{{ formatMonthRu(month.month) }}</span>
            <span class="month-count">{{ month.matches }}</span>
            <span v-if="month.invalid" class="month-invalid">{{ month.invalid }}</span>
          </button>
        </div>
      </div>
      <div v-if="tree.length === 0" class="empty">Архив пуст. Запустите индексацию.</div>
    </div>

    <section class="matches-section">
      <div class="matches-head">
        <h2>{{ periodTitle }}</h2>
        <button class="link-btn" @click="selectMonth(null, null)">Все матчи</button>
      </div>

      <div class="club-filter">
        <div v-if="club" class="chips">
          <button class="chip" @click="clearClub">
            {{ club.name }}<span class="chip-x">×</span>
          </button>
        </div>
        <input v-model="clubTerm" class="search" type="text" placeholder="Фильтр по клубу..." />
        <div v-if="clubOptions.length" class="options">
          <button v-for="option in clubOptions" :key="option.id" class="option" @click="pickClub(option)">
            {{ option.name }}
          </button>
        </div>
      </div>

      <div v-if="matchesError" class="error">{{ matchesError }}</div>
      <div v-else-if="matchesLoading && page.items.length === 0" class="loading">Загрузка матчей...</div>
      <div v-else-if="page.items.length === 0" class="empty">Матчей не найдено.</div>
      <template v-else>
        <div class="match-list">
          <router-link
            v-for="match in page.items"
            :key="match.id"
            class="match-card"
            :class="{ invalid: !match.valid }"
            :to="`/archive/matches/${match.id}`"
          >
            <div class="match-main">
              <span class="match-name">{{ match.fileName }}</span>
              <span class="match-players">{{ match.players.join(' · ') || '—' }}</span>
              <span v-if="match.validationError" class="match-error">{{ match.validationError }}</span>
            </div>
            <div class="match-side">
              <span v-if="match.matchDate" class="match-date">{{ match.matchDate }}</span>
              <span v-if="match.clubName" class="match-club">{{ match.clubName }}</span>
              <span class="match-size">{{ formatBytesHuman(match.sizeMbytes) }}</span>
              <span v-if="match.durationSeconds" class="match-duration">{{ formatDurationHuman(match.durationSeconds) }}</span>
            </div>
          </router-link>
        </div>
        <div class="pager">
          <span class="pager-info">Показано {{ page.items.length }} из {{ page.total }}</span>
          <button
            v-if="page.items.length < page.total"
            class="btn-secondary"
            :disabled="matchesLoading"
            @click="loadMore"
          >
            Показать ещё
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArchiveTree, getClubs, getMatches } from '@/api'
import type { ArchiveYear, Club, MatchPage } from '@/api'
import { formatBytesHuman, formatDurationHuman, formatMonthRu } from '@/common'

const LIMIT = 50

const route = useRoute()
const router = useRouter()

const tree = ref<ArchiveYear[]>([])
const treeLoading = ref(true)
const treeError = ref<string | null>(null)

const selectedYear = ref<number | null>(null)
const selectedMonth = ref<number | null>(null)
const club = ref<Club | null>(null)

const clubTerm = ref('')
const clubOptions = ref<Club[]>([])
let clubTimer: ReturnType<typeof setTimeout> | null = null

const page = ref<MatchPage>({ total: 0, items: [] })
const matchesLoading = ref(false)
const matchesError = ref<string | null>(null)

const periodTitle = computed(() => {
  if (selectedYear.value && selectedMonth.value) {
    return `${formatMonthRu(selectedMonth.value)} ${selectedYear.value}`
  }
  if (selectedYear.value) {
    return `${selectedYear.value}`
  }
  return 'Все матчи'
})

function isSelected(year: number, month: number): boolean {
  return selectedYear.value === year && selectedMonth.value === month
}

function selectMonth(year: number | null, month: number | null) {
  selectedYear.value = year
  selectedMonth.value = month
  router.replace({ query: year ? { year: String(year), ...(month ? { month: String(month) } : {}) } : {} })
}

function pickClub(option: Club) {
  club.value = option
  clubTerm.value = ''
  clubOptions.value = []
}

function clearClub() {
  club.value = null
}

async function loadTree() {
  treeLoading.value = true
  treeError.value = null
  try {
    tree.value = await getArchiveTree()
  } catch (e) {
    treeError.value = e instanceof Error ? e.message : 'Не удалось загрузить архив'
  } finally {
    treeLoading.value = false
  }
}

async function loadMatches(offset = 0) {
  matchesLoading.value = true
  matchesError.value = null
  try {
    const result = await getMatches({
      year: selectedYear.value ?? undefined,
      month: selectedMonth.value ?? undefined,
      clubId: club.value?.id,
      limit: LIMIT,
      offset
    })
    page.value = offset === 0
      ? result
      : { total: result.total, items: [...page.value.items, ...result.items] }
  } catch (e) {
    matchesError.value = e instanceof Error ? e.message : 'Не удалось загрузить матчи'
  } finally {
    matchesLoading.value = false
  }
}

function loadMore() {
  loadMatches(page.value.items.length)
}

async function loadClubOptions() {
  try {
    clubOptions.value = await getClubs({ term: clubTerm.value || undefined })
  } catch {
    clubOptions.value = []
  }
}

watch(clubTerm, () => {
  if (clubTimer) {
    clearTimeout(clubTimer)
  }
  clubTimer = setTimeout(loadClubOptions, 300)
})

watch(
  () => route.query,
  query => {
    const year = query.year ? Number(query.year) : null
    const month = query.month ? Number(query.month) : null
    if (year !== selectedYear.value || month !== selectedMonth.value) {
      selectedYear.value = year
      selectedMonth.value = month
    }
    loadMatches(0)
  }
)

watch(club, () => loadMatches(0))

onMounted(async () => {
  const year = route.query.year ? Number(route.query.year) : null
  const month = route.query.month ? Number(route.query.month) : null
  selectedYear.value = year
  selectedMonth.value = month
  await Promise.all([loadTree(), loadMatches(0)])
})

onBeforeUnmount(() => {
  if (clubTimer) {
    clearTimeout(clubTimer)
  }
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

h1 {
  font-size: 1.4rem;
}

.heading-links {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.link-btn {
  min-height: 36px;
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.link-btn:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.tree {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.year {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
}

.year-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.year-title {
  font-size: 1.15rem;
  font-weight: 700;
}

.year-meta {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.months {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.month {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}

.month:hover {
  border-color: var(--color-primary);
}

.month.active {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}

.month-count {
  font-weight: 600;
  font-size: 0.8rem;
}

.month-invalid {
  font-size: 0.75rem;
  color: var(--color-danger);
}

.month.active .month-invalid {
  color: var(--color-gold);
}

.matches-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.matches-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

h2 {
  font-size: 1.15rem;
}

.club-filter {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip,
.option {
  border-radius: 14px;
  cursor: pointer;
  font-size: 0.85rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border: none;
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.chip-x {
  font-size: 1rem;
  line-height: 1;
}

.search {
  width: 100%;
  max-width: 360px;
  min-height: 40px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.option {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
}

.option:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.match-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  text-decoration: none;
  color: var(--color-text);
}

.match-card:hover {
  border-color: var(--color-primary);
}

.match-card.invalid {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}

.match-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.match-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.match-players {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.match-error {
  color: var(--color-danger);
  font-size: 0.8rem;
}

.match-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  color: var(--color-muted);
  font-size: 0.8rem;
  white-space: nowrap;
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
  border: 1px solid var(--btn-ghost-border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--accent-dark);
  border-color: var(--text-primary);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: default;
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
