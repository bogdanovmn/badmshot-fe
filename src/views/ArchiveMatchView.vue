<template>
  <div class="page">
    <div class="heading-row">
      <BackButton fallback="/archive" />
      <h1>{{ pageTitle }}</h1>
    </div>

    <ErrorNotice v-if="error" :message="error" />
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="detail" class="content">
      <section class="info">
        <div class="path">{{ detail.match.relPath }}</div>
        <div class="info-grid">
          <div class="info-item"><span class="label">Тип</span><span>{{ typeLabel }}</span></div>
          <div class="info-item"><span class="label">Дата</span><span>{{ detail.match.matchDate || '—' }}</span></div>
          <div v-if="detail.match.type === 'GAMES'" class="info-item">
            <span class="label">Клуб</span><span>{{ detail.match.clubName || '—' }}</span>
          </div>
          <div v-if="detail.match.type === 'GAMES'" class="info-item">
            <span class="label">Турнир</span><span>{{ tournamentLabel }}</span>
          </div>
          <div v-if="detail.match.comment" class="info-item">
            <span class="label">Комментарий</span><span>{{ detail.match.comment }}</span>
          </div>
          <div class="info-item"><span class="label">Длительность</span><span>{{ formatDurationHuman(detail.match.durationSeconds) }}</span></div>
          <div class="info-item"><span class="label">Размер</span><span>{{ formatBytesHuman(detail.match.sizeMbytes) }}</span></div>
          <div class="info-item"><span class="label">Кадров</span><span>{{ detail.screenshots.length }}</span></div>
        </div>
        <div v-if="detail.match.validationError" class="validation">{{ detail.match.validationError }}</div>
        <div class="danger-row">
          <button class="btn-danger" :disabled="deletingMatch" @click="deleteMetadata">
            {{ deletingMatch ? 'Удаление...' : 'Удалить метаинформацию' }}
          </button>
          <span class="danger-hint">Видеофайл на диске останется, будут удалены данные и все кадры.</span>
        </div>
      </section>

      <section v-if="capabilities && !capabilities.readOnly" class="rename">
        <h2>Игроки (переименование файла)</h2>
        <div class="rename-rows">
          <div v-for="(player, index) in editPlayers" :key="index" class="rename-row">
            <input v-model="editPlayers[index]" class="rename-input" type="text" />
            <button
              v-if="isIndi && editPlayers.length > 1"
              class="btn-secondary btn-remove"
              :disabled="saving"
              @click="removePlayer(index)"
            >
              Удалить
            </button>
          </div>
        </div>
        <div v-if="isIndi" class="rename-actions">
          <button
            class="btn-secondary"
            :disabled="saving || editPlayers.length >= 2"
            @click="addPlayer"
          >
            Добавить игрока
          </button>
        </div>
        <div v-if="isIndi && !renameValid" class="hint">
          Укажите одного игрока misha или двух игроков.
        </div>
        <div class="rename-actions">
          <button class="btn-primary" :disabled="saving || !renameChanged || !renameValid" @click="save">
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <button class="btn-secondary" :disabled="saving" @click="resetEdit">Сбросить</button>
          <span v-if="success" class="success">Переименовано</span>
        </div>
      </section>

      <section class="screenshots">
        <h2>Кадры</h2>
        <div v-if="detail.screenshots.length === 0" class="empty">Кадры не найдены.</div>
        <div v-else class="shot-grid">
          <div v-for="shot in detail.screenshots" :key="shot.id" class="shot-wrap">
            <router-link
              class="shot"
              :to="`/archive/matches/${detail.match.id}`"
              @click.prevent="openShot(shot.id)"
            >
              <ScreenshotImage
                :id="shot.id"
                :width="320"
                :alt="`Кадр ${formatTimecode(shot.timecodeSeconds)}`"
              />
              <span class="shot-time">{{ formatTimecode(shot.timecodeSeconds) }}</span>
              <span class="shot-size">{{ formatSizeKb(shot.sizeBytes) }}</span>
            </router-link>
            <button
              class="shot-delete"
              type="button"
              title="Удалить кадр"
              aria-label="Удалить кадр"
              :disabled="deletingShotId === shot.id"
              @click="deleteShot(shot)"
            >
              ×
            </button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="preview" class="lightbox" @click="preview = null">
      <ScreenshotImage :id="preview" :width="1280" alt="Кадр" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  deleteMatchMetadata,
  deleteMatchScreenshot,
  getArchiveCapabilities,
  getErrorMessage,
  getMatch,
  renameMatch
} from '@/api'
import type { ArchiveCapabilities, MatchDetail, Screenshot } from '@/api'
import BackButton from '@/components/BackButton.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import ScreenshotImage from '@/components/ScreenshotImage.vue'
import { formatBytesHuman, formatDurationHuman, formatTimecode } from '@/common'

const props = defineProps<{ id: string }>()

const router = useRouter()
const detail = ref<MatchDetail | null>(null)
const capabilities = ref<ArchiveCapabilities | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const deletingMatch = ref(false)
const deletingShotId = ref<string | null>(null)

const isIndi = computed(() => detail.value?.match.type === 'INDI')

const typeLabel = computed(() => isIndi.value
  ? 'Индивидуальная тренировка'
  : 'Игровой матч')

const pageTitle = computed(() => isIndi.value ? 'Тренировка' : 'Матч')

const tournamentLabel = computed(() => {
  if (!detail.value?.match.tournament) {
    return 'нет'
  }
  const group = detail.value.match.group
  return group ? `да · группа ${group}` : 'да'
})

const editPlayers = ref<string[]>([])
const saving = ref(false)
const success = ref(false)
const preview = ref<string | null>(null)

const renameChanged = computed(() => {
  if (!detail.value) {
    return false
  }
  const original = detail.value.players.map(player => player.name)
  return editPlayers.value.length !== original.length
    || editPlayers.value.some((name, index) => name !== original[index])
})

const renameValid = computed(() => {
  if (!isIndi.value) {
    return true
  }
  return editPlayers.value.length === 2
    || (editPlayers.value.length === 1 && editPlayers.value[0]?.trim() === 'misha')
})

async function load() {
  loading.value = true
  error.value = null
  try {
    detail.value = await getMatch(props.id)
    editPlayers.value = detail.value.players.map(player => player.name)
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось загрузить матч')
  } finally {
    loading.value = false
  }
}

async function loadCapabilities() {
  try {
    capabilities.value = await getArchiveCapabilities()
  } catch {
    capabilities.value = {
      exportEnabled: false,
      importEnabled: false,
      indexEnabled: false,
      readOnly: true
    }
  }
}

function resetEdit() {
  if (detail.value) {
    editPlayers.value = detail.value.players.map(player => player.name)
  }
}

function addPlayer() {
  if (editPlayers.value.length < 2) {
    editPlayers.value.push('')
  }
}

function removePlayer(index: number) {
  editPlayers.value.splice(index, 1)
}

async function save() {
  if (saving.value) {
    return
  }
  saving.value = true
  success.value = false
  error.value = null
  try {
    await renameMatch(props.id, editPlayers.value)
    await load()
    success.value = true
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось переименовать файл')
  } finally {
    saving.value = false
  }
}

function openShot(id: string) {
  preview.value = id
}

function formatSizeKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

async function deleteMetadata() {
  if (deletingMatch.value) {
    return
  }
  const confirmed = window.confirm(
    'Удалить метаинформацию об этом матче и все его кадры? Видеофайл на диске останется.'
  )
  if (!confirmed) {
    return
  }
  deletingMatch.value = true
  error.value = null
  try {
    await deleteMatchMetadata(props.id)
    await router.push('/archive')
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось удалить метаинформацию')
  } finally {
    deletingMatch.value = false
  }
}

async function deleteShot(shot: Screenshot) {
  if (deletingShotId.value) {
    return
  }
  const confirmed = window.confirm(
    `Удалить кадр ${formatTimecode(shot.timecodeSeconds)}?`
  )
  if (!confirmed) {
    return
  }
  deletingShotId.value = shot.id
  error.value = null
  try {
    await deleteMatchScreenshot(props.id, shot.id)
    if (detail.value) {
      detail.value = {
        ...detail.value,
        screenshots: detail.value.screenshots.filter(item => item.id !== shot.id)
      }
    }
    if (preview.value === shot.id) {
      preview.value = null
    }
  } catch (e) {
    error.value = getErrorMessage(e, 'Не удалось удалить кадр')
  } finally {
    deletingShotId.value = null
  }
}

onMounted(async () => {
  await Promise.all([load(), loadCapabilities()])
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.heading-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

h1 {
  font-size: 1.4rem;
}

h2 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.path {
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
  color: var(--color-muted);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
}

.label {
  color: var(--color-muted);
  font-size: 0.75rem;
}

.validation {
  color: var(--color-danger);
  font-size: 0.85rem;
}

.danger-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(85, 86, 79, 0.5);
}

.danger-hint {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.btn-danger {
  min-height: 40px;
  padding: 0.45rem 1rem;
  border: 1px solid var(--color-danger);
  border-radius: 6px;
  background: transparent;
  color: var(--color-danger);
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger);
  color: var(--accent-dark);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: default;
}

.rename-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 420px;
}

.rename-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-remove {
  flex-shrink: 0;
  min-height: 40px;
}

.hint {
  margin-top: 0.5rem;
  color: var(--color-muted);
  font-size: 0.85rem;
}

.rename-input {
  width: 100%;
  min-height: 40px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
}

.rename-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  min-height: 42px;
  padding: 0.5rem 1.2rem;
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

.success {
  color: var(--color-success);
  font-size: 0.9rem;
}

.shot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.6rem;
}

.shot-wrap {
  position: relative;
  min-width: 0;
}

.shot {
  position: relative;
  display: block;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.shot img {
  display: block;
  width: 100%;
}

.shot-time {
  position: absolute;
  right: 0.35rem;
  bottom: 0.35rem;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  background: var(--color-overlay);
  color: var(--text-primary);
  font-size: 0.75rem;
}

.shot-size {
  position: absolute;
  right: 0.35rem;
  top: 0.35rem;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  background: var(--color-overlay);
  color: var(--text-primary);
  font-size: 0.75rem;
}

.shot-delete {
  position: absolute;
  left: 0.35rem;
  top: 0.35rem;
  z-index: 1;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-overlay);
  color: var(--text-primary);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.shot-delete:hover:not(:disabled) {
  border-color: var(--color-danger);
  background: var(--color-danger);
  color: var(--accent-dark);
}

.shot-delete:disabled {
  opacity: 0.6;
  cursor: default;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--color-overlay);
  cursor: pointer;
}

.lightbox img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
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
