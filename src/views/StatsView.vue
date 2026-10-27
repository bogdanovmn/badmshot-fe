<template>
  <div class="stats-page">
    <div class="heading">
      <h1>Статистика</h1>
      <p class="hint">
        <template v-if="activeTab === 'archive'">
          Сводная статистика по всему архиву: матчи, тренировки, время, размер и кадры.
        </template>
        <template v-else>
          Чем больше у тэга матчей, тем крупнее и ярче он выглядит.
          Наведите на тэг, чтобы увидеть точное количество.
          <template v-if="!auth.isAuthenticated">
            Войдите в систему, чтобы открыть кадры по тэгу.
          </template>
        </template>
      </p>
    </div>

    <div class="tabs" role="tablist" aria-label="Разделы статистики">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <template v-if="activeTab === 'archive'">
      <ErrorNotice v-if="archiveError" :message="archiveError" />
      <div v-else-if="archiveLoading" class="loading">Загрузка...</div>
      <section v-else-if="archiveTotals && activityStats" class="archive-panel">
        <h2>Архив</h2>
        <div class="summary">
          <div class="card">
            <span class="value">{{ archiveTotals.matches }}</span>
            <span class="caption">матчей</span>
          </div>
          <div class="card">
            <span class="value">{{ archiveTotals.trainings }}</span>
            <span class="caption">тренировок</span>
          </div>
          <div class="card">
            <span class="value">{{ formatDurationHuman(archiveTotals.durationSeconds) }}</span>
            <span class="caption">общее время</span>
          </div>
          <div class="card">
            <span class="value">{{ formatBytesHuman(archiveTotals.sizeMbytes) }}</span>
            <span class="caption">размер архива</span>
          </div>
          <div class="card">
            <span class="value">{{ archiveTotals.frames }}</span>
            <span class="caption">кадров</span>
          </div>
        </div>

        <h3 class="subheading">Активность на сайте</h3>
        <div class="summary">
          <div class="card">
            <span class="value">{{ formatCount(activityStats.users) }}</span>
            <span class="caption">пользователей</span>
          </div>
          <div class="card">
            <span class="value">{{ formatCount(activityStats.likes) }}</span>
            <span class="caption">лайков</span>
          </div>
          <div class="card">
            <span class="value">{{ formatCount(activityStats.shares) }}</span>
            <span class="caption">шарингов</span>
          </div>
          <div class="card">
            <span class="value">{{ formatCount(activityStats.views) }}</span>
            <span class="caption">просмотров</span>
          </div>
          <div class="card">
            <span class="value">{{ formatCount(activityStats.comments) }}</span>
            <span class="caption">комментариев</span>
          </div>
        </div>

        <router-link v-if="auth.isAdmin" class="detail-link" to="/archive/stats">
          Подробная статистика по годам, клубам и игрокам
        </router-link>
      </section>
    </template>

    <template v-else>
      <ErrorNotice v-if="error" :message="error" />
      <div v-else-if="loading" class="loading">Загрузка...</div>

      <section v-else-if="activeTab === 'players'" class="cloud-section">
        <h2>Игроки</h2>
        <TagCloud
          v-if="playerTags.length"
          :tags="playerTags"
          unit="матчей"
          :interactive="auth.isAuthenticated"
          @select="tag => open('players', tag, 'GAMES')"
        />
        <div v-else class="empty">Тэги не найдены.</div>
      </section>

      <section v-else-if="activeTab === 'clubs'" class="cloud-section">
        <h2>Клубы</h2>
        <TagCloud
          v-if="clubTags.length"
          :tags="clubTags"
          unit="матчей"
          :interactive="auth.isAuthenticated"
          @select="tag => open('clubs', tag, 'GAMES')"
        />
        <div v-else class="empty">Тэги не найдены.</div>
      </section>

      <section v-else-if="activeTab === 'indi'" class="cloud-section">
        <h2>Индивидуальные тренировки</h2>
        <TagCloud
          v-if="indiTags.length"
          :tags="indiTags"
          unit="тренировок"
          :interactive="auth.isAuthenticated"
          @select="tag => open('players', tag, 'INDI')"
        />
        <div v-else class="empty">Тэги не найдены.</div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getArchiveStats,
  getClubTags,
  getErrorMessage,
  getPlayerTags,
  getSiteActivityStats
} from '@/api'
import type { ArchiveStats, ArchiveType, CatalogTag, SiteActivityStats } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'
import TagCloud from '@/components/TagCloud.vue'
import { formatBytesHuman, formatDurationHuman } from '@/common'
import { authStore } from '@/stores/auth'

type StatsTab = 'players' | 'clubs' | 'indi' | 'archive'

interface ArchiveTotals {
  matches: number
  trainings: number
  durationSeconds: number
  sizeMbytes: number
  frames: number
}

const router = useRouter()
const auth = authStore()

const tabs: { key: StatsTab; label: string }[] = [
  { key: 'players', label: 'Игроки' },
  { key: 'clubs', label: 'Клубы' },
  { key: 'indi', label: 'Индивидуальные тренировки' },
  { key: 'archive', label: 'Архив' }
]

const activeTab = ref<StatsTab>('players')
const playerTags = ref<CatalogTag[]>([])
const clubTags = ref<CatalogTag[]>([])
const indiTags = ref<CatalogTag[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const archiveStats = ref<{ games: ArchiveStats; indi: ArchiveStats } | null>(null)
const activityStats = ref<SiteActivityStats | null>(null)
const archiveLoading = ref(false)
const archiveError = ref<string | null>(null)

function formatCount(value: number): string {
  return value.toLocaleString('ru-RU')
}

const archiveTotals = computed<ArchiveTotals | null>(() => {
  if (!archiveStats.value) {
    return null
  }
  const games = archiveStats.value.games
  const indi = archiveStats.value.indi
  return {
    matches: games.matches,
    trainings: indi.matches,
    durationSeconds: games.durationSeconds + indi.durationSeconds,
    sizeMbytes: games.sizeMbytes + indi.sizeMbytes,
    frames: games.screenshotCount + indi.screenshotCount
  }
})

function sorted(tags: CatalogTag[]): CatalogTag[] {
  return [...tags].sort((left, right) => left.label.localeCompare(right.label, 'ru'))
}

async function loadClouds() {
  loading.value = true
  error.value = null
  try {
    const [players, clubs, indi] = await Promise.all([
      getPlayerTags('GAMES'),
      getClubTags('GAMES'),
      getPlayerTags('INDI')
    ])
    playerTags.value = sorted(players)
    clubTags.value = sorted(clubs)
    indiTags.value = sorted(indi)
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить тэги')
  } finally {
    loading.value = false
  }
}

async function loadArchive() {
  if (archiveStats.value || archiveLoading.value) {
    return
  }
  archiveLoading.value = true
  archiveError.value = null
  try {
    const [games, indi, activity] = await Promise.all([
      getArchiveStats('GAMES'),
      getArchiveStats('INDI'),
      getSiteActivityStats()
    ])
    archiveStats.value = { games, indi }
    activityStats.value = activity
  } catch (e) {
    archiveError.value = getErrorMessage(e, 'Не удалось загрузить статистику архива')
  } finally {
    archiveLoading.value = false
  }
}

function selectTab(tab: StatsTab) {
  if (tab === activeTab.value) {
    return
  }
  activeTab.value = tab
  if (tab === 'archive') {
    void loadArchive()
  }
}

function open(kind: 'players' | 'clubs', tag: CatalogTag, type: ArchiveType) {
  if (!auth.isAuthenticated) {
    return
  }
  const query: Record<string, string> = { [kind]: tag.id }
  if (type === 'INDI') {
    query.indi = '1'
  }
  router.push({ path: '/explore', query })
}

onMounted(() => {
  auth.update()
  void loadClouds()
})
</script>

<style scoped>
.stats-page {
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

.archive-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.archive-panel h2 {
  font-size: 1.1rem;
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 1rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
}

.value {
  font-size: 1.35rem;
  font-weight: 700;
  text-align: center;
}

.caption {
  color: var(--color-muted);
  font-size: 0.8rem;
  text-align: center;
}

.subheading {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-row-border);
  font-size: 1rem;
}

.detail-link {
  align-self: flex-start;
  color: var(--color-primary);
  font-size: 0.9rem;
  text-decoration: none;
}

.detail-link:hover {
  text-decoration: underline;
}

.loading,
.empty {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--color-muted);
}

.empty {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
