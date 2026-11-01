<template>
  <div class="page">
    <div class="heading-row">
      <BackButton fallback="/archive" />
      <h1>Статистика архива</h1>
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
    <div v-else-if="stats" class="content">
      <section class="summary">
        <div class="card"><span class="value">{{ stats.matches }}</span><span class="caption">{{ unitLabel }}</span></div>
        <div class="card"><span class="value">{{ formatBytesHuman(stats.sizeMbytes) }}</span><span class="caption">объём</span></div>
        <div class="card"><span class="value">{{ formatDurationHuman(stats.durationSeconds) }}</span><span class="caption">продолжительность</span></div>
        <div class="card"><span class="value">{{ stats.screenshotCount }}</span><span class="caption">кадров</span></div>
        <div class="card"><span class="value">{{ formatBytesHuman(stats.screenshotSizeMbytes) }}</span><span class="caption">объём кадров</span></div>
      </section>

      <div class="tabs tabs--sections" role="tablist" aria-label="Разделы статистики">
        <button
          v-for="tab in sectionTabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeSection === tab.key }"
          role="tab"
          :aria-selected="activeSection === tab.key"
          @click="selectSection(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <section v-if="activeSection === 'periods'">
        <div class="section-head">
          <h2>По годам и месяцам</h2>
          <div v-if="stats.years.length" class="year-switch" role="group" aria-label="Год">
            <button
              v-for="year in stats.years"
              :key="year.year"
              class="year-btn"
              :class="{ active: selectedYear === year.year }"
              :title="`${year.year}: ${year.matches} ${unitLabel}`"
              @click="selectedYear = year.year"
            >
              {{ year.year }}
            </button>
          </div>
        </div>

        <div v-if="!selectedYearStat" class="empty">Данные за период не найдены.</div>
        <table v-else class="stats-table">
          <thead>
            <tr>
              <SortableTh
                label="Период"
                :active="periodSortKey === 'period'"
                :direction="periodSortDirection"
                @sort="() => togglePeriodSort('period')"
              />
              <SortableTh
                :label="unitTitle"
                numeric
                :active="periodSortKey === 'matches'"
                :direction="periodSortDirection"
                @sort="() => togglePeriodSort('matches')"
              />
              <SortableTh
                label="Размер"
                numeric
                :active="periodSortKey === 'sizeMbytes'"
                :direction="periodSortDirection"
                @sort="() => togglePeriodSort('sizeMbytes')"
              />
              <SortableTh
                label="Длительность"
                numeric
                :active="periodSortKey === 'durationSeconds'"
                :direction="periodSortDirection"
                @sort="() => togglePeriodSort('durationSeconds')"
              />
            </tr>
          </thead>
          <tbody>
            <tr class="year-row">
              <td>{{ selectedYearStat.year }}</td>
              <td class="num">{{ selectedYearStat.matches }}</td>
              <td class="num">{{ formatBytesHuman(selectedYearStat.sizeMbytes) }}</td>
              <td class="num">{{ formatDurationHuman(selectedYearStat.durationSeconds) }}</td>
            </tr>
            <tr v-for="month in sortedMonths" :key="month.month" class="month-row">
              <td>{{ formatMonthRu(month.month) }}</td>
              <td class="num">{{ month.matches }}</td>
              <td class="num">{{ formatBytesHuman(month.sizeMbytes) }}</td>
              <td class="num">{{ formatDurationHuman(month.durationSeconds) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-else-if="activeSection === 'clubs'">
        <h2>По клубам</h2>
        <div v-if="stats.clubs.length === 0" class="empty">Данные по клубам не найдены.</div>
        <table v-else class="stats-table">
          <thead>
            <tr>
              <SortableTh
                label="Клуб"
                :active="clubSortKey === 'name'"
                :direction="clubSortDirection"
                @sort="() => toggleClubSort('name')"
              />
              <SortableTh
                :label="unitTitle"
                numeric
                :active="clubSortKey === 'matches'"
                :direction="clubSortDirection"
                @sort="() => toggleClubSort('matches')"
              />
              <SortableTh
                label="Размер"
                numeric
                :active="clubSortKey === 'sizeMbytes'"
                :direction="clubSortDirection"
                @sort="() => toggleClubSort('sizeMbytes')"
              />
              <SortableTh
                label="Длительность"
                numeric
                :active="clubSortKey === 'durationSeconds'"
                :direction="clubSortDirection"
                @sort="() => toggleClubSort('durationSeconds')"
              />
            </tr>
          </thead>
          <tbody>
            <tr v-for="club in sortedClubs" :key="club.id">
              <td>{{ club.name }}</td>
              <td class="num">{{ club.matches }}</td>
              <td class="num">{{ formatBytesHuman(club.sizeMbytes) }}</td>
              <td class="num">{{ formatDurationHuman(club.durationSeconds) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-else-if="activeSection === 'players'">
        <h2>По игрокам</h2>
        <div v-if="stats.players.length === 0" class="empty">Данные по игрокам не найдены.</div>
        <table v-else class="stats-table">
          <thead>
            <tr>
              <SortableTh
                label="Игрок"
                :active="playerSortKey === 'name'"
                :direction="playerSortDirection"
                @sort="() => togglePlayerSort('name')"
              />
              <SortableTh
                :label="unitTitle"
                numeric
                :active="playerSortKey === 'matches'"
                :direction="playerSortDirection"
                @sort="() => togglePlayerSort('matches')"
              />
              <SortableTh
                label="Размер"
                numeric
                :active="playerSortKey === 'sizeMbytes'"
                :direction="playerSortDirection"
                @sort="() => togglePlayerSort('sizeMbytes')"
              />
              <SortableTh
                label="Длительность"
                numeric
                :active="playerSortKey === 'durationSeconds'"
                :direction="playerSortDirection"
                @sort="() => togglePlayerSort('durationSeconds')"
              />
            </tr>
          </thead>
          <tbody>
            <tr v-for="player in sortedPlayers" :key="player.id">
              <td>
                <span class="player-name">{{ player.name }}</span>
                <router-link
                  class="icon-link"
                  :to="{ name: 'player-dossier', params: { id: player.id } }"
                  title="Досье игрока"
                  aria-label="Досье игрока"
                >
                  <NavIcon name="player" />
                </router-link>
                <router-link
                  class="icon-link"
                  :to="{ path: '/archive', query: { playerId: player.id, type: archiveType } }"
                  title="Файлы игрока"
                  aria-label="Файлы игрока"
                >
                  <NavIcon name="files" />
                </router-link>
              </td>
              <td class="num">{{ player.matches }}</td>
              <td class="num">{{ formatBytesHuman(player.sizeMbytes) }}</td>
              <td class="num">{{ formatDurationHuman(player.durationSeconds) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getArchiveStats, getErrorMessage } from '@/api'
import type { ArchiveMonthStat, ArchiveStats, ArchiveType, CatalogStat } from '@/api'
import BackButton from '@/components/BackButton.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import NavIcon from '@/components/NavIcon.vue'
import SortableTh from '@/components/SortableTh.vue'
import { useSortable } from '@/composables/useSortable'
import { formatBytesHuman, formatDurationHuman, formatMonthRu } from '@/common'

type SectionTab = 'periods' | 'clubs' | 'players'
type PeriodSortKey = 'period' | 'matches' | 'sizeMbytes' | 'durationSeconds'
type CatalogSortKey = 'name' | 'matches' | 'sizeMbytes' | 'durationSeconds'

const stats = ref<ArchiveStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const archiveType = ref<ArchiveType>('GAMES')
const activeSection = ref<SectionTab>('periods')
const selectedYear = ref<number | null>(null)

const typeTabs: { key: ArchiveType; label: string }[] = [
  { key: 'GAMES', label: 'Игры' },
  { key: 'INDI', label: 'Индивидуальные' }
]

const unitLabel = computed(() => archiveType.value === 'INDI' ? 'тренировок' : 'матчей')
const unitTitle = computed(() => archiveType.value === 'INDI' ? 'Тренировок' : 'Матчей')

const sectionTabs = computed<{ key: SectionTab; label: string }[]>(() => {
  const tabs: { key: SectionTab; label: string }[] = [
    { key: 'periods', label: 'По годам и месяцам' }
  ]
  if (archiveType.value === 'GAMES') {
    tabs.push({ key: 'clubs', label: 'По клубам' })
  }
  tabs.push({ key: 'players', label: 'По игрокам' })
  return tabs
})

const selectedYearStat = computed(() => {
  if (!stats.value || selectedYear.value === null) {
    return null
  }
  return stats.value.years.find(year => year.year === selectedYear.value) ?? null
})

const periodMonths = computed<ArchiveMonthStat[]>(() => selectedYearStat.value?.months ?? [])
const {
  key: periodSortKey,
  direction: periodSortDirection,
  sorted: sortedMonths,
  toggle: togglePeriodSort
} = useSortable<ArchiveMonthStat, PeriodSortKey>(periodMonths, {
  period: month => month.month,
  matches: month => month.matches,
  sizeMbytes: month => month.sizeMbytes,
  durationSeconds: month => month.durationSeconds
}, { initialKey: 'period', initialDirection: 'desc' })

const clubRows = computed<CatalogStat[]>(() => stats.value?.clubs ?? [])
const {
  key: clubSortKey,
  direction: clubSortDirection,
  sorted: sortedClubs,
  toggle: toggleClubSort
} = useSortable<CatalogStat, CatalogSortKey>(clubRows, {
  name: club => club.name,
  matches: club => club.matches,
  sizeMbytes: club => club.sizeMbytes,
  durationSeconds: club => club.durationSeconds
}, { initialKey: 'matches', initialDirection: 'desc', textKeys: ['name'] })

const playerRows = computed<CatalogStat[]>(() => stats.value?.players ?? [])
const {
  key: playerSortKey,
  direction: playerSortDirection,
  sorted: sortedPlayers,
  toggle: togglePlayerSort
} = useSortable<CatalogStat, CatalogSortKey>(playerRows, {
  name: player => player.name,
  matches: player => player.matches,
  sizeMbytes: player => player.sizeMbytes,
  durationSeconds: player => player.durationSeconds
}, { initialKey: 'matches', initialDirection: 'desc', textKeys: ['name'] })

async function load() {
  loading.value = true
  error.value = null
  try {
    const value = await getArchiveStats(archiveType.value)
    stats.value = value
    if (!value.years.some(year => year.year === selectedYear.value)) {
      selectedYear.value = value.years[0]?.year ?? null
    }
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить статистику')
  } finally {
    loading.value = false
  }
}

function selectType(type: ArchiveType) {
  if (type === archiveType.value) {
    return
  }
  archiveType.value = type
  if (type === 'INDI' && activeSection.value === 'clubs') {
    activeSection.value = 'periods'
  }
  load()
}

function selectSection(section: SectionTab) {
  activeSection.value = section
}

onMounted(load)
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
  gap: 0.5rem;
}

h1 {
  font-size: 1.4rem;
}

h2 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tabs--sections {
  padding-top: 0.25rem;
  border-top: 1px solid var(--color-row-border);
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

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.value {
  font-size: 1.4rem;
  font-weight: 700;
}

.caption {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.section-head h2 {
  margin-bottom: 0;
}

.year-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.year-btn {
  min-height: 34px;
  padding: 0.25rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
}

.year-btn:hover {
  border-color: var(--color-primary);
}

.year-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.stats-table th,
.stats-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-row-border);
  text-align: left;
}

.stats-table th {
  color: var(--color-muted);
  font-weight: 600;
  font-size: 0.8rem;
}

.stats-table .num {
  text-align: right;
  white-space: nowrap;
}

.player-name {
  vertical-align: middle;
}

.icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-left: 0.35rem;
  border-radius: 6px;
  color: var(--color-primary);
  vertical-align: middle;
  text-decoration: none;
}

.icon-link:hover {
  background: var(--color-primary-soft);
  text-decoration: none;
}

.icon-link :deep(svg) {
  width: 16px;
  height: 16px;
}

.year-row {
  font-weight: 700;
  background: var(--color-primary-soft);
}

.month-row td:first-child {
  padding-left: 1.75rem;
  color: var(--color-muted);
}

.loading,
.error,
.empty {
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
