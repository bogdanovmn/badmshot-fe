<template>
  <div class="page">
    <ScreenshotImage
      v-if="backgroundId"
      class="dossier-background"
      :id="backgroundId"
      :width="1920"
      alt=""
      loading="eager"
    />

    <div class="heading-row">
      <BackButton fallback="/archive/stats" />
      <div class="heading-text">
        <h1>{{ playerLabel }}</h1>
        <p class="subtitle">Досье игрока</p>
      </div>
    </div>

    <div class="tabs" role="tablist" aria-label="Разделы досье">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :title="tab.label"
        :aria-label="tab.label"
        @click="selectTab(tab.key)"
      >
        <NavIcon :name="tab.icon" class="tab-icon" />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <ErrorNotice v-if="error" :message="error" />
    <div v-else-if="loading" class="loading">Загрузка...</div>

    <template v-else-if="dossier">
      <section v-if="activeTab === 'stats'" class="panel">
        <div v-if="statCards.length" class="summary">
          <div v-for="card in statCards" :key="card.key" class="card">
            <span class="value">{{ card.value }}</span>
            <span class="caption">{{ card.caption }}</span>
          </div>
        </div>

        <div v-if="favoritePartners.length || favoriteOpponents.length" class="favorites">
          <div v-if="favoritePartners.length" class="favorite-card">
            <h2 class="favorite-title">Любимые партнёры</h2>
            <ul class="favorite-list">
              <li v-for="partner in favoritePartners" :key="partner.id">
                <button
                  type="button"
                  class="favorite-player"
                  :title="`Открыть досье: ${partner.label}`"
                  @click="openPlayer(partner)"
                >
                  <span class="favorite-name">{{ partner.label }}</span>
                  <span class="favorite-count">{{ partner.matches }} игр</span>
                </button>
              </li>
            </ul>
          </div>
          <div v-if="favoriteOpponents.length" class="favorite-card">
            <h2 class="favorite-title">Любимые соперники</h2>
            <ul class="favorite-list">
              <li v-for="opponent in favoriteOpponents" :key="opponent.id">
                <button
                  type="button"
                  class="favorite-player"
                  :title="`Открыть досье: ${opponent.label}`"
                  @click="openPlayer(opponent)"
                >
                  <span class="favorite-name">{{ opponent.label }}</span>
                  <span class="favorite-count">{{ opponent.matches }} игр</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div class="quick-links">
          <router-link
            class="link-btn"
            :to="{ path: '/explore', query: { players: playerId } }"
          >
            <NavIcon name="frames" class="link-icon" />
            Смотреть все кадры
          </router-link>
          <router-link
            v-if="auth.isAdmin"
            class="link-btn link-btn--secondary"
            :to="{ path: '/archive', query: { playerId, type: 'GAMES' } }"
          >
            <NavIcon name="files" class="link-icon" />
            Файлы в архиве
          </router-link>
        </div>
      </section>

      <section v-else-if="activeTab === 'frames'" class="panel">
        <ErrorNotice v-if="framesError" :message="framesError" />
        <div v-else-if="framesLoading" class="loading">Загрузка кадров...</div>
        <div v-else-if="frames.length === 0" class="empty">У этого игрока пока нет кадров.</div>
        <div v-else class="frame-list">
          <FrameThumb
            v-for="card in frames"
            :key="card.id"
            :card="card"
            hide-empty-stats
            :to="{ name: 'player-dossier-frame', params: { playerId, id: card.id } }"
          />
        </div>
      </section>

      <section v-else-if="activeTab === 'clubs'" class="panel">
        <div v-if="clubYearGroups.length === 0" class="empty">Клубы не найдены.</div>
        <table v-else class="stats-table">
          <thead>
            <tr>
              <th>Клуб</th>
              <th class="num">Игр</th>
              <th class="num">Длительность</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in clubYearGroups" :key="group.year">
              <tr class="year-row">
                <td>{{ group.year }}</td>
                <td class="num">{{ group.matches }}</td>
                <td class="num">{{ formatDurationHuman(group.durationSeconds) }}</td>
              </tr>
              <tr v-for="club in group.clubs" :key="`${group.year}-${club.id}`" class="club-row">
                <td>{{ club.name }}</td>
                <td class="num">{{ club.matches }}</td>
                <td class="num">{{ formatDurationHuman(club.durationSeconds) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </section>

      <section v-else-if="activeTab === 'partners'" class="panel">
        <TagCloudSection
          :tags="dossier.partners"
          unit="игр"
          narrow
          empty-text="Партнёры не найдены."
          @select="openPlayer"
        />
      </section>

      <section v-else-if="activeTab === 'opponents'" class="panel">
        <TagCloudSection
          :tags="dossier.opponents"
          unit="игр"
          narrow
          empty-text="Соперники не найдены."
          @select="openPlayer"
        />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getErrorMessage,
  getPlayerBackground,
  getPlayerDossier,
  getTopScreenshots
} from '@/api'
import type { CatalogTag, PlayerDossier, TopScreenshotCard } from '@/api'
import { formatArchiveDuration, formatArchiveSize, formatDurationHuman } from '@/common'
import BackButton from '@/components/BackButton.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import FrameThumb from '@/components/FrameThumb.vue'
import NavIcon from '@/components/NavIcon.vue'
import ScreenshotImage from '@/components/ScreenshotImage.vue'
import TagCloudSection from '@/components/TagCloudSection.vue'
import { authStore } from '@/stores/auth'

type DossierTab = 'stats' | 'frames' | 'clubs' | 'partners' | 'opponents'
type TabIcon = 'stats' | 'top' | 'clubs' | 'partners' | 'opponents'

interface StatCard {
  key: string
  value: string
  caption: string
}

interface ClubYearGroup {
  year: number
  matches: number
  durationSeconds: number
  clubs: { id: string; name: string; matches: number; durationSeconds: number }[]
}

const tabs: { key: DossierTab; label: string; icon: TabIcon }[] = [
  { key: 'stats', label: 'Статистика', icon: 'stats' },
  { key: 'frames', label: 'Лучшие кадры', icon: 'top' },
  { key: 'clubs', label: 'Клубы', icon: 'clubs' },
  { key: 'partners', label: 'Партнёры', icon: 'partners' },
  { key: 'opponents', label: 'Соперники', icon: 'opponents' }
]

const route = useRoute()
const router = useRouter()
const auth = authStore()

const dossier = ref<PlayerDossier | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<DossierTab>('stats')

const frames = ref<TopScreenshotCard[]>([])
const framesLoading = ref(false)
const framesLoaded = ref(false)
const framesError = ref<string | null>(null)
const backgroundId = ref('')

const playerId = computed(() => {
  const value = route.params.id
  return typeof value === 'string' ? value : ''
})
const playerLabel = computed(() => dossier.value?.player.displayLabel ?? 'Игрок')

const statCards = computed<StatCard[]>(() => {
  const stats = dossier.value?.stats
  if (!stats) {
    return []
  }
  const cards = [
    { key: 'games', raw: stats.games, value: String(stats.games), caption: 'игр' },
    { key: 'trainings', raw: stats.trainings, value: String(stats.trainings), caption: 'тренировок' },
    { key: 'size', raw: stats.sizeMbytes, value: formatArchiveSize(stats.sizeMbytes), caption: 'размер в архиве' },
    { key: 'duration', raw: stats.durationSeconds, value: formatArchiveDuration(stats.durationSeconds), caption: 'время в архиве' },
    { key: 'frames', raw: stats.screenshotCount, value: String(stats.screenshotCount), caption: 'кадров' },
    { key: 'likes', raw: stats.framesWithLikes, value: String(stats.framesWithLikes), caption: 'кадров с лайками' },
    { key: 'shares', raw: stats.framesWithShares, value: String(stats.framesWithShares), caption: 'кадров с шарингами' },
    { key: 'views', raw: stats.views, value: stats.views.toLocaleString('ru-RU'), caption: 'просмотров' },
    { key: 'comments', raw: stats.comments, value: stats.comments.toLocaleString('ru-RU'), caption: 'комментариев' }
  ]
  return cards
    .filter(card => card.raw > 0)
    .map(({ key, value, caption }) => ({ key, value, caption }))
})

/** Два самых частых партнёра/соперника; при равенстве игр — по алфавиту. */
function topRelations(tags: CatalogTag[] | undefined): CatalogTag[] {
  return [...(tags ?? [])]
    .sort((left, right) =>
      right.matches - left.matches || left.label.localeCompare(right.label, 'ru')
    )
    .slice(0, 3)
}

const favoritePartners = computed(() => topRelations(dossier.value?.partners))
const favoriteOpponents = computed(() => topRelations(dossier.value?.opponents))

/** Клубы группируются сначала по году (по убыванию), внутри года — по количеству игр. */
const clubYearGroups = computed<ClubYearGroup[]>(() => {
  const groups = new Map<number, ClubYearGroup>()
  for (const club of dossier.value?.clubs ?? []) {
    for (const year of club.years) {
      let group = groups.get(year.year)
      if (!group) {
        group = { year: year.year, matches: 0, durationSeconds: 0, clubs: [] }
        groups.set(year.year, group)
      }
      group.matches += year.matches
      group.durationSeconds += year.durationSeconds
      group.clubs.push({
        id: club.id,
        name: club.name,
        matches: year.matches,
        durationSeconds: year.durationSeconds
      })
    }
  }
  const result = [...groups.values()].sort((left, right) => right.year - left.year)
  for (const group of result) {
    group.clubs.sort((left, right) =>
      right.matches - left.matches || left.name.localeCompare(right.name, 'ru')
    )
  }
  return result
})

let backgroundVersion = 0

async function loadBackground() {
  const version = ++backgroundVersion
  if (!playerId.value) {
    backgroundId.value = ''
    return
  }
  try {
    // Сервер выбирает кадр детерминированно на сутки, поэтому фон не «прыгает».
    const card = await getPlayerBackground(playerId.value)
    if (version !== backgroundVersion) {
      return
    }
    backgroundId.value = card.id
  } catch {
    if (version === backgroundVersion) {
      backgroundId.value = ''
    }
  }
}

async function load() {
  if (!playerId.value) {
    error.value = 'Игрок не указан.'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  void loadBackground()
  try {
    dossier.value = await getPlayerDossier(playerId.value)
  } catch (e) {
    dossier.value = null
    error.value = getErrorMessage(e, 'Не удалось загрузить досье игрока')
  } finally {
    loading.value = false
  }
}

async function loadFrames() {
  if (framesLoaded.value || framesLoading.value || !playerId.value) {
    return
  }
  framesLoading.value = true
  framesError.value = null
  try {
    frames.value = await getTopScreenshots(playerId.value)
    framesLoaded.value = true
  } catch (e) {
    framesError.value = getErrorMessage(e, 'Не удалось загрузить лучшие кадры игрока')
  } finally {
    framesLoading.value = false
  }
}

function selectTab(tab: DossierTab) {
  if (tab === activeTab.value) {
    return
  }
  activeTab.value = tab
  if (tab === 'frames') {
    void loadFrames()
  }
}

function openPlayer(tag: CatalogTag) {
  if (tag.id === playerId.value) {
    return
  }
  router.push({ name: 'player-dossier', params: { id: tag.id } })
}

watch(playerId, async (value, previous) => {
  if (!value || value === previous) {
    return
  }
  frames.value = []
  framesLoaded.value = false
  activeTab.value = 'stats'
  await load()
})

onMounted(load)
</script>

<style scoped>
.page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

/*
 * Фон досье: случайный кадр с игроком, закреплённый к окну (не двигается при
 * скролле) и сильно приглушённый, чтобы не мешать чтению досье.
 */
.dossier-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  object-position: center;
  opacity: 0.046;
  filter: saturate(0.7) brightness(0.9);
  pointer-events: none;
}

.heading-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.heading-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

h1 {
  font-size: 1.4rem;
}

.subtitle {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
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

.tab-icon {
  width: 18px;
  height: 18px;
  flex: none;
}

@media (max-width: 640px) {
  .tabs {
    flex-wrap: nowrap;
    gap: 0.35rem;
    min-width: 0;
  }

  .tab {
    flex: 0 0 auto;
    gap: 0;
    padding: 0.4rem 0.55rem;
  }

  /* Сжиматься может только активная вкладка, поэтому все кнопки остаются в одной строке. */
  .tab.active {
    flex: 0 1 auto;
    min-width: 0;
  }

  /* Название выбранной вкладки плавно раскрывается внутри её контура. */
  .tab-label {
    display: block;
    max-width: 0;
    margin-left: 0;
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition:
      max-width 0.28s ease,
      opacity 0.2s ease,
      margin-left 0.28s ease;
  }

  .tab.active .tab-label {
    max-width: 100%;
    margin-left: 0.4rem;
    opacity: 1;
  }
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  text-align: center;
}

.caption {
  color: var(--color-muted);
  font-size: 0.8rem;
  text-align: center;
}

.favorites {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.favorite-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.favorite-title {
  color: var(--color-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.favorite-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  list-style: none;
}

.favorite-player {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.3rem 0.4rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.favorite-player:hover,
.favorite-player:focus-visible {
  background: var(--color-primary-soft);
}

.favorite-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.favorite-count {
  color: var(--color-muted);
  font-size: 0.8rem;
  white-space: nowrap;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 38px;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.link-btn:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.link-btn--secondary {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
}

.link-btn--secondary:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.link-icon {
  width: 17px;
  height: 17px;
  flex: none;
}

.frame-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
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

.year-row {
  font-weight: 700;
  background: var(--color-primary-soft);
}

.club-row td:first-child {
  padding-left: 1.75rem;
}

.loading,
.empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-muted);
}

.empty {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
