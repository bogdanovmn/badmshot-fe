<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <div
        ref="dialogRef"
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
        aria-describedby="filters-description"
      >
        <header class="dialog-header">
          <div class="dialog-heading">
            <h2 id="filters-title">Фильтр кадров</h2>
            <p id="filters-description" class="dialog-subtitle">
              Выберите игроков, клубы и тип кадров.
            </p>
          </div>
          <button class="icon-btn" type="button" aria-label="Закрыть фильтры" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="dialog-body">
          <section class="filter-block" aria-labelledby="players-section-title">
            <div class="block-head">
              <div>
                <h3 id="players-section-title" class="filter-label">Игроки</h3>
                <p class="hint">Добавьте одного или нескольких игроков.</p>
              </div>
              <span
                v-if="selectedPlayers.length"
                class="counter"
                :class="{ warn: togetherMode && tooManyForTogether }"
              >
                {{ selectedPlayers.length }}<template v-if="togetherMode"> / {{ maxTogetherPlayers }}</template>
              </span>
            </div>

            <div class="mode-switch" role="radiogroup" aria-label="Как учитывать выбранных игроков">
              <label class="mode-option" :class="{ active: !togetherMode }">
                <input
                  v-model="togetherMode"
                  class="visually-hidden"
                  type="radio"
                  :value="false"
                />
                <span class="mode-title">Любой из игроков</span>
                <span class="mode-hint">Достаточно одного из выбранных</span>
              </label>
              <label class="mode-option" :class="{ active: togetherMode, disabled: !canUseTogether }">
                <input
                  v-model="togetherMode"
                  class="visually-hidden"
                  type="radio"
                  :value="true"
                  :disabled="!canUseTogether"
                />
                <span class="mode-title">Все вместе</span>
                <span class="mode-hint">Только кадры со всеми игроками</span>
              </label>
            </div>

            <p
              v-if="modeNotice"
              class="notice"
              :class="modeNoticeWarn ? 'notice-warn' : 'notice-info'"
              role="status"
            >
              {{ modeNotice }}
            </p>

            <div v-if="selectedPlayers.length" class="chips" aria-label="Выбранные игроки">
              <span v-for="player in selectedPlayers" :key="player.id" class="chip">
                <span class="chip-label">{{ player.displayLabel }}</span>
                <button
                  class="chip-remove"
                  type="button"
                  :aria-label="`Убрать игрока ${player.displayLabel}`"
                  @click="removePlayer(player.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>

            <div class="combobox">
              <div class="input-wrap">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  id="player-search"
                  ref="playerInput"
                  v-model="playerTerm"
                  class="search"
                  type="text"
                  :placeholder="playerLimitReached ? `Максимум ${maxTogetherPlayers} игрока` : 'Начните вводить имя игрока...'"
                  :disabled="playerLimitReached"
                  autocomplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="player-suggestions"
                  :aria-expanded="suggestionsOpen"
                  :aria-activedescendant="activeDescendant"
                  @keydown="onPlayerKeydown"
                  @focus="onPlayerFocus"
                  @blur="onPlayerBlur"
                />
                <span v-if="playerLoading" class="spinner" aria-hidden="true"></span>
                <button
                  v-else-if="playerTerm"
                  class="clear-search"
                  type="button"
                  aria-label="Очистить поиск"
                  @click="resetPlayerSearch"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p v-if="playerLimitReached" class="hint">
                В режиме «Все вместе» можно выбрать не более {{ maxTogetherPlayers }} игроков.
                Уберите одного из выбранных, чтобы добавить другого.
              </p>
              <p v-else class="hint">{{ playerSearchHint }}</p>

              <div
                v-if="suggestionsOpen"
                id="player-suggestions"
                class="suggestions"
                role="listbox"
                aria-label="Найденные игроки"
              >
                <p v-if="playerLoading" class="suggestions-state">Поиск...</p>
                <template v-else-if="playerOptions.length">
                  <button
                    v-for="(player, index) in playerOptions"
                    :id="optionId(index)"
                    :key="player.id"
                    class="suggestion"
                    :class="{ active: index === activeOption }"
                    type="button"
                    role="option"
                    :aria-selected="index === activeOption"
                    @mouseenter="activeOption = index"
                    @mousedown.prevent="addPlayer(player)"
                  >
                    <span class="suggestion-label">{{ player.displayLabel }}</span>
                    <span v-if="player.name !== player.displayLabel" class="suggestion-meta">
                      {{ player.name }}
                    </span>
                  </button>
                </template>
                <p v-else class="suggestions-state">{{ noPlayersText }}</p>
              </div>
            </div>
          </section>

          <section class="filter-block" aria-labelledby="clubs-section-title">
            <div class="block-head">
              <div>
                <h3 id="clubs-section-title" class="filter-label">Клубы</h3>
                <p class="hint">{{ clubsHint }}</p>
              </div>
              <span v-if="selectedClubs.length" class="counter">{{ selectedClubs.length }}</span>
            </div>

            <p v-if="removedClubLabels.length" class="notice notice-info" role="status">
              Убраны клубы, где нет выбранных игроков: {{ removedClubLabels.join(', ') }}.
            </p>

            <p v-if="optionsError" class="notice notice-error" role="alert">
              {{ optionsError }}
              <button class="link-btn" type="button" @click="refreshOptions()">Повторить</button>
            </p>

            <div v-if="selectedClubs.length" class="chips" aria-label="Выбранные клубы">
              <span v-for="club in selectedClubs" :key="club.id" class="chip">
                <span class="chip-label">{{ club.displayLabel }}</span>
                <button
                  class="chip-remove"
                  type="button"
                  :aria-label="`Убрать клуб ${club.displayLabel}`"
                  @click="removeClub(club.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>

            <select
              id="club-select"
              class="select"
              :value="''"
              :disabled="optionsLoading || availableClubs.length === 0"
              @change="addClubFromSelect"
            >
              <option value="" disabled>{{ clubSelectPlaceholder }}</option>
              <option v-for="club in availableClubs" :key="club.id" :value="club.id">
                {{ club.displayLabel }}
              </option>
            </select>
          </section>

          <section class="filter-block" aria-labelledby="indi-section-title">
            <div class="switch-row">
              <div class="switch-text">
                <h3 id="indi-section-title" class="filter-label">Индивидуальные тренировки</h3>
                <p class="hint">{{ indiHint }}</p>
              </div>
              <button
                class="switch"
                type="button"
                role="switch"
                aria-labelledby="indi-section-title"
                :aria-checked="showIndi"
                :disabled="!indiToggleEnabled"
                @click="toggleIndi"
              >
                <span class="switch-thumb"></span>
              </button>
            </div>
          </section>
        </div>

        <footer class="dialog-footer">
          <button class="btn-ghost" type="button" @click="reset">Сбросить</button>
          <button class="btn-primary" type="button" :disabled="!canApply" @click="apply">
            Применить
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getErrorMessage, getFilterOptions, getPlayers } from '@/api'
import type { Club, FilterOptions, Player } from '@/api'

const props = defineProps<{
  players: Player[]
  clubs: Club[]
  includeIndi: boolean
  together: boolean
}>()

const emit = defineEmits<{
  close: []
  apply: [value: { players: Player[]; clubs: Club[]; includeIndi: boolean; together: boolean }]
}>()

const MIN_SEARCH_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 320
const OPTION_ID_PREFIX = 'player-option-'

const dialogRef = ref<HTMLElement | null>(null)
const playerInput = ref<HTMLInputElement | null>(null)

const selectedPlayers = ref<Player[]>([...props.players])
const selectedClubs = ref<Club[]>([...props.clubs])
const showIndi = ref(props.includeIndi)
const togetherMode = ref(props.together)

const options = ref<FilterOptions | null>(null)
const optionsLoading = ref(false)
const optionsError = ref<string | null>(null)
const removedClubLabels = ref<string[]>([])

const playerTerm = ref('')
const playerOptions = ref<Player[]>([])
const playerLoading = ref(false)
const playerSearchError = ref<string | null>(null)
const playerSearched = ref(false)
const suggestionsVisible = ref(false)
const activeOption = ref(-1)

let playerTimer: ReturnType<typeof setTimeout> | null = null
let searchVersion = 0
let optionsVersion = 0
let previousActiveElement: Element | null = null

const selectedPlayerIds = computed(() => selectedPlayers.value.map(player => player.id))
const maxTogetherPlayers = computed(() => options.value?.maxTogetherPlayers ?? 4)
const indiAvailable = computed(() => options.value?.indiAvailable ?? true)
const togetherAvailable = computed(() => options.value?.togetherAvailable ?? true)
const framesAvailable = computed(() => options.value?.framesAvailable ?? true)

const shownOptions = computed(() => options.value?.clubs ?? [])
const availableClubs = computed(() =>
  shownOptions.value.filter(
    option => !selectedClubs.value.some(club => club.id === option.id)
  )
)

const playerLimitReached = computed(
  () => togetherMode.value && selectedPlayers.value.length >= maxTogetherPlayers.value
)

const tooManyForTogether = computed(
  () => selectedPlayers.value.length > maxTogetherPlayers.value
)

const canUseTogether = computed(() => {
  if (selectedPlayers.value.length === 0 || togetherMode.value) {
    return true
  }
  if (tooManyForTogether.value) {
    return false
  }
  if (optionsLoading.value) {
    return false
  }
  return togetherAvailable.value
})

const canApply = computed(
  () =>
    !optionsLoading.value
    && framesAvailable.value
    && !(togetherMode.value && !togetherAvailable.value)
)

const indiToggleEnabled = computed(() => showIndi.value || indiAvailable.value)

const modeNoticeWarn = computed(
  () =>
    (togetherMode.value && tooManyForTogether.value)
    || (selectedPlayers.value.length > 0 && !framesAvailable.value)
)

const modeNotice = computed(() => {
  if (optionsLoading.value || !options.value) {
    return null
  }
  if (tooManyForTogether.value) {
    return togetherMode.value
      ? `В режиме «Все вместе» можно выбрать не более ${maxTogetherPlayers.value} игроков. `
        + 'Уберите лишних или выберите режим «Любой из игроков».'
      : `Режим «Все вместе» доступен для ${maxTogetherPlayers.value} игроков и меньше. `
        + 'Уберите лишних, чтобы его включить.'
  }
  if (selectedPlayers.value.length > 0 && !framesAvailable.value) {
    if (!showIndi.value && indiAvailable.value) {
      return 'У выбранных игроков нет игр. Включите индивидуальные тренировки или измените выбор.'
    }
    if (togetherMode.value) {
      return 'У выбранных игроков нет общих кадров. Уберите одного из игроков или выберите другой режим.'
    }
    return 'У выбранных игроков нет кадров под выбранные условия. Измените выбор.'
  }
  if (togetherMode.value) {
    if (!togetherAvailable.value) {
      return 'У выбранных игроков нет общих кадров. Уберите одного из игроков или выберите режим «Любой из игроков».'
    }
    return null
  }
  if (selectedPlayers.value.length < 2) {
    return null
  }
  if (!togetherAvailable.value) {
    return 'У выбранных игроков нет общих кадров — режим «Все вместе» сейчас недоступен.'
  }
  return null
})

const playerSearchHint = computed(() => {
  if (togetherMode.value) {
    return 'Показываем только игроков, у которых есть общие кадры с выбранными.'
  }
  return 'Поиск по имени или отображаемому имени.'
})

const clubsHint = computed(() => {
  if (optionsLoading.value) {
    return 'Обновляем список клубов под выбранных игроков...'
  }
  if (selectedPlayers.value.length === 0) {
    return 'Показаны клубы, в которых есть кадры.'
  }
  if (togetherMode.value) {
    return 'Показаны только клубы, где играли все выбранные игроки.'
  }
  return 'Показаны только клубы, где играл хотя бы один из выбранных игроков.'
})

const clubSelectPlaceholder = computed(() => {
  if (optionsLoading.value) {
    return 'Загрузка...'
  }
  if (availableClubs.value.length > 0) {
    return 'Добавить клуб...'
  }
  if (shownOptions.value.length === 0) {
    return selectedPlayers.value.length
      ? 'Нет клубов для выбранных игроков'
      : 'Нет доступных клубов'
  }
  return 'Все клубы уже выбраны'
})

const indiHint = computed(() => {
  if (optionsLoading.value) {
    return 'Проверяем доступность для выбранных игроков...'
  }
  if (!indiAvailable.value) {
    if (selectedPlayers.value.length === 0) {
      return 'Индивидуальные тренировки пока недоступны.'
    }
    return togetherMode.value
      ? 'У выбранных игроков нет общих индивидуальных тренировок.'
      : 'У выбранных игроков нет индивидуальных тренировок.'
  }
  if (selectedClubs.value.length > 0 && showIndi.value) {
    return 'Клубы относятся только к играм: при выбранных клубах кадры тренировок не показываются.'
  }
  if (selectedPlayers.value.length && togetherMode.value) {
    return 'Будут показаны только тренировки, где есть все выбранные игроки.'
  }
  if (selectedPlayers.value.length) {
    return 'Тренировки с любым из выбранных игроков.'
  }
  return 'Показывать кадры индивидуальных тренировок вместе с играми.'
})

const suggestionsOpen = computed(
  () =>
    suggestionsVisible.value
    && playerTerm.value.trim().length >= MIN_SEARCH_LENGTH
    && (playerLoading.value || playerOptions.value.length > 0 || playerSearched.value)
)

const activeDescendant = computed(() =>
  suggestionsOpen.value && activeOption.value >= 0
    ? optionId(activeOption.value)
    : undefined
)

const noPlayersText = computed(() => {
  if (playerSearchError.value) {
    return playerSearchError.value
  }
  if (togetherMode.value) {
    return 'Нет игроков, у которых есть общие кадры с выбранными.'
  }
  return 'Игроки не найдены. Попробуйте другое имя.'
})

function optionId(index: number): string {
  return `${OPTION_ID_PREFIX}${index}`
}

function clearPlayerTimer() {
  if (playerTimer) {
    clearTimeout(playerTimer)
    playerTimer = null
  }
}

function clearPlayerSearch() {
  searchVersion++
  clearPlayerTimer()
  playerOptions.value = []
  playerLoading.value = false
  playerSearchError.value = null
  playerSearched.value = false
  activeOption.value = -1
}

function resetPlayerSearch() {
  playerTerm.value = ''
  clearPlayerSearch()
}

async function searchPlayers() {
  const term = playerTerm.value.trim()
  if (term.length < MIN_SEARCH_LENGTH) {
    clearPlayerSearch()
    return
  }
  const version = ++searchVersion
  playerLoading.value = true
  playerSearchError.value = null
  playerOptions.value = []
  playerSearched.value = false
  try {
    const found = await getPlayers({
      term,
      players: selectedPlayerIds.value,
      together: togetherMode.value,
      indi: showIndi.value,
      availableOnly: true
    })
    if (version !== searchVersion) {
      return
    }
    playerOptions.value = found.filter(
      option => !selectedPlayers.value.some(player => player.id === option.id)
    )
    playerSearched.value = true
    activeOption.value = -1
  } catch (e) {
    if (version !== searchVersion) {
      return
    }
    playerOptions.value = []
    playerSearched.value = true
    playerSearchError.value = getErrorMessage(e, 'Не удалось найти игроков')
  } finally {
    if (version === searchVersion) {
      playerLoading.value = false
    }
  }
}

async function refreshOptions() {
  const version = ++optionsVersion
  optionsLoading.value = true
  optionsError.value = null
  try {
    const result = await getFilterOptions({
      players: selectedPlayerIds.value,
      together: togetherMode.value,
      indi: showIndi.value
    })
    if (version !== optionsVersion) {
      return
    }
    options.value = result
    applyOptions(result)
  } catch (e) {
    if (version !== optionsVersion) {
      return
    }
    optionsError.value = getErrorMessage(e, 'Не удалось обновить доступные фильтры')
  } finally {
    if (version === optionsVersion) {
      optionsLoading.value = false
    }
  }
}

function applyOptions(result: FilterOptions) {
  if (showIndi.value && !result.indiAvailable) {
    showIndi.value = false
  }

  const eligible = new Map(result.clubs.map(club => [club.id, club]))
  const removed = selectedClubs.value.filter(club => !eligible.has(club.id))
  if (removed.length > 0) {
    selectedClubs.value = selectedClubs.value.filter(club => eligible.has(club.id))
    removedClubLabels.value = removed.map(club => club.displayLabel)
  } else {
    removedClubLabels.value = []
  }
}

function addPlayer(player: Player) {
  if (playerLimitReached.value) {
    return
  }
  if (selectedPlayers.value.some(item => item.id === player.id)) {
    return
  }
  selectedPlayers.value = [...selectedPlayers.value, player]
  resetPlayerSearch()
}

function removePlayer(id: string) {
  selectedPlayers.value = selectedPlayers.value.filter(player => player.id !== id)
  resetPlayerSearch()
}

function addClubFromSelect(event: Event) {
  const select = event.target as HTMLSelectElement
  const club = shownOptions.value.find(option => option.id === select.value)
  select.value = ''
  if (club && !selectedClubs.value.some(item => item.id === club.id)) {
    selectedClubs.value = [...selectedClubs.value, club]
  }
}

function removeClub(id: string) {
  selectedClubs.value = selectedClubs.value.filter(club => club.id !== id)
}

function toggleIndi() {
  if (!showIndi.value && !indiAvailable.value) {
    return
  }
  showIndi.value = !showIndi.value
  resetPlayerSearch()
}

function reset() {
  selectedPlayers.value = []
  selectedClubs.value = []
  showIndi.value = false
  togetherMode.value = false
  removedClubLabels.value = []
  resetPlayerSearch()
}

function apply() {
  if (!canApply.value) {
    return
  }
  emit('apply', {
    players: [...selectedPlayers.value],
    clubs: [...selectedClubs.value],
    includeIndi: showIndi.value,
    together: togetherMode.value
  })
}

function onPlayerFocus() {
  if (playerTerm.value.trim().length >= MIN_SEARCH_LENGTH) {
    suggestionsVisible.value = true
  }
}

function onPlayerBlur() {
  window.setTimeout(() => {
    suggestionsVisible.value = false
  }, 120)
}

function onPlayerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (suggestionsOpen.value) {
      event.preventDefault()
      event.stopPropagation()
      resetPlayerSearch()
    }
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (!suggestionsOpen.value || playerOptions.value.length === 0) {
      return
    }
    event.preventDefault()
    const count = playerOptions.value.length
    const delta = event.key === 'ArrowDown' ? 1 : -1
    activeOption.value = (activeOption.value + delta + count) % count
    return
  }
  if (event.key === 'Enter') {
    const option = activeOption.value >= 0
      ? playerOptions.value[activeOption.value]
      : playerOptions.value.length === 1
        ? playerOptions.value[0]
        : null
    if (option) {
      event.preventDefault()
      addPlayer(option)
    }
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !dialogRef.value) {
    return
  }
  const focusable = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(element => element.offsetParent !== null)
  if (focusable.length === 0) {
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(playerTerm, term => {
  suggestionsVisible.value = true
  clearPlayerTimer()
  if (term.trim().length < MIN_SEARCH_LENGTH) {
    clearPlayerSearch()
    return
  }
  searchVersion++
  playerTimer = setTimeout(searchPlayers, SEARCH_DEBOUNCE_MS)
})

watch([selectedPlayerIds, togetherMode, showIndi], () => {
  resetPlayerSearch()
  void refreshOptions()
})

onMounted(async () => {
  previousActiveElement = document.activeElement
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
  await refreshOptions()
  await nextTick()
  playerInput.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  clearPlayerTimer()
  if (previousActiveElement instanceof HTMLElement) {
    previousActiveElement.focus()
  }
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
  width: min(600px, 100%);
  max-height: min(92vh, 860px);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: var(--shadow-strong);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.dialog-heading {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.dialog-header h2 {
  font-size: 1.15rem;
}

.dialog-subtitle {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.icon-btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
}

.icon-btn svg {
  width: 18px;
  height: 18px;
}

.icon-btn:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.1rem 1.25rem;
  overflow-y: auto;
}

.filter-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid var(--color-row-border);
}

.filter-block:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.block-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.filter-label {
  font-size: 0.95rem;
  font-weight: 600;
}

.hint {
  margin-top: 0.15rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.4;
}

.counter {
  flex: 0 0 auto;
  min-width: 30px;
  padding: 0.1rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.78rem;
}

.counter.warn {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.mode-option {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.mode-option:hover {
  border-color: var(--text-secondary);
}

.mode-option:has(input:focus-visible) {
  outline: 2px solid var(--text-muted);
  outline-offset: 1px;
}

.mode-option.active {
  border-color: var(--text-primary);
  background: var(--color-primary-soft);
}

.mode-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-title {
  font-weight: 600;
  font-size: 0.85rem;
}

.mode-hint {
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.2rem 0.3rem 0.2rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--accent-dark);
  color: var(--text-primary);
  font-size: 0.83rem;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.chip-remove svg {
  width: 13px;
  height: 13px;
}

.chip-remove:hover {
  background: var(--color-primary-soft);
}

.combobox {
  position: relative;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.8rem;
  width: 17px;
  height: 17px;
  color: var(--text-secondary);
  pointer-events: none;
}

.search {
  width: 100%;
  min-height: 44px;
  padding: 0.55rem 2.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
}

.search::placeholder {
  color: var(--text-secondary);
}

.search:focus {
  outline: 2px solid var(--text-muted);
  border-color: var(--text-secondary);
}

.search:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.clear-search {
  position: absolute;
  right: 0.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.clear-search svg {
  width: 14px;
  height: 14px;
}

.clear-search:hover {
  background: var(--color-primary-soft);
  color: var(--text-primary);
}

.spinner {
  position: absolute;
  right: 0.85rem;
  width: 16px;
  height: 16px;
  border: 2px solid var(--text-muted);
  border-top-color: var(--text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.suggestions {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  max-height: 220px;
  padding: 0.3rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  box-shadow: var(--shadow-strong);
  overflow-y: auto;
}

.suggestion {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  width: 100%;
  padding: 0.5rem 0.6rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.suggestion:hover,
.suggestion.active {
  background: var(--color-primary-soft);
}

.suggestion-label {
  font-size: 0.88rem;
}

.suggestion-meta {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.suggestions-state {
  padding: 0.6rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.select {
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
}

.select:focus {
  outline: 2px solid var(--text-muted);
  border-color: var(--text-secondary);
}

.select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.switch-text {
  min-width: 0;
}

.switch {
  position: relative;
  flex: 0 0 auto;
  width: 46px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: transform 0.15s, background-color 0.15s;
}

.switch[aria-checked='true'] {
  border-color: var(--text-primary);
  background: var(--text-primary);
}

.switch[aria-checked='true'] .switch-thumb {
  transform: translateX(20px);
  background: var(--accent-dark);
}

.switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.notice {
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  font-size: 0.8rem;
  line-height: 1.4;
}

.notice-warn {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.notice-info {
  border-color: var(--color-border);
  background: var(--color-bg);
  color: var(--text-secondary);
}

.notice-error {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

.btn-ghost,
.btn-primary {
  min-height: 44px;
  padding: 0.5rem 1.3rem;
  border-radius: 7px;
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

.btn-primary:hover:not(:disabled) {
  border-color: var(--btn-primary-bg-hover);
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .backdrop {
    align-items: flex-end;
    padding: 0;
  }

  .dialog {
    width: 100%;
    max-height: 94vh;
    border-bottom: none;
    border-radius: 16px 16px 0 0;
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .dialog-footer {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }

  .btn-ghost,
  .btn-primary {
    flex: 1;
  }

  .mode-switch {
    grid-template-columns: 1fr;
  }
}
</style>
