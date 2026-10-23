<template>
  <div class="page">
    <div class="heading-row">
      <BackButton fallback="/archive" />
      <h1>Управление архивом</h1>
    </div>

    <p class="hint">
      Обновление метаинформации проверяет структуру архива и имена файлов, не создавая кадры.
      Перезапись кадров удаляет все скриншоты из БД и создаёт их заново с текущими параметрами.
    </p>

    <div v-if="capabilities && !capabilities.indexEnabled" class="empty">
      Индексация отключена на этом сервере.
    </div>

    <div class="actions">
      <button
        class="btn-primary"
        :disabled="starting !== null || active || !capabilities?.indexEnabled"
        @click="start('META')"
      >
        {{ starting === 'META' ? 'Запуск...' : 'Обновить метаинформацию' }}
      </button>
      <button
        class="btn-secondary"
        :disabled="starting !== null || active || !capabilities?.indexEnabled || !defaults"
        @click="openScreenshotOptions"
      >
        Нарезать скриншоты
      </button>
      <button class="btn-secondary" :disabled="cancelling || !active" @click="cancel">
        Отменить
      </button>
    </div>

    <div v-if="error && !optionsOpen" class="error">{{ error }}</div>

    <section v-if="job" class="status">
      <div class="status-head">
        <span class="badge" :class="statusClass">{{ statusLabel }}</span>
        <span class="phase">{{ phaseLabel }}</span>
        <span v-if="active" class="updated">
          обновлено: {{ formatAgo(job.lastActivitySecondsAgo) }}
        </span>
        <span v-if="job.id" class="job-id">{{ job.id }}</span>
      </div>

      <div v-if="job.totalFiles > 0" class="progress">
        <div class="progress-bar" :style="{ width: percent + '%' }"></div>
      </div>

      <div class="numbers">
        <div><span class="number">{{ job.processedFiles }}</span> / {{ job.totalFiles }} файлов</div>
        <div><span class="number">{{ job.screenshotsCreated }}</span> кадров создано</div>
        <div><span class="number">{{ formatFileSize(job.screenshotBytesAverage) }}</span> средний кадр</div>
        <div><span class="number">{{ formatFileSize(job.screenshotBytesMax) }}</span> макс. кадр</div>
      </div>

      <div class="times">
        <span>Начато: {{ formatDateTime(job.startedAt) }}</span>
        <span>Длительность: {{ formatElapsed(job.durationSeconds) }}</span>
        <span v-if="!active && job.finishedAt">
          Завершено: {{ formatDateTime(job.finishedAt) }}
        </span>
      </div>

      <div v-if="job.error" class="job-error">{{ job.error }}</div>
    </section>
    <div v-else-if="!loading" class="empty">Задач управления ещё не было.</div>

    <Teleport to="body">
      <div v-if="optionsOpen" class="backdrop" @click.self="closeScreenshotOptions">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="screenshot-options-title"
        >
          <header class="dialog-header">
            <h2 id="screenshot-options-title">Параметры нарезки</h2>
            <button
              class="close-btn"
              type="button"
              aria-label="Закрыть"
              @click="closeScreenshotOptions"
            >
              ×
            </button>
          </header>

          <div class="dialog-body">
            <p class="hint">
              Все существующие кадры будут удалены и созданы заново с указанными параметрами.
            </p>

            <section class="options">
              <label class="field">
                <span>Кадров на матч</span>
                <input v-model.number="options.screenshotsCount" type="number" min="1" max="100" />
              </label>
              <label class="field">
                <span>Отступ от краёв, сек</span>
                <input v-model.number="options.marginSeconds" type="number" min="0" />
              </label>
              <label class="field">
                <span>Масштаб, % от оригинала</span>
                <input v-model.number="options.scalePercent" type="number" min="1" max="100" />
              </label>
              <label class="field">
                <span>Качество (JPEG/WebP)</span>
                <input v-model.number="options.quality" type="number" min="1" max="100" />
              </label>
              <label class="field">
                <span>Потоков</span>
                <input v-model.number="options.threads" type="number" min="1" max="16" />
              </label>
              <label class="field">
                <span>Плеер</span>
                <select v-model="options.player">
                  <option value="ffmpeg">ffmpeg</option>
                  <option value="vlc">vlc</option>
                </select>
              </label>
              <label class="field">
                <span>Формат</span>
                <select v-model="options.format">
                  <option value="webp">WebP</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </label>
            </section>

            <div v-if="error" class="error dialog-error">{{ error }}</div>
          </div>

          <footer class="dialog-footer">
            <button
              class="btn-secondary"
              type="button"
              :disabled="!defaults"
              @click="resetOptions"
            >
              Сбросить
            </button>
            <button
              class="btn-primary"
              type="button"
              :disabled="starting !== null || active"
              @click="start('SCREENSHOTS')"
            >
              {{ starting === 'SCREENSHOTS' ? 'Запуск...' : 'Запустить нарезку' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  cancelIndexJob,
  getArchiveCapabilities,
  getIndexDefaults,
  getIndexJob,
  startIndexJob
} from '@/api'
import type {
  ArchiveCapabilities,
  ArchiveJobMode,
  IndexDefaults,
  IndexOptions,
  JobResponse,
  ScreenshotFormat
} from '@/api'
import BackButton from '@/components/BackButton.vue'
import { formatElapsed, formatFileSize } from '@/common'

interface ScreenshotOptionsForm {
  screenshotsCount: number
  marginSeconds: number
  scalePercent: number
  quality: number
  threads: number
  player: string
  format: ScreenshotFormat
}

const options = reactive<ScreenshotOptionsForm>({
  screenshotsCount: 1,
  marginSeconds: 0,
  scalePercent: 100,
  quality: 75,
  threads: 1,
  player: 'ffmpeg',
  format: 'jpeg'
})

const capabilities = ref<ArchiveCapabilities | null>(null)
const defaults = ref<IndexDefaults | null>(null)
const job = ref<JobResponse | null>(null)
const loading = ref(true)
const starting = ref<ArchiveJobMode | null>(null)
const cancelling = ref(false)
const optionsOpen = ref(false)
const error = ref<string | null>(null)

let timer: ReturnType<typeof setInterval> | null = null

const active = computed(() => job.value !== null && (job.value.status === 'RUNNING' || job.value.status === 'CANCELLING'))
const percent = computed(() => {
  if (!job.value || job.value.totalFiles === 0) {
    return 0
  }
  return Math.min(100, Math.round((job.value.processedFiles / job.value.totalFiles) * 100))
})
const statusLabels: Record<string, string> = {
  RUNNING: 'Выполняется',
  CANCELLING: 'Отмена...',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
  FAILED: 'Ошибка',
  STUCK: 'Зависло'
}

const statusLabel = computed(() => job.value ? statusLabels[job.value.status] || job.value.status : '')
const statusClass = computed(() => job.value ? job.value.status.toLowerCase() : '')
const phaseLabels: Record<string, string> = {
  META: 'Метаинформация',
  SCREENSHOTS: 'Скриншоты',
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
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const pad = (part: number) => part.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatAgo(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} сек назад`
  }
  return `${Math.floor(seconds / 60)} мин назад`
}

async function refresh() {
  try {
    job.value = await getIndexJob()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось получить статус задачи'
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

function openScreenshotOptions() {
  if (!defaults.value) {
    return
  }
  error.value = null
  optionsOpen.value = true
}

function closeScreenshotOptions() {
  optionsOpen.value = false
}

function resetOptions() {
  if (!defaults.value) {
    return
  }
  options.screenshotsCount = defaults.value.screenshotsCount
  options.marginSeconds = defaults.value.marginSeconds
  options.scalePercent = defaults.value.scalePercent
  options.quality = defaults.value.quality
  options.threads = defaults.value.threads
  options.player = defaults.value.player
  options.format = defaults.value.format
}

async function start(mode: ArchiveJobMode) {
  starting.value = mode
  error.value = null
  try {
    const request: IndexOptions = mode === 'SCREENSHOTS'
      ? { ...options, mode }
      : { mode }
    job.value = await startIndexJob(request)
    if (mode === 'SCREENSHOTS') {
      optionsOpen.value = false
    }
    schedule()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось запустить задачу'
  } finally {
    starting.value = null
  }
}

async function cancel() {
  cancelling.value = true
  error.value = null
  try {
    await cancelIndexJob()
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось отменить задачу'
  } finally {
    cancelling.value = false
  }
}

async function loadDefaults() {
  try {
    defaults.value = await getIndexDefaults()
    resetOptions()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось получить параметры нарезки'
  }
}

onMounted(async () => {
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
  await loadDefaults()
  await refresh()
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

.options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.field input,
.field select {
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
.updated,
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

.dialog-error {
  padding: 0;
  color: var(--color-danger);
  font-size: 0.9rem;
  text-align: left;
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
  width: min(680px, 100%);
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
  gap: 1rem;
  padding: 1.25rem;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
}
</style>
