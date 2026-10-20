<template>
  <div class="explore">
    <ScreenshotFrame
      v-if="card"
      :card="card"
      :width="1920"
      full
      effects
      actionable
      :busy="liking"
      @toggle-like="toggleLike"
    >
      <template #overlay>
        <button
          class="overlay-icon filter-btn"
          :class="{ active: hasFilters }"
          type="button"
          title="Фильтры"
          aria-label="Фильтры"
          @click="filterOpen = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span v-if="hasFilters" class="filter-dot" aria-hidden="true"></span>
        </button>

        <button
          class="slider-btn prev"
          type="button"
          :disabled="!canPrev"
          title="Предыдущий кадр"
          aria-label="Предыдущий кадр"
          @click="prev"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          class="slider-btn next"
          type="button"
          :disabled="loading"
          title="Следующий кадр"
          aria-label="Следующий кадр"
          @click="next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </template>
    </ScreenshotFrame>

    <div v-else class="stage">
      <div v-if="loading" class="stage-text">Загрузка кадра...</div>
      <div v-else-if="error" class="stage-text stage-error">{{ error }}</div>
      <button v-else class="stage-cta" type="button" @click="next">Показать кадр</button>
      <button
        class="overlay-icon filter-btn stage-filter"
        :class="{ active: hasFilters }"
        type="button"
        title="Фильтры"
        aria-label="Фильтры"
        @click="filterOpen = true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span v-if="hasFilters" class="filter-dot" aria-hidden="true"></span>
      </button>
    </div>

    <div v-if="notice || (error && card)" class="toast">{{ notice || error }}</div>

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

const history = ref<ScreenshotCard[]>([])
const historyIndex = ref(-1)
const loading = ref(false)
const liking = ref(false)
const filterOpen = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

let noticeTimer: ReturnType<typeof setTimeout> | null = null

const card = computed<ScreenshotCard | null>(() => history.value[historyIndex.value] ?? null)
const canPrev = computed(() => historyIndex.value > 0)
const selectedCount = computed(() => selectedPlayers.value.length + selectedClubs.value.length)
const hasFilters = computed(() => selectedCount.value > 0)

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
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    return
  }
  loading.value = true
  error.value = null
  try {
    const nextCard = await getNextScreenshot(filter())
    history.value = [...history.value, nextCard]
    historyIndex.value = history.value.length - 1
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

function prev() {
  if (historyIndex.value > 0) {
    historyIndex.value--
  }
}

async function applyFilters(value: { players: Player[]; clubs: Club[] }) {
  selectedPlayers.value = value.players
  selectedClubs.value = value.clubs
  filterOpen.value = false
  history.value = []
  historyIndex.value = -1
  await syncQuery()
  await next()
}

async function toggleLike() {
  if (!card.value || liking.value) {
    return
  }
  liking.value = true
  const current = card.value
  const index = historyIndex.value
  const nextLiked = !current.liked
  history.value[index] = {
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
    history.value[index] = current
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
    history.value = []
    historyIndex.value = -1
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
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.stage {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  background: var(--image-bg);
}

.stage-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.stage-error {
  color: var(--color-danger);
  padding: 0 1rem;
  text-align: center;
}

.stage-cta {
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--btn-ghost-border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
}

.stage-cta:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.overlay-icon {
  position: absolute;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--overlay-divider);
  border-radius: 50%;
  background: var(--overlay-panel);
  color: var(--text-primary);
  cursor: pointer;
  backdrop-filter: blur(6px);
}

.overlay-icon:hover,
.overlay-icon.active {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.overlay-icon svg {
  width: 20px;
  height: 20px;
}

.filter-btn {
  top: 0.75rem;
  left: 0.75rem;
}

.filter-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--text-primary);
  box-shadow: 0 0 0 2px var(--accent-dark);
}

.overlay-icon.active .filter-dot {
  background: var(--accent-dark);
  box-shadow: 0 0 0 2px var(--text-primary);
}

.stage-filter {
  top: 0.75rem;
  left: 0.75rem;
}

.slider-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid var(--overlay-divider);
  border-radius: 50%;
  background: var(--overlay-panel);
  color: var(--text-primary);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background-color 0.2s, color 0.2s, opacity 0.2s;
}

.slider-btn:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.slider-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.slider-btn svg {
  width: 28px;
  height: 28px;
}

.slider-btn.prev {
  left: 0.75rem;
}

.slider-btn.next {
  right: 0.75rem;
}

.toast {
  position: fixed;
  top: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  max-width: min(90vw, 420px);
  padding: 0.6rem 1rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 8px;
  background: var(--overlay-panel);
  color: var(--text-primary);
  text-align: center;
  font-size: 0.9rem;
  backdrop-filter: blur(8px);
}

@media (min-width: 900px) {
  .filter-btn,
  .stage-filter {
    top: 1.25rem;
    left: 2rem;
  }

  .slider-btn.prev {
    left: 2rem;
  }

  .slider-btn.next {
    right: 2rem;
  }
}

@media (max-width: 700px) {
  .slider-btn {
    width: 48px;
    height: 48px;
  }

  .slider-btn svg {
    width: 24px;
    height: 24px;
  }
}
</style>
