<template>
  <div class="page">
    <h1 v-if="!embedded">Клубы</h1>
    <p class="hint">Название из имени файла остаётся техническим идентификатором. Здесь задаётся имя для отображения.</p>

    <ErrorNotice v-if="error" :message="error" />
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="clubs.length === 0" class="empty">Клубы не найдены.</div>
    <div v-else class="list">
      <div v-for="club in clubs" :key="club.id" class="row">
        <div class="row-name">
          <span class="name">{{ club.name }}</span>
          <span class="label">{{ club.displayLabel }}</span>
        </div>
        <label class="field">
          <span>Отображаемое имя</span>
          <input v-model="edits[club.id].displayName" type="text" />
        </label>
        <div class="row-actions">
          <button class="btn-primary" :disabled="savingId === club.id || !isDirty(club)" @click="save(club)">
            {{ savingId === club.id ? '...' : 'Сохранить' }}
          </button>
          <span v-if="savedId === club.id" class="success">Ок</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getAdminClubs, getErrorMessage, updateClub } from '@/api'
import type { Club } from '@/api'
import ErrorNotice from '@/components/ErrorNotice.vue'

defineProps<{ embedded?: boolean }>()

const clubs = ref<Club[]>([])
const edits = reactive<Record<string, { displayName: string }>>({})
const loading = ref(true)
const error = ref<string | null>(null)
const savingId = ref<string | null>(null)
const savedId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    clubs.value = await getAdminClubs()
    clubs.value.forEach(club => {
      edits[club.id] = {
        displayName: club.displayName || ''
      }
    })
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить клубы')
  } finally {
    loading.value = false
  }
}

function isDirty(club: Club): boolean {
  const edit = edits[club.id]
  if (!edit) {
    return false
  }
  return edit.displayName !== (club.displayName || '')
}

async function save(club: Club) {
  const edit = edits[club.id]
  if (!edit || savingId.value) {
    return
  }
  savingId.value = club.id
  savedId.value = null
  error.value = null
  try {
    await updateClub(club.id, edit.displayName || null)
    club.displayName = edit.displayName || null
    club.displayLabel = edit.displayName || club.name
    savedId.value = club.id
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось сохранить клуб')
  } finally {
    savingId.value = null
  }
}

onMounted(load)
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
    grid-template-columns: minmax(160px, 1fr) 1fr auto;
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
