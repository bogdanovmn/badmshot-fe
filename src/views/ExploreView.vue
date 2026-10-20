<template>
  <div class="explore">
    <div class="toolbar">
      <button class="filter-btn" type="button" @click="filterOpen = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span class="filter-btn-label">Фильтры</span>
        <span v-if="selectedCount" class="filter-count">{{ selectedCount }}</span>
      </button>

      <div v-if="selectedPlayers.length || selectedClubs.length" class="active-filters">
        <button
          v-for="player in selectedPlayers"
          :key="player.id"
          class="chip"
          type="button"
          @click="removePlayer(player.id)"
        >
          {{ player.displayLabel }}<span class="chip-x">×</span>
        </button>
        <button
          v-for="club in selectedClubs"
          :key="club.id"
          class="chip"
          type="button"
          @click="removeClub(club.id)"
        >
          {{ club.name }}<span class="chip-x">×</span>
        </button>
      </div>

      <button class="btn-primary" :disabled="loading" type="button" @click="next">
        {{ loading ? 'Загрузка...' : 'Следующий кадр' }}
      </button>
    </div>

    <span v-if="notice" class="notice">{{ notice }}</span>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!card && loading" class="empty">Загрузка кадра...</div>
    <div v-else-if="!card && !error" class="empty">Нажмите «Следующий кадр», чтобы начать.</div>

    <ScreenshotFrame
      v-else-if="card"
      :card="card"
      :width="1920"
      full
      effects
      actionable
      :busy="liking"
      @toggle-like="toggleLike"
    />

    <ScreenshotFilterDialog
      v-if="filterOpen"
      :players="selectedPlayers"
      :clubs="selectedClubs"
      @close="filterOpen = false"
      @apply="applyFilters"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getClubsByIds,
  getNextScreenshot,
  getPlayersByIds,
  isRateLimited,
  likeScreenshot,
  unlikeScreenshot
} from '@/api'
import type { Club, Player, ScreenshotCard, ScreenshotFilter } from '@/api'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'
import ScreenshotFilterDialog from '@/components/ScreenshotFilterDialog.vue'

const route = useRoute()
const router = useRouter()

const selectedPlayers = ref<Player[]>([])
const selectedClubs = ref<Club[]>([])

const card = ref<ScreenshotCard | null>(null)
const loading = ref(false)
const liking = ref(false)
const filterOpen = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

let noticeTimer: ReturnType<typeof setTimeout> | null = null

const selectedCount = computed(() => selectedPlayers.value.length + selectedClubs.value.length)

function queryValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return typeof value === 'string' ? [value] : []
}

function sameSelection(playerIds: string[], clubIds: string[]): boolean {
  const currentPlayers = selectedPlayers.value.map(player => player.id).sort()
  const currentClubs = selectedClubs.value.map(club => club.id).sort()
  return currentPlayers.join(',') === [...playerIds].sort().join(',')
    && currentClubs.join(',') === [...clubIds].sort().join(',')
}

async function loadSelection(playerIds: string[], clubIds: string[]) {
  try {
    const [players, clubs] = await Promise.all([
      getPlayersByIds(playerIds),
      getClubsByIds(clubIds)
    ])
    selectedPlayers.value = players
    selectedClubs.value = clubs
  } catch {
    selectedPlayers.value = []
    selectedClubs.value = []
  }
}

async function syncQuery() {
  const query: Record<string, string | string[]> = {}
  if (selectedPlayers.value.length) {
    query.players = selectedPlayers.value.map(player => player.id)
  }
  if (selectedClubs.value.length) {
    query.clubs = selectedClubs.value.map(club => club.id)
  }
  const current = route.query
  const same = JSON.stringify(normalizeQuery(current)) === JSON.stringify(normalizeQuery(query))
  if (!same) {
    await router.replace({ path: '/explore', query })
  }
}

function normalizeQuery(query: Record<string, unknown>): Record<string, string[]> {
  return {
    players: queryValues(query.players).slice().sort(),
    clubs: queryValues(query.clubs).slice().sort()
  }
}

function showNotice(message: string) {
  notice.value = message
  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }
  noticeTimer = setTimeout(() => {
    notice.value = null
  }, 4000)
}

function filter(): ScreenshotFilter {
  const current = card.value
  return {
    players: selectedPlayers.value.map(player => player.id),
    clubs: selectedClubs.value.map(club => club.id),
    excludeMatchId: current?.matchId,
    excludeClubId: current?.clubId || undefined
  }
}

async function next() {
  if (loading.value) {
    return
  }
  loading.value = true
  error.value = null
  try {
    card.value = await getNextScreenshot(filter())
  } catch (e) {
    if (isRateLimited(e)) {
      showNotice('Слишком часто. Подождите несколько секунд.')
    } else {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить кадр'
    }
  } finally {
    loading.value = false
  }
}

async function applyFilters(value: { players: Player[]; clubs: Club[] }) {
  selectedPlayers.value = value.players
  selectedClubs.value = value.clubs
  filterOpen.value = false
  await syncQuery()
  await next()
}

async function removePlayer(id: string) {
  selectedPlayers.value = selectedPlayers.value.filter(player => player.id !== id)
  await syncQuery()
  await next()
}

async function removeClub(id: string) {
  selectedClubs.value = selectedClubs.value.filter(club => club.id !== id)
  await syncQuery()
  await next()
}

async function toggleLike() {
  if (!card.value || liking.value) {
    return
  }
  liking.value = true
  const current = card.value
  const nextLiked = !current.liked
  card.value = {
    ...current,
    liked: nextLiked,
    likes: current.likes + (nextLiked ? 1 : -1)
  }
  try {
    if (nextLiked) {
      await likeScreenshot(current.id)
    } else {
      await unlikeScreenshot(current.id)
    }
  } catch (e) {
    card.value = current
    error.value = e instanceof Error ? e.message : 'Не удалось изменить лайк'
  } finally {
    liking.value = false
  }
}

watch(
  () => route.fullPath,
  async () => {
    if (route.path !== '/explore') {
      return
    }
    const playerIds = queryValues(route.query.players)
    const clubIds = queryValues(route.query.clubs)
    if (sameSelection(playerIds, clubIds)) {
      return
    }
    await loadSelection(playerIds, clubIds)
    await next()
  }
)

onMounted(async () => {
  const playerIds = queryValues(route.query.players)
  const clubIds = queryValues(route.query.clubs)
  if (playerIds.length || clubIds.length) {
    await loadSelection(playerIds, clubIds)
  }
  await next()
})

onBeforeUnmount(() => {
  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }
})
</script>

<style scoped>
.explore {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
}

.filter-btn:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.filter-btn svg {
  width: 18px;
  height: 18px;
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 0.3rem;
  border-radius: 11px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 0.75rem;
}

.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex: 1;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border: none;
  border-radius: 14px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 0.82rem;
  cursor: pointer;
}

.chip-x {
  font-size: 1rem;
  line-height: 1;
}

.btn-primary {
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.notice,
.error {
  text-align: center;
  font-size: 0.9rem;
  color: var(--color-danger);
}

.empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-muted);
}

@media (max-width: 599px) {
  .filter-btn-label {
    display: none;
  }

  .btn-primary {
    width: 100%;
    margin-left: 0;
  }
}
</style>
