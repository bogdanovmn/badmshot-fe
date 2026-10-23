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
          </section>

          <section class="filter-block">
            <label class="filter-label" for="club-select">Клубы</label>
            <div v-if="selectedClubs.length" class="chips">
              <button
                v-for="club in selectedClubs"
                :key="club.id"
                class="chip"
                type="button"
                @click="removeClub(club.id)"
              >
                {{ club.displayLabel }}<span class="chip-x">×</span>
              </button>
            </div>
            <select
              id="club-select"
              class="search"
              :value="''"
              :disabled="clubLoading || availableClubs.length === 0"
              @change="addClubFromSelect"
            >
              <option value="" disabled>
                {{ clubLoading ? 'Загрузка...' : availableClubs.length ? 'Добавить клуб...' : 'Нет доступных клубов' }}
              </option>
              <option v-for="club in availableClubs" :key="club.id" :value="club.id">
                {{ club.displayLabel }}
              </option>
            </select>
          </section>

          <section class="filter-block">
            <label class="toggle">
              <input v-model="showIndi" type="checkbox" />
              <span>Показывать индивидуальные тренировки</span>
            </label>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getClubs, getPlayers } from '@/api'
import type { Club, Player } from '@/api'

const props = defineProps<{
  players: Player[]
  clubs: Club[]
  includeIndi: boolean
}>()

const emit = defineEmits<{
  close: []
  apply: [value: { players: Player[]; clubs: Club[]; includeIndi: boolean }]
}>()

const selectedPlayers = ref<Player[]>([...props.players])
const selectedClubs = ref<Club[]>([...props.clubs])
const showIndi = ref(props.includeIndi)

const playerTerm = ref('')
const playerOptions = ref<Player[]>([])
const playerLoading = ref(false)
const allClubs = ref<Club[]>([])
const clubLoading = ref(false)

const availableClubs = computed(() =>
  allClubs.value.filter(
    option => !selectedClubs.value.some(club => club.id === option.id)
  )
)

let playerTimer: ReturnType<typeof setTimeout> | null = null
let searchVersion = 0

const MIN_SEARCH_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 400

function clearPlayerSearch() {
  searchVersion++
  if (playerTimer) {
    clearTimeout(playerTimer)
    playerTimer = null
  }
  playerOptions.value = []
  playerLoading.value = false
}

async function searchPlayers() {
  const term = playerTerm.value.trim()
  if (term.length < MIN_SEARCH_LENGTH) {
    clearPlayerSearch()
    return
  }
  const version = ++searchVersion
  playerLoading.value = true
  try {
    const found = await getPlayers({ term })
    if (version !== searchVersion) {
      return
    }
    playerOptions.value = found.filter(
      option => !selectedPlayers.value.some(player => player.id === option.id)
    )
  } catch {
    if (version === searchVersion) {
      playerOptions.value = []
    }
  } finally {
    if (version === searchVersion) {
      playerLoading.value = false
    }
  }
}

async function loadClubs() {
  clubLoading.value = true
  try {
    allClubs.value = await getClubs()
  } catch {
    allClubs.value = []
  } finally {
    clubLoading.value = false
  }
}

function addPlayer(player: Player) {
  selectedPlayers.value = [...selectedPlayers.value, player]
  playerTerm.value = ''
  clearPlayerSearch()
}

function removePlayer(id: string) {
  selectedPlayers.value = selectedPlayers.value.filter(player => player.id !== id)
}

function addClubFromSelect(event: Event) {
  const select = event.target as HTMLSelectElement
  const club = allClubs.value.find(option => option.id === select.value)
  select.value = ''
  if (club) {
    selectedClubs.value = [...selectedClubs.value, club]
  }
}

function removeClub(id: string) {
  selectedClubs.value = selectedClubs.value.filter(club => club.id !== id)
}

function clear() {
  selectedPlayers.value = []
  selectedClubs.value = []
  showIndi.value = false
  playerTerm.value = ''
  clearPlayerSearch()
}

function apply() {
  emit('apply', {
    players: [...selectedPlayers.value],
    clubs: [...selectedClubs.value],
    includeIndi: showIndi.value
  })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(playerTerm, term => {
  if (playerTimer) {
    clearTimeout(playerTimer)
    playerTimer = null
  }
  if (term.trim().length < MIN_SEARCH_LENGTH) {
    clearPlayerSearch()
    return
  }
  searchVersion++
  playerTimer = setTimeout(searchPlayers, SEARCH_DEBOUNCE_MS)
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
  loadClubs()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  if (playerTimer) clearTimeout(playerTimer)
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
  background: var(--overlay-backdrop);
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
  box-shadow: var(--shadow-strong);
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
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: transparent;
  color: var(--text-primary);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
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

.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.toggle input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--accent-dark);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

.chip:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
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
  outline: 2px solid var(--text-muted);
  border-color: var(--text-secondary);
}

.search:disabled {
  opacity: 0.6;
  cursor: default;
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
  border: 1px solid var(--btn-ghost-border);
  background: transparent;
  color: var(--text-primary);
}

.btn-ghost:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.btn-primary {
  border: 1px solid var(--btn-primary-bg);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.btn-primary:hover {
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
  border-color: var(--btn-primary-bg-hover);
}
</style>
