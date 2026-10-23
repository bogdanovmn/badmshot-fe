<template>
  <div class="explore">
    <ScreenshotFrame
      v-if="card"
      ref="frameRef"
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
          :disabled="!canPrev || transitioning"
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
          :disabled="loading || transitioning"
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
      <template v-else-if="noScreenshots">
        <div class="tv-bars" aria-hidden="true">
          <div class="tv-bars-main"></div>
          <div class="tv-bars-mid"></div>
          <div class="tv-bars-bottom"></div>
          <div class="tv-scanlines"></div>
        </div>
        <div class="tv-message">
          <span class="tv-caption">Нет сигнала</span>
          <h2>Кадры не найдены</h2>
          <p>Для выбранного фильтра пока нет кадров. Попробуйте изменить игроков, клубы или включить индивидуальные тренировки.</p>
          <button class="stage-cta" type="button" @click="filterOpen = true">Изменить фильтр</button>
        </div>
      </template>
      <ErrorNotice v-else-if="error" :message="error" class="stage-error-notice" />
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
      :include-indi="includeIndi"
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
  getErrorMessage,
  getNextScreenshot,
  getPlayersByIds,
  isNotFound,
  isRateLimited,
  likeScreenshot,
  registerScreenshotView,
  unlikeScreenshot
} from '@/api'
import type { Club, Player, ScreenshotCard, ScreenshotFilter } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'
import ScreenshotFilterDialog from '@/components/ScreenshotFilterDialog.vue'

const route = useRoute()
const router = useRouter()

const selectedPlayers = ref<Player[]>([])
const selectedClubs = ref<Club[]>([])
const includeIndi = ref(false)

const frameRef = ref<InstanceType<typeof ScreenshotFrame> | null>(null)
const history = ref<ScreenshotCard[]>([])
const historyIndex = ref(-1)
const loading = ref(false)
const liking = ref(false)
const transitioning = ref(false)
const filterOpen = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const noScreenshots = ref(false)

let noticeTimer: ReturnType<typeof setTimeout> | null = null

const card = computed<ScreenshotCard | null>(() => history.value[historyIndex.value] ?? null)
const canPrev = computed(() => historyIndex.value > 0)
const selectedCount = computed(() => selectedPlayers.value.length + selectedClubs.value.length)
const hasFilters = computed(() => selectedCount.value > 0 || includeIndi.value)

function queryValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return typeof value === 'string' ? [value] : []
}

function queryFlag(value: unknown): boolean {
  return value === '1' || value === 'true'
}

function sameSelection(playerIds: string[], clubIds: string[], indi: boolean): boolean {
  const currentPlayers = selectedPlayers.value.map(player => player.id).sort()
  const currentClubs = selectedClubs.value.map(club => club.id).sort()
  return currentPlayers.join(',') === [...playerIds].sort().join(',')
    && currentClubs.join(',') === [...clubIds].sort().join(',')
    && includeIndi.value === indi
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
  if (includeIndi.value) {
    query.indi = '1'
  }
  const current = route.query
  const same = JSON.stringify(normalizeQuery(current)) === JSON.stringify(normalizeQuery(query))
  if (!same) {
    await router.replace({ path: '/explore', query })
  }
}

function normalizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  return {
    players: queryValues(query.players).slice().sort(),
    clubs: queryValues(query.clubs).slice().sort(),
    indi: queryFlag(query.indi)
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
  return {
    players: selectedPlayers.value.map(player => player.id),
    clubs: selectedClubs.value.map(club => club.id),
    indi: includeIndi.value
  }
}

async function loadNext() {
  if (loading.value) {
    return
  }
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    return
  }
  loading.value = true
  error.value = null
  noScreenshots.value = false
  try {
    const nextCard = await getNextScreenshot(filter())
    history.value = [...history.value, nextCard]
    historyIndex.value = history.value.length - 1
  } catch (e) {
    if (isRateLimited(e)) {
      showNotice('Слишком часто. Подождите несколько секунд.')
    } else if (isNotFound(e)) {
      noScreenshots.value = true
    } else {
      error.value = getErrorMessage(e, 'Не удалось загрузить кадр')
    }
  } finally {
    loading.value = false
  }
}

async function next() {
  if (loading.value || transitioning.value) {
    return
  }
  transitioning.value = true
  try {
    if (frameRef.value) {
      await frameRef.value.runTransition(loadNext)
    } else {
      await loadNext()
    }
  } finally {
    transitioning.value = false
  }
}

async function prev() {
  if (transitioning.value || historyIndex.value <= 0) {
    return
  }
  const swap = () => {
    if (historyIndex.value > 0) {
      historyIndex.value--
    }
  }
  transitioning.value = true
  try {
    if (frameRef.value) {
      await frameRef.value.runTransition(swap)
    } else {
      swap()
    }
  } finally {
    transitioning.value = false
  }
}

async function applyFilters(value: { players: Player[]; clubs: Club[]; includeIndi: boolean }) {
  selectedPlayers.value = value.players
  selectedClubs.value = value.clubs
  includeIndi.value = value.includeIndi
  filterOpen.value = false
  history.value = []
  historyIndex.value = -1
  await syncQuery()
  await loadNext()
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
    error.value = getErrorMessage(e, 'Не удалось изменить лайк')
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
    const indi = queryFlag(route.query.indi)
    if (sameSelection(playerIds, clubIds, indi)) {
      return
    }
    includeIndi.value = indi
    await loadSelection(playerIds, clubIds)
    history.value = []
    historyIndex.value = -1
    await loadNext()
  }
)

watch(
  () => card.value?.id,
  id => {
    if (id) {
      void registerScreenshotView(id)
    }
  }
)

onMounted(async () => {
  const playerIds = queryValues(route.query.players)
  const clubIds = queryValues(route.query.clubs)
  includeIndi.value = queryFlag(route.query.indi)
  if (playerIds.length || clubIds.length) {
    await loadSelection(playerIds, clubIds)
  }
  await loadNext()
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

.stage-error-notice {
  max-width: min(90%, 480px);
}

.tv-bars {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  filter: saturate(0.9) contrast(1.05);
}

.tv-bars-main {
  flex: 0 0 62%;
  background: linear-gradient(
    90deg,
    var(--text-primary) 0 14.285%,
    var(--color-success) 14.285% 28.571%,
    var(--text-secondary) 28.571% 42.857%,
    var(--color-primary-soft) 42.857% 57.143%,
    var(--color-danger) 57.143% 71.429%,
    var(--text-muted) 71.429% 85.714%,
    var(--bg-surface) 85.714% 100%
  );
}

.tv-bars-mid {
  flex: 0 0 10%;
  background: linear-gradient(
    90deg,
    var(--accent-dark) 0 14.285%,
    var(--color-primary-soft) 14.285% 28.571%,
    var(--text-muted) 28.571% 42.857%,
    var(--accent-dark) 42.857% 57.143%,
    var(--text-secondary) 57.143% 71.429%,
    var(--color-primary-soft) 71.429% 85.714%,
    var(--text-primary) 85.714% 100%
  );
}

.tv-bars-bottom {
  flex: 1;
  background: linear-gradient(
    90deg,
    var(--accent-dark) 0 12.5%,
    var(--text-primary) 12.5% 25%,
    var(--color-primary-soft) 25% 37.5%,
    var(--bg-main) 37.5% 50%,
    var(--accent-dark) 50% 62.5%,
    var(--bg-main) 62.5% 75%,
    var(--color-primary-soft) 75% 87.5%,
    var(--accent-dark) 87.5% 100%
  );
}

.tv-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    rgba(10, 10, 10, 0.2) 0 1px,
    transparent 1px 3px
  );
  mix-blend-mode: multiply;
  opacity: 0.4;
  pointer-events: none;
}

.tv-scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 45%, var(--vignette-color) 100%);
}

.tv-message {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  max-width: min(90%, 480px);
  padding: 1.5rem 1.75rem;
  border: 1px solid var(--overlay-divider);
  border-radius: 12px;
  background: var(--overlay-panel);
  color: var(--text-primary);
  text-align: center;
  box-shadow: var(--shadow-strong);
  backdrop-filter: blur(6px);
}

.tv-caption {
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.tv-message h2 {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.8rem);
}

.tv-message p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.45;
}

.tv-message .stage-cta {
  margin-top: 0.4rem;
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
  width: 64px;
  height: 64px;
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
  width: 34px;
  height: 34px;
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
  width: 64px;
  height: 64px;
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
  width: 34px;
  height: 34px;
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
</style>
