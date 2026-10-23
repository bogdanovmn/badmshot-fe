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

      <section>
        <h2>По годам и месяцам</h2>
        <table class="stats-table">
          <thead>
            <tr><th>Период</th><th class="num">{{ unitTitle }}</th><th class="num">Размер</th><th class="num">Длительность</th></tr>
          </thead>
          <tbody>
            <template v-for="year in stats.years" :key="year.year">
              <tr class="year-row">
                <td>{{ year.year }}</td>
                <td class="num">{{ year.matches }}</td>
                <td class="num">{{ formatBytesHuman(year.sizeMbytes) }}</td>
                <td class="num">{{ formatDurationHuman(year.durationSeconds) }}</td>
              </tr>
              <tr v-for="month in year.months" :key="`${year.year}-${month.month}`" class="month-row">
                <td>{{ formatMonthRu(month.month) }}</td>
                <td class="num">{{ month.matches }}</td>
                <td class="num">{{ formatBytesHuman(month.sizeMbytes) }}</td>
                <td class="num">{{ formatDurationHuman(month.durationSeconds) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </section>

      <section v-if="archiveType === 'GAMES'">
        <h2>По клубам</h2>
        <table class="stats-table">
          <thead>
            <tr><th>Клуб</th><th class="num">{{ unitTitle }}</th><th class="num">Размер</th><th class="num">Длительность</th></tr>
          </thead>
          <tbody>
            <tr v-for="club in stats.clubs" :key="club.id">
              <td>{{ club.name }}</td>
              <td class="num">{{ club.matches }}</td>
              <td class="num">{{ formatBytesHuman(club.sizeMbytes) }}</td>
              <td class="num">{{ formatDurationHuman(club.durationSeconds) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>По игрокам</h2>
        <table class="stats-table">
          <thead>
            <tr><th>Игрок</th><th class="num">{{ unitTitle }}</th><th class="num">Размер</th><th class="num">Длительность</th></tr>
          </thead>
          <tbody>
            <tr v-for="player in stats.players" :key="player.id">
              <td>
                <router-link :to="{ path: '/archive', query: { playerId: player.id } }">{{ player.name }}</router-link>
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
import type { ArchiveStats, ArchiveType } from '@/api'
import BackButton from '@/components/BackButton.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import { formatBytesHuman, formatDurationHuman, formatMonthRu } from '@/common'

const stats = ref<ArchiveStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const archiveType = ref<ArchiveType>('GAMES')

const typeTabs: { key: ArchiveType; label: string }[] = [
  { key: 'GAMES', label: 'Игры' },
  { key: 'INDI', label: 'Индивидуальные' }
]

const unitLabel = computed(() => archiveType.value === 'INDI' ? 'тренировок' : 'матчей')
const unitTitle = computed(() => archiveType.value === 'INDI' ? 'Тренировок' : 'Матчей')

async function load() {
  loading.value = true
  error.value = null
  try {
    stats.value = await getArchiveStats(archiveType.value)
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
  load()
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

.stats-table a {
  color: var(--color-primary);
  text-decoration: none;
}

.stats-table a:hover {
  text-decoration: underline;
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
.error {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-muted);
}

.error {
  color: var(--color-danger);
}
</style>
