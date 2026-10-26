<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="close">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="player-rename-title">
        <header class="dialog-header">
          <div>
            <h2 id="player-rename-title">Массовое переименование</h2>
            <p class="dialog-subtitle">
              Имя будет изменено во всех файлах и метаинформации выбранного игрока.
            </p>
          </div>
          <button class="close-btn" type="button" aria-label="Закрыть" @click="close">×</button>
        </header>

        <div class="dialog-body">
          <div v-if="loading" class="state">Загрузка матчей...</div>
          <div v-else-if="loadError" class="state state--error">{{ loadError }}</div>
          <template v-else-if="info">
            <label class="field">
              <span>Имя игрока в файлах</span>
              <input
                v-model="name"
                type="text"
                autocomplete="off"
                :disabled="saving"
                @keydown.enter.prevent="askConfirmation"
              />
            </label>
            <p v-if="validationHint" class="hint hint--warning">{{ validationHint }}</p>
            <p v-else class="hint">
              Текущее имя: <strong>{{ info.player.name }}</strong>.
              Найдено матчей: {{ info.matches.length }}.
            </p>

            <section class="matches">
              <div class="matches-head">
                <span>Матчи с игроком</span>
                <span class="matches-count">{{ info.matches.length }}</span>
              </div>
              <div v-if="info.matches.length === 0" class="matches-empty">Матчи не найдены.</div>
              <ul v-else class="matches-list">
                <li v-for="match in info.matches" :key="match.id" :title="match.relPath">
                  <router-link class="match-link" :to="`/archive/matches/${match.id}`">
                    <span v-if="match.club" class="match-club">{{ match.club }} - </span>
                    <template v-for="(playerName, index) in match.players" :key="index">
                      <span
                        class="match-player"
                        :class="{ 'match-player--selected': match.selectedPositions.includes(index) }"
                      >{{ playerName }}</span>
                      <span v-if="index < match.players.length - 1"> / </span>
                    </template>
                  </router-link>
                </li>
              </ul>
            </section>

            <div v-if="confirming" class="confirm">
              <p>
                Переименовать «{{ info.player.name }}» в «{{ trimmedName }}»?
                Имя будет заменено в файлах на диске и в метаинформации.
                Найдено матчей с игроком: {{ info.matches.length }}.
                Отменить это действие нельзя.
              </p>
            </div>

            <ErrorNotice v-if="error" :message="error" />
          </template>
        </div>

        <footer class="dialog-footer">
          <template v-if="confirming">
            <button class="btn-secondary" type="button" :disabled="saving" @click="confirming = false">
              Отмена
            </button>
            <button class="btn-primary" type="button" :disabled="saving" @click="apply">
              {{ saving ? 'Переименование...' : 'Да, переименовать' }}
            </button>
          </template>
          <template v-else>
            <button class="btn-secondary" type="button" @click="close">Закрыть</button>
            <button class="btn-primary" type="button" :disabled="!canSave" @click="askConfirmation">
              Сохранить везде
            </button>
          </template>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getErrorMessage, getPlayerRenameInfo, renamePlayerEverywhere } from '@/api'
import type { Player, PlayerRenameInfo, PlayerRenameResult } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'

const props = defineProps<{ player: Player }>()
const emit = defineEmits<{ close: []; renamed: [result: PlayerRenameResult] }>()

const info = ref<PlayerRenameInfo | null>(null)
const name = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)
const error = ref<string | null>(null)
const saving = ref(false)
const confirming = ref(false)

const trimmedName = computed(() => name.value.trim())

const validationHint = computed(() => {
  const value = trimmedName.value
  if (!value) {
    return 'Имя игрока не может быть пустым.'
  }
  if (value.length > 200) {
    return 'Имя игрока слишком длинное (максимум 200 символов).'
  }
  if (value.toLowerCase() === 'skip') {
    return 'Имя skip зарезервировано для заглушки.'
  }
  if (value.includes('-') || value.includes('/') || value.includes('\\')) {
    return 'Имя не может содержать символы -, / и \\'
  }
  if (info.value && value === info.value.player.name) {
    return 'Имя совпадает с текущим.'
  }
  return null
})

const canSave = computed(() => !loading.value
  && !saving.value
  && info.value !== null
  && validationHint.value === null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    info.value = await getPlayerRenameInfo(props.player.id)
    name.value = info.value.player.name
  } catch (e) {
    loadError.value = getErrorMessage(e, 'Не удалось загрузить данные игрока')
  } finally {
    loading.value = false
  }
}

function askConfirmation() {
  if (canSave.value) {
    error.value = null
    confirming.value = true
  }
}

async function apply() {
  if (!canSave.value || saving.value) {
    return
  }
  saving.value = true
  error.value = null
  try {
    const result = await renamePlayerEverywhere(props.player.id, trimmedName.value)
    emit('renamed', result)
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось переименовать игрока')
    confirming.value = false
  } finally {
    saving.value = false
  }
}

function close() {
  if (!saving.value) {
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') {
    return
  }
  if (confirming.value) {
    confirming.value = false
  } else {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
  void load()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
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
  width: min(640px, 100%);
  max-height: min(90vh, 760px);
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
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h2 {
  font-size: 1.1rem;
}

.dialog-subtitle {
  margin-top: 0.15rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.close-btn {
  flex: 0 0 auto;
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
  gap: 0.7rem;
  padding: 1.25rem;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.9rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

.state {
  padding: 1rem 0;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.state--error {
  color: var(--color-danger);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.field input {
  min-height: 42px;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--text-primary);
}

.field input:focus {
  outline: 2px solid var(--text-muted);
  border-color: var(--text-secondary);
}

.hint {
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.4;
}

.hint--warning {
  color: var(--color-danger);
}

.matches {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.matches-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.matches-count {
  padding: 0.05rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.matches-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-height: 240px;
  margin: 0;
  padding: 0.35rem 0.5rem;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
}

.matches-list li {
  padding: 0.3rem 0.35rem;
  border-bottom: 1px solid rgba(85, 86, 79, 0.35);
  font-size: 0.85rem;
}

.matches-list li:last-child {
  border-bottom: none;
}

.match-club {
  color: var(--text-secondary);
}

.match-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.match-link:hover {
  color: var(--color-primary);
}

.match-player--selected {
  padding: 0.05rem 0.25rem;
  border-radius: 4px;
  background: var(--color-primary-soft);
  color: var(--text-primary);
  font-weight: 600;
}

.matches-empty {
  padding: 0.7rem;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.85rem;
}

.confirm {
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--color-danger);
  border-radius: 8px;
  background: var(--color-danger-soft);
  color: var(--text-primary);
  font-size: 0.85rem;
  line-height: 1.4;
}

.btn-primary,
.btn-secondary {
  min-height: 42px;
  padding: 0.45rem 1.1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  border: 1px solid var(--btn-primary-bg);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.btn-primary:hover:not(:disabled) {
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
  border-color: var(--btn-primary-bg-hover);
}

.btn-secondary {
  border: 1px solid var(--btn-ghost-border);
  background: transparent;
  color: var(--text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--accent-dark);
  border-color: var(--text-primary);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
