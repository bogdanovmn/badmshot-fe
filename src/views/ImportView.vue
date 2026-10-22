<template>
  <div class="page">
    <div class="heading-row">
      <BackButton fallback="/archive" />
      <h1>Импорт сессии</h1>
    </div>

    <p class="hint">
      Загрузите ZIP-архив сессии, полученный на домашнем сервере. Архив должен содержать
      session.json и кадры, описанные в нём. Размер загрузки ограничен настройками сервера.
    </p>

    <div v-if="capabilities && !capabilities.importEnabled" class="empty">
      Импорт отключён на этом сервере.
    </div>

    <section v-else class="upload">
      <label class="field">
        <span>ZIP-архив</span>
        <input ref="fileInput" type="file" accept=".zip,application/zip" @change="pickFile" />
      </label>
      <div class="actions">
        <button class="btn-primary" :disabled="!file || starting || active" @click="start">
          {{ starting ? 'Загрузка...' : 'Импортировать' }}
        </button>
        <button class="btn-secondary" :disabled="cancelling || !active" @click="cancel">
          Отменить
        </button>
      </div>
    </section>

    <div v-if="error" class="error">{{ error }}</div>

    <section v-if="job" class="status">
      <div class="status-head">
        <span class="badge" :class="statusClass">{{ statusLabel }}</span>
        <span class="phase">{{ phaseLabel }}</span>
        <span class="job-id">{{ job.id }}</span>
      </div>

      <div v-if="job.totalFiles > 0" class="progress">
        <div class="progress-bar" :style="{ width: percent + '%' }"></div>
      </div>

      <div class="numbers">
        <div><span class="number">{{ job.processedFiles }}</span> / {{ job.totalFiles }} матчей</div>
        <div><span class="number">{{ job.screenshotsCreated }}</span> кадров</div>
      </div>

      <div class="times">
        <span>Начало: {{ formatDateTime(job.startedAt) }}</span>
        <span>Длительность: {{ formatElapsed(durationSeconds) }}</span>
        <span>Активность: {{ formatDateTime(job.lastActivityAt) }}</span>
        <span v-if="job.finishedAt">Завершено: {{ formatDateTime(job.finishedAt) }}</span>
      </div>

      <div v-if="job.error" class="job-error">{{ job.error }}</div>
    </section>
    <div v-else-if="!loading" class="empty">Активных импортов нет.</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  cancelImportJob,
  getArchiveCapabilities,
  getImportJob,
  startImportJob
} from '@/api'
import type { ArchiveCapabilities, JobResponse } from '@/api'
import BackButton from '@/components/BackButton.vue'
import { formatElapsed } from '@/common'

const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const capabilities = ref<ArchiveCapabilities | null>(null)
const job = ref<JobResponse | null>(null)
const loading = ref(true)
const starting = ref(false)
const cancelling = ref(false)
const error = ref<string | null>(null)

let timer: ReturnType<typeof setInterval> | null = null

const active = computed(() => job.value !== null && (job.value.status === 'RUNNING' || job.value.status === 'CANCELLING'))
const percent = computed(() => {
  if (!job.value || job.value.totalFiles === 0) {
    return 0
  }
  return Math.min(100, Math.round((job.value.processedFiles / job.value.totalFiles) * 100))
})
const durationSeconds = computed(() => {
  if (!job.value) {
    return 0
  }
  const started = new Date(job.value.startedAt).getTime()
  const finished = job.value.finishedAt ? new Date(job.value.finishedAt).getTime() : Date.now()
  return Math.max(0, Math.round((finished - started) / 1000))
})

const statusLabels: Record<string, string> = {
  RUNNING: 'Выполняется',
  CANCELLING: 'Отмена...',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
  FAILED: 'Ошибка',
  STUCK: 'Завис'
}

const statusLabel = computed(() => job.value ? statusLabels[job.value.status] || job.value.status : '')
const statusClass = computed(() => job.value ? job.value.status.toLowerCase() : '')
const phaseLabels: Record<string, string> = {
  IMPORT: 'Импорт',
  DONE: 'Готово'
}
const phaseLabel = computed(() => {
  if (!job.value?.phase) {
    return '—'
  }
  return phaseLabels[job.value.phase] || job.value.phase
})

function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ru-RU')
}

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
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

async function refresh() {
  try {
    job.value = await getImportJob()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось получить статус импорта'
  } finally {
    loading.value = false
  }
  schedule()
}

function schedule() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (active.value) {
    timer = setInterval(refresh, 2000)
  }
}

async function start() {
  if (!file.value) {
    return
  }
  starting.value = true
  error.value = null
  try {
    job.value = await startImportJob(file.value)
    file.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    schedule()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось запустить импорт'
  } finally {
    starting.value = false
  }
}

async function cancel() {
  cancelling.value = true
  error.value = null
  try {
    await cancelImportJob()
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось отменить импорт'
  } finally {
    cancelling.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadCapabilities(), refresh()])
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
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

.hint {
  max-width: 780px;
  color: var(--color-muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.upload {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 520px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.field input {
  min-height: 40px;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  min-height: 44px;
  padding: 0.55rem 1.4rem;
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

.status {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.status-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.15rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.badge.running,
.badge.cancelling {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.badge.completed {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.badge.failed,
.badge.stuck {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.phase,
.job-id {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.job-id {
  font-family: monospace;
  word-break: break-all;
}

.progress {
  height: 10px;
  border-radius: 5px;
  background: var(--color-primary-soft);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s;
}

.numbers {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.number {
  font-weight: 700;
  color: var(--color-text);
}

.times {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.job-error {
  color: var(--color-danger);
  font-size: 0.9rem;
}

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
