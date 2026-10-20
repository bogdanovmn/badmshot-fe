<template>
  <div class="page">
    <h1>Игроки</h1>
    <p class="hint">Псевдонимы и отображаемые имена. Поиск по имени.</p>

    <input v-model="term" class="search" type="text" placeholder="Поиск игрока..." />

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="players.length === 0" class="empty">Игроки не найдены.</div>
    <div v-else class="list">
      <div v-for="player in players" :key="player.id" class="row">
        <div class="row-name">
          <span class="name">{{ player.name }}</span>
          <span class="label">{{ player.displayLabel }}</span>
        </div>
        <label class="field">
          <span>Отображаемое имя</span>
          <input v-model="edits[player.id].displayName" type="text" />
        </label>
        <label class="field">
          <span>Псевдоним</span>
          <input v-model="edits[player.id].tournamentAlias" type="text" />
        </label>
        <div class="row-actions">
          <button class="btn-primary" :disabled="savingId === player.id || !isDirty(player)" @click="save(player)">
            {{ savingId === player.id ? '...' : 'Сохранить' }}
          </button>
          <span v-if="savedId === player.id" class="success">Ок</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { getPlayers, updatePlayer } from '@/api'
import type { Player } from '@/api'

const term = ref('')
const players = ref<Player[]>([])
const edits = reactive<Record<string, { displayName: string; tournamentAlias: string }>>({})
const loading = ref(true)
const error = ref<string | null>(null)
const savingId = ref<string | null>(null)
const savedId = ref<string | null>(null)

let timer: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  error.value = null
  try {
    players.value = await getPlayers({ term: term.value || undefined })
    players.value.forEach(player => {
      edits[player.id] = {
        displayName: player.displayName || '',
        tournamentAlias: player.tournamentAlias || ''
      }
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить игроков'
  } finally {
    loading.value = false
  }
}

function isDirty(player: Player): boolean {
  const edit = edits[player.id]
  if (!edit) {
    return false
  }
  return edit.displayName !== (player.displayName || '') || edit.tournamentAlias !== (player.tournamentAlias || '')
}

async function save(player: Player) {
  const edit = edits[player.id]
  if (!edit || savingId.value) {
    return
  }
  savingId.value = player.id
  savedId.value = null
  error.value = null
  try {
    await updatePlayer(player.id, {
      displayName: edit.displayName || null,
      tournamentAlias: edit.tournamentAlias || null
    })
    player.displayName = edit.displayName || null
    player.tournamentAlias = edit.tournamentAlias || null
    player.displayLabel = edit.displayName || player.name
    savedId.value = player.id
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось сохранить игрока'
  } finally {
    savingId.value = null
  }
}

watch(term, () => {
  if (timer) {
    clearTimeout(timer)
  }
  timer = setTimeout(load, 300)
})

onMounted(load)
onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer)
  }
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h1 {
  font-size: 1.4rem;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.search {
  width: 100%;
  max-width: 360px;
  min-height: 40px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

@media (min-width: 720px) {
  .row {
    grid-template-columns: minmax(160px, 1fr) 1fr 1fr auto;
    align-items: end;
  }
}

.row-name {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.name {
  font-weight: 600;
}

.label {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.field input {
  min-height: 40px;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  min-height: 40px;
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--btn-primary-bg);
  border-radius: 6px;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
  border-color: var(--btn-primary-bg-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.success {
  color: var(--color-success);
  font-size: 0.85rem;
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

.empty {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
