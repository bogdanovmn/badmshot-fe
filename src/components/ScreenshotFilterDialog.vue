<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="filters-title">
        <header class="dialog-header">
          <h2 id="filters-title">Фильтры</h2>
          <button class="close-btn" type="button" aria-label="Закрыть" @click="emit('close')">×</button>
        </header>

        <div class="dialog-body">
          <section class="filter-block">
            <label class="filter-label" for="player-search">Игроки</label>
            <div v-if="selectedPlayers.length" class="chips">
              <button
                v-for="player in selectedPlayers"
                :key="player.id"
                class="chip"
                type="button"
                @click="removePlayer(player.id)"
              >
                {{ player.displayLabel }}<span class="chip-x">×</span>
              </button>
            </div>
            <div class="search-wrap">
              <input
                id="player-search"
                v-model="playerTerm"
                class="search"
                type="text"
                placeholder="Начните вводить имя игрока..."
                autocomplete="off"
              />
              <span v-if="playerLoading" class="search-status">...</span>
            </div>
            <ul v-if="playerTerm && playerOptions.length" class="suggestions">
              <li v-for="player in playerOptions" :key="player.id">
                <button type="button" @click="addPlayer(player)">{{ player.displayLabel }}</button>
              </li>
            </ul>
            <p v-else-if="playerTerm && !playerLoading" class="no-results">Ничего не найдено</p>
          </section>

          <section class="filter-block">
            <label class="filter-label" for="club-search">Клубы</label>
            <div v-if="selectedClubs.length" class="chips">
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
            <div class="search-wrap">
              <input
                id="club-search"
                v-model="clubTerm"
                class="search"
                type="text"
                placeholder="Начните вводить название клуба..."
                autocomplete="off"
              />
              <span v-if="clubLoading" class="search-status">...</span>
            </div>
            <ul v-if="clubTerm && clubOptions.length" class="suggestions">
              <li v-for="club in clubOptions" :key="club.id">
                <button type="button" @click="addClub(club)">{{ club.name }}</button>
              </li>
            </ul>
            <p v-else-if="clubTerm && !clubLoading" class="no-results">Ничего не найдено</p>
          </section>
        </div>

        <footer class="dialog-footer">
          <button class="btn-ghost" type="button" @click="clear">Сбросить</button>
          <button class="btn-primary" type="button" @click="apply">Применить</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getClubs, getPlayers } from '@/api'
import type { Club, Player } from '@/api'

const props = defineProps<{
  players: Player[]
  clubs: Club[]
}>()

const emit = defineEmits<{
  close: []
  apply: [value: { players: Player[]; clubs: Club[] }]
}>()

const selectedPlayers = ref<Player[]>([...props.players])
const selectedClubs = ref<Club[]>([...props.clubs])

const playerTerm = ref('')
const clubTerm = ref('')
const playerOptions = ref<Player[]>([])
const clubOptions = ref<Club[]>([])
const playerLoading = ref(false)
const clubLoading = ref(false)

let playerTimer: ReturnType<typeof setTimeout> | null = null
let clubTimer: ReturnType<typeof setTimeout> | null = null

async function searchPlayers() {
  if (!playerTerm.value.trim()) {
    playerOptions.value = []
    return
  }
  playerLoading.value = true
  try {
    const found = await getPlayers({ term: playerTerm.value.trim() })
    playerOptions.value = found.filter(
      option => !selectedPlayers.value.some(player => player.id === option.id)
    )
  } catch {
    playerOptions.value = []
  } finally {
    playerLoading.value = false
  }
}

async function searchClubs() {
  if (!clubTerm.value.trim()) {
    clubOptions.value = []
    return
  }
  clubLoading.value = true
  try {
    const found = await getClubs({ term: clubTerm.value.trim() })
    clubOptions.value = found.filter(
      option => !selectedClubs.value.some(club => club.id === option.id)
    )
  } catch {
    clubOptions.value = []
  } finally {
    clubLoading.value = false
  }
}

function addPlayer(player: Player) {
  selectedPlayers.value = [...selectedPlayers.value, player]
  playerTerm.value = ''
  playerOptions.value = []
}

function removePlayer(id: string) {
  selectedPlayers.value = selectedPlayers.value.filter(player => player.id !== id)
}

function addClub(club: Club) {
  selectedClubs.value = [...selectedClubs.value, club]
  clubTerm.value = ''
  clubOptions.value = []
}

function removeClub(id: string) {
  selectedClubs.value = selectedClubs.value.filter(club => club.id !== id)
}

function clear() {
  selectedPlayers.value = []
  selectedClubs.value = []
  playerTerm.value = ''
  clubTerm.value = ''
  playerOptions.value = []
  clubOptions.value = []
}

function apply() {
  emit('apply', {
    players: [...selectedPlayers.value],
    clubs: [...selectedClubs.value]
  })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(playerTerm, () => {
  if (playerTimer) {
    clearTimeout(playerTimer)
  }
  playerTimer = setTimeout(searchPlayers, 350)
})

watch(clubTerm, () => {
  if (clubTimer) {
    clearTimeout(clubTimer)
  }
  clubTimer = setTimeout(searchClubs, 350)
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  if (playerTimer) clearTimeout(playerTimer)
  if (clubTimer) clearTimeout(clubTimer)
})
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(20, 14, 8, 0.55);
  backdrop-filter: blur(3px);
}

.dialog {
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: min(90vh, 780px);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: 0 24px 70px rgba(20, 14, 8, 0.4);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h2 {
  font-size: 1.15rem;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--color-border);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
  overflow-y: auto;
}

.filter-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.search-wrap {
  position: relative;
}

.search {
  width: 100%;
  min-height: 42px;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
}

.search:focus {
  outline: 2px solid var(--color-primary-soft);
  border-color: var(--color-primary);
}

.search-status {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-muted);
  font-size: 0.85rem;
}

.suggestions {
  display: flex;
  flex-direction: column;
  max-height: 180px;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
}

.suggestions button {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.suggestions button:hover {
  background: var(--color-primary-soft);
}

.no-results {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

.btn-ghost,
.btn-primary {
  min-height: 42px;
  padding: 0.5rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-ghost {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-primary);
}

.btn-ghost:hover {
  background: var(--color-primary-soft);
}

.btn-primary {
  border: none;
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}
</style>
