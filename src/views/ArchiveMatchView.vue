<template>
  <div class="page">
    <div class="heading-row">
      <BackButton fallback="/archive" />
      <h1>Матч</h1>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="detail" class="content">
      <section class="info">
        <div class="path">{{ detail.match.relPath }}</div>
        <div class="info-grid">
          <div class="info-item"><span class="label">Дата</span><span>{{ detail.match.matchDate || '—' }}</span></div>
          <div class="info-item"><span class="label">Клуб</span><span>{{ detail.match.clubName || '—' }}</span></div>
          <div class="info-item"><span class="label">Турнир</span><span>{{ detail.match.tournament ? 'да' : 'нет' }}</span></div>
          <div class="info-item"><span class="label">Длительность</span><span>{{ formatDurationHuman(detail.match.durationSeconds) }}</span></div>
          <div class="info-item"><span class="label">Размер</span><span>{{ formatBytesHuman(detail.match.sizeMbytes) }}</span></div>
          <div class="info-item"><span class="label">Кадров</span><span>{{ detail.screenshots.length }}</span></div>
        </div>
        <div v-if="detail.match.validationError" class="validation">{{ detail.match.validationError }}</div>
      </section>

      <section class="rename">
        <h2>Игроки (переименование файла)</h2>
        <div class="rename-rows">
          <div v-for="(player, index) in editPlayers" :key="index" class="rename-row">
            <input v-model="editPlayers[index]" class="rename-input" type="text" />
          </div>
        </div>
        <div class="rename-actions">
          <button class="btn-primary" :disabled="saving || !renameChanged" @click="save">
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
          <router-link
            v-for="shot in detail.screenshots"
            :key="shot.id"
            class="shot"
            :to="`/archive/matches/${detail.match.id}`"
            @click.prevent="openShot(shot.id)"
          >
            <img :src="screenshotUrl(shot.id, 320)" :alt="`Кадр ${formatTimecode(shot.timecodeSeconds)}`" loading="lazy" />
            <span class="shot-time">{{ formatTimecode(shot.timecodeSeconds) }}</span>
          </router-link>
        </div>
      </section>
    </div>

    <div v-if="preview" class="lightbox" @click="preview = null">
      <img :src="screenshotUrl(preview, 1280)" alt="Кадр" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getMatch, renameMatch, screenshotUrl } from '@/api'
import type { MatchDetail } from '@/api'
import BackButton from '@/components/BackButton.vue'
import { formatBytesHuman, formatDurationHuman, formatTimecode } from '@/common'

const props = defineProps<{ id: string }>()

const detail = ref<MatchDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

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

async function load() {
  loading.value = true
  error.value = null
  try {
    detail.value = await getMatch(props.id)
    editPlayers.value = detail.value.players.map(player => player.name)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить матч'
  } finally {
    loading.value = false
  }
}

function resetEdit() {
  if (detail.value) {
    editPlayers.value = detail.value.players.map(player => player.name)
  }
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
    error.value = e instanceof Error ? e.message : 'Не удалось переименовать файл'
  } finally {
    saving.value = false
  }
}

function openShot(id: string) {
  preview.value = id
}

onMounted(load)
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

.rename-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 420px;
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
  border: none;
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-secondary {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary-soft);
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
  color: #fff;
  font-size: 0.75rem;
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
