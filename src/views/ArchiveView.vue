<template>
  <div class="page">
    <div class="heading-row">
      <h1>Архив</h1>
      <div class="heading-links">
        <router-link v-if="capabilities?.indexEnabled" to="/archive/manage" class="link-btn">
          Индексация
        </router-link>
        <router-link v-if="capabilities?.importEnabled" to="/archive/import" class="link-btn">
          Импорт
        </router-link>
        <router-link to="/archive/invalid" class="link-btn">Невалидные</router-link>
        <router-link to="/archive/stats" class="link-btn">Статистика</router-link>
        <router-link to="/catalog" class="link-btn">Справочники</router-link>
      </div>
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

    <ErrorNotice v-if="treeError" :message="treeError" />
    <div v-else-if="treeLoading" class="loading">Загружаем архив...</div>
    <div v-else class="tree">
      <div v-for="year in tree" :key="year.year" class="year">
        <div class="year-head">
          <span class="year-title">{{ year.year }}</span>
          <span class="year-meta">
            {{ year.matches }} {{ unitLabel }}<template v-if="year.invalid"> · {{ year.invalid }} невалидных</template>
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

    <section class="sessions-section">
      <div class="sessions-head">
        <div class="sessions-title">
          <h2>{{ periodTitle }}</h2>
          <span v-if="playerId" class="player-filter">
            Фильтр по игроку
            <button class="link-btn link-btn--small" @click="clearPlayerFilter">Сбросить</button>
          </span>
        </div>
        <button class="link-btn" @click="selectMonth(null, null)">Последний месяц</button>
      </div>

      <div v-if="archiveType === 'GAMES'" class="club-filter">
        <label class="filter-label" for="archive-club">Клуб</label>
        <select id="archive-club" class="search" :value="club?.id ?? ''" @change="pickClubFromSelect">
          <option value="">Все клубы</option>
          <option v-for="option in clubs" :key="option.id" :value="option.id">
            {{ option.displayLabel }}
          </option>
        </select>
      </div>

      <ErrorNotice v-if="exportError" :message="exportError" />
      <ErrorNotice v-if="sessionsError" :message="sessionsError" />
      <div v-else-if="sessionsLoading && sessions.length === 0" class="loading">Загружаем сессии...</div>
      <div v-else-if="sessions.length === 0" class="empty">Сессии за этот период не найдены.</div>
      <div v-else class="session-list">
        <details
          v-for="session in sessions"
          :key="session.id"
          class="session"
          :class="{ invalid: session.invalid > 0 }"
        >
          <summary class="session-head">
            <span class="session-main">
              <span class="session-date">{{ sessionDateLabel(session) }}</span>
              <span class="session-club">{{ sessionTitle(session) }}</span>
              <span v-if="session.tournament" class="session-tournament">турнир</span>
            </span>
            <span class="session-meta">
              <span>{{ session.matches }} {{ unitLabel }}</span>
              <span>{{ formatBytesHuman(session.sizeMbytes) }}</span>
              <span v-if="session.durationSeconds">{{ formatDurationHuman(session.durationSeconds) }}</span>
              <span v-if="session.invalid" class="session-invalid">{{ session.invalid }} невалидных</span>
            </span>
            <button
              v-if="capabilities?.exportEnabled"
              class="link-btn link-btn--small"
              :disabled="exportingId === session.id || !session.exportable"
              :title="exportTitle(session)"
              @click.prevent.stop="download(session)"
            >
              {{ exportingId === session.id ? 'Экспорт...' : 'Экспорт' }}
            </button>
          </summary>

          <div class="session-files">
            <router-link
              v-for="file in session.files"
              :key="file.id"
              class="file-row"
              :class="{ invalid: file.validationError }"
              :to="`/archive/matches/${file.id}`"
            >
              <span class="file-main">
                <span class="file-players">{{ file.players.join(' / ') || 'Без игроков' }}</span>
                <span v-if="file.validationError" class="file-error">{{ file.validationError }}</span>
              </span>
              <span class="file-meta">
                <span>{{ formatBytesHuman(file.sizeMbytes) }}</span>
                <span v-if="file.durationSeconds">{{ formatDurationHuman(file.durationSeconds) }}</span>
                <span>{{ file.screenshots }} кадров</span>
              </span>
            </router-link>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  exportSession,
  getArchiveCapabilities,
  getArchiveSessions,
  getArchiveTree,
  getClubs,
  getErrorMessage
} from '@/api'
import type {
  ArchiveCapabilities,
  ArchiveSession,
  ArchiveType,
  ArchiveYear,
  Club
} from '@/api'
import { formatBytesHuman, formatDurationHuman, formatMonthRu } from '@/common'
import ErrorNotice from '@/components/ErrorNotice.vue'

const route = useRoute()
const router = useRouter()

const tree = ref<ArchiveYear[]>([])
const treeType = ref<ArchiveType | null>(null)
const treeLoading = ref(true)
const treeError = ref<string | null>(null)
const capabilities = ref<ArchiveCapabilities | null>(null)
const archiveType = ref<ArchiveType>('GAMES')

const typeTabs: { key: ArchiveType; label: string }[] = [
  { key: 'GAMES', label: 'Игры' },
  { key: 'INDI', label: 'Индивидуальные' }
]

const unitLabel = computed(() => archiveType.value === 'INDI' ? 'тренировок' : 'матчей')

const selectedYear = ref<number | null>(null)
const selectedMonth = ref<number | null>(null)
const playerId = ref<string | null>(null)
const club = ref<Club | null>(null)
const clubs = ref<Club[]>([])

const sessions = ref<ArchiveSession[]>([])
const sessionsLoading = ref(false)
const sessionsError = ref<string | null>(null)
const exportingId = ref<string | null>(null)
const exportError = ref<string | null>(null)

const periodTitle = computed(() => {
  if (selectedYear.value && selectedMonth.value) {
    return `${formatMonthRu(selectedMonth.value)} ${selectedYear.value}`
  }
  if (selectedYear.value) {
    return `${selectedYear.value}`
  }
  return 'Последний месяц'
})

function isSelected(year: number, month: number): boolean {
  return selectedYear.value === year && selectedMonth.value === month
}

function parseType(value: unknown): ArchiveType {
  return value === 'INDI' ? 'INDI' : 'GAMES'
}

function queryFor(year: number | null, month: number | null, player?: string | null, type?: ArchiveType) {
  const query: Record<string, string> = { type: type ?? archiveType.value }
  const targetPlayer = player === undefined ? playerId.value : player
  if (targetPlayer) {
    query.playerId = targetPlayer
  }
  if (year) {
    query.year = String(year)
    if (month) {
      query.month = String(month)
    }
  }
  return query
}

function selectType(type: ArchiveType) {
  if (type === archiveType.value) {
    return
  }
  router.replace({ query: { type } })
}

function selectMonth(year: number | null, month: number | null) {
  router.replace({ query: queryFor(year, month) })
}

function clearPlayerFilter() {
  router.replace({ query: queryFor(selectedYear.value, selectedMonth.value, null) })
}

function pickClubFromSelect(event: Event) {
  const select = event.target as HTMLSelectElement
  club.value = clubs.value.find(option => option.id === select.value) ?? null
}

async function loadTree() {
  const type = archiveType.value
  treeLoading.value = true
  treeError.value = null
  try {
    tree.value = await getArchiveTree(type)
    treeType.value = type
  } catch (e) {
    treeError.value = getErrorMessage(e, 'Не удалось загрузить дерево архива')
  } finally {
    treeLoading.value = false
  }
}

async function loadCapabilities() {
  try {
    capabilities.value = await getArchiveCapabilities()
  } catch {
    capabilities.value = {
      exportEnabled: false,
      importEnabled: false,
      indexEnabled: false,
      readOnly: true
    }
  }
}

async function loadSessions() {
  sessionsLoading.value = true
  sessionsError.value = null
  try {
    const result = await getArchiveSessions({
      year: selectedYear.value ?? undefined,
      month: selectedMonth.value ?? undefined,
      clubId: archiveType.value === 'GAMES' ? club.value?.id : undefined,
      playerId: playerId.value ?? undefined,
      type: archiveType.value
    })
    sessions.value = result.sessions
    if (selectedYear.value === null && result.year) {
      selectedYear.value = result.year
    }
    if (selectedMonth.value === null && result.month) {
      selectedMonth.value = result.month
    }
  } catch (e) {
    sessionsError.value = getErrorMessage(e, 'Не удалось загрузить сессии')
  } finally {
    sessionsLoading.value = false
  }
}

async function loadClubs() {
  try {
    clubs.value = archiveType.value === 'GAMES' ? await getClubs() : []
  } catch {
    clubs.value = []
  }
}

function sessionDateLabel(session: ArchiveSession): string {
  if (session.type === 'INDI') {
    return `${formatMonthRu(session.month)} ${session.year}`
  }
  return session.matchDate
}

function sessionTitle(session: ArchiveSession): string {
  if (session.type === 'INDI') {
    return 'Индивидуальные тренировки'
  }
  return session.clubName || session.club || '—'
}

function exportTitle(session: ArchiveSession): string {
  if (!session.exportable) {
    return 'Экспорт недоступен: есть невалидные матчи или нет кадров'
  }
  return `Скачать ${session.name}.zip`
}

async function download(session: ArchiveSession) {
  if (exportingId.value) {
    return
  }
  exportingId.value = session.id
  exportError.value = null
  try {
    const blob = await exportSession(session.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${session.name}.zip`
    link.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    exportError.value = getErrorMessage(e, 'Не удалось экспортировать сессию')
  } finally {
    exportingId.value = null
  }
}

async function applyRouteQuery() {
  const query = route.query
  const type = parseType(query.type)
  const typeChanged = type !== archiveType.value
  archiveType.value = type

  if (typeChanged || treeType.value !== type) {
    await loadTree()
    if (type === 'GAMES') {
      await loadClubs()
    } else {
      clubs.value = []
      club.value = null
    }
  }

  const year = query.year ? Number(query.year) : null
  const month = query.month ? Number(query.month) : null
  const queryPlayerId = typeof query.playerId === 'string' ? query.playerId : null
  const changed = typeChanged
    || year !== selectedYear.value
    || month !== selectedMonth.value
    || queryPlayerId !== playerId.value
  selectedYear.value = year
  selectedMonth.value = month
  playerId.value = queryPlayerId

  if (!year && !month) {
    const latestYear = tree.value[0]
    const latestMonth = latestYear?.months[0]
    if (latestMonth) {
      await router.replace({
        query: queryFor(latestYear.year, latestMonth.month, queryPlayerId, type)
      })
      return
    }
  }

  if (changed) {
    await loadSessions()
  }
}

watch(() => route.query, applyRouteQuery, { deep: true })

watch(club, () => loadSessions())

onMounted(async () => {
  await loadCapabilities()
  await applyRouteQuery()
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

.link-btn:hover:not(:disabled) {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.link-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.link-btn--small {
  min-height: 28px;
  padding: 0.15rem 0.55rem;
  font-size: 0.8rem;
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

.sessions-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sessions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

h2 {
  font-size: 1.15rem;
}

.sessions-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.player-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-muted);
  font-size: 0.85rem;
}

.club-filter {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-label {
  font-weight: 600;
  font-size: 0.9rem;
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
  cursor: pointer;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.session.invalid {
  border-color: var(--color-danger);
}

.session-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  flex-wrap: wrap;
}

.session-head::marker {
  color: var(--color-muted);
}

.session-main {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  min-width: 0;
  flex: 1;
}

.session-date {
  font-weight: 700;
  white-space: nowrap;
}

.session-club {
  overflow-wrap: anywhere;
}

.session-tournament {
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-muted);
  font-size: 0.8rem;
  flex-wrap: wrap;
}

.session-invalid {
  color: var(--color-danger);
}

.session-files {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border);
}

.file-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.55rem 0.9rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  text-decoration: none;
}

.file-row:last-child {
  border-bottom: none;
}

.file-row:hover {
  background: var(--color-primary-soft);
}

.file-row.invalid {
  background: var(--color-danger-soft);
}

.file-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.file-players {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.file-error {
  color: var(--color-danger);
  font-size: 0.8rem;
}

.file-meta {
  display: flex;
  gap: 0.75rem;
  color: var(--color-muted);
  font-size: 0.8rem;
  white-space: nowrap;
  flex-wrap: wrap;
  justify-content: flex-end;
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
