<template>
  <div class="explore">
    <div class="heading">
      <h1>Кадры</h1>
      <p class="hint">Выберите игроков и/или клубы, затем листайте кадры.</p>
    </div>

    <section class="filters">
      <div class="filter-block">
        <label class="filter-label">Игроки</label>
        <div v-if="selectedPlayers.length" class="chips">
          <button
            v-for="player in selectedPlayers"
            :key="player.id"
            class="chip"
            @click="removePlayer(player.id)"
          >
            {{ player.displayLabel }}<span class="chip-x">×</span>
          </button>
        </div>
        <input v-model="playerTerm" class="search" type="text" placeholder="Поиск игрока..." />
        <div class="options">
          <button
            v-for="player in availablePlayers"
            :key="player.id"
            class="option"
            @click="addPlayer(player)"
          >
            {{ player.displayLabel }}
          </button>
        </div>
      </div>

      <div class="filter-block">
        <label class="filter-label">Клубы</label>
        <div v-if="selectedClubs.length" class="chips">
          <button
            v-for="club in selectedClubs"
            :key="club.id"
            class="chip"
            @click="removeClub(club.id)"
          >
            {{ club.name }}<span class="chip-x">×</span>
          </button>
        </div>
        <input v-model="clubTerm" class="search" type="text" placeholder="Поиск клуба..." />
        <div class="options">
          <button
            v-for="club in availableClubs"
            :key="club.id"
            class="option"
            @click="addClub(club)"
          >
            {{ club.name }}
          </button>
        </div>
      </div>
    </section>

    <div class="actions">
      <button class="btn-primary" :disabled="loading" @click="next">
        {{ loading ? 'Загрузка...' : 'Следующий кадр' }}
      </button>
      <span v-if="notice" class="notice">{{ notice }}</span>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!card && !error" class="empty">Нажмите «Следующий кадр», чтобы начать.</div>

    <ScreenshotFrame
      v-else-if="card"
      :card="card"
      :width="1280"
      actionable
      :busy="liking"
      @toggle-like="toggleLike"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  getClubs,
  getNextScreenshot,
  getPlayers,
  isRateLimited,
  likeScreenshot,
  unlikeScreenshot
} from '@/api'
import type { Club, Player, ScreenshotCard } from '@/api'
import ScreenshotFrame from '@/components/ScreenshotFrame.vue'

const selectedPlayers = ref<Player[]>([])
const selectedClubs = ref<Club[]>([])

const playerTerm = ref('')
const clubTerm = ref('')
const playerOptions = ref<Player[]>([])
const clubOptions = ref<Club[]>([])

const card = ref<ScreenshotCard | null>(null)
const loading = ref(false)
const liking = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

let playerTimer: ReturnType<typeof setTimeout> | null = null
let clubTimer: ReturnType<typeof setTimeout> | null = null
let noticeTimer: ReturnType<typeof setTimeout> | null = null

const availablePlayers = computed(() =>
  playerOptions.value.filter(option => !selectedPlayers.value.some(p => p.id === option.id))
)
const availableClubs = computed(() =>
  clubOptions.value.filter(option => !selectedClubs.value.some(c => c.id === option.id))
)

async function loadPlayerOptions() {
  try {
    playerOptions.value = await getPlayers({ term: playerTerm.value || undefined })
  } catch {
    playerOptions.value = []
  }
}

async function loadClubOptions() {
  try {
    clubOptions.value = await getClubs({ term: clubTerm.value || undefined })
  } catch {
    clubOptions.value = []
  }
}

function addPlayer(player: Player) {
  selectedPlayers.value = [...selectedPlayers.value, player]
  playerTerm.value = ''
}

function removePlayer(id: string) {
  selectedPlayers.value = selectedPlayers.value.filter(player => player.id !== id)
}

function addClub(club: Club) {
  selectedClubs.value = [...selectedClubs.value, club]
  clubTerm.value = ''
}

function removeClub(id: string) {
  selectedClubs.value = selectedClubs.value.filter(club => club.id !== id)
}

function filter() {
  return {
    players: selectedPlayers.value.map(player => player.id),
    clubs: selectedClubs.value.map(club => club.id)
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

watch(playerTerm, () => {
  if (playerTimer) {
    clearTimeout(playerTimer)
  }
  playerTimer = setTimeout(loadPlayerOptions, 300)
})

watch(clubTerm, () => {
  if (clubTimer) {
    clearTimeout(clubTimer)
  }
  clubTimer = setTimeout(loadClubOptions, 300)
})

onMounted(async () => {
  await Promise.all([loadPlayerOptions(), loadClubOptions()])
  await next()
})

onBeforeUnmount(() => {
  if (playerTimer) clearTimeout(playerTimer)
  if (clubTimer) clearTimeout(clubTimer)
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<style scoped>
.explore {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 900px;
  margin: 0 auto;
}

.heading h1 {
  font-size: 1.5rem;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 720px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
}

.filter-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.filter-label {
  font-weight: 600;
  font-size: 0.9rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
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
  font-size: 0.85rem;
  cursor: pointer;
}

.chip-x {
  font-size: 1rem;
  line-height: 1;
}

.search {
  width: 100%;
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
  max-height: 140px;
  overflow-y: auto;
}

.option {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
}

.option:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}

.actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.btn-primary {
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.notice {
  color: var(--color-danger);
  font-size: 0.9rem;
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
</style>
