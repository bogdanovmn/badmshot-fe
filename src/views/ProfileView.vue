<template>
  <div class="page">
    <header class="page-head">
      <h1>Профиль</h1>
      <p v-if="auth.userName" class="subtitle">{{ auth.userName }}</p>
    </header>

    <div class="tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :title="tab.label"
        @click="selectTab(tab.id)"
      >
        <NavIcon :name="tab.icon" />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <section v-if="activeTab === 'filters'" class="panel">
      <header class="panel-head">
        <h2>Мои фильтры</h2>
        <p>Эти фильтры применяются в разделе «Кадры», если вы ещё не выбрали другие.</p>
      </header>

      <div v-if="filterLoading" class="state">Загрузка...</div>
      <ErrorNotice v-else-if="filterError" :message="filterError" />
      <template v-else>
        <div class="filter-summary">
          <span v-for="player in filterPlayers" :key="`player-${player.id}`" class="chip">
            {{ player.displayLabel }}
          </span>
          <span v-for="club in filterClubs" :key="`club-${club.id}`" class="chip">
            {{ club.displayLabel }}
          </span>
          <span v-if="filterTogether && filterPlayers.length > 1" class="chip">
            Все игроки вместе
          </span>
          <span v-if="filterIncludeIndi" class="chip">Индивидуальные тренировки</span>
          <span v-if="!hasDefaultFilter" class="empty-filter">
            Фильтры не заданы — показываются все игры.
          </span>
        </div>

        <div class="actions">
          <button class="btn-ghost" type="button" @click="filterOpen = true">Настроить</button>
          <router-link class="btn-primary" :to="exploreTo">Открыть в разделе «Кадры»</router-link>
        </div>
      </template>
    </section>

    <section v-else-if="activeTab === 'shares'" class="panel">
      <header class="panel-head">
        <h2>Кадры по ссылке</h2>
        <p>Кадры, которыми вы поделились, и количество просмотров по ссылке.</p>
      </header>

      <div v-if="sharesLoading" class="state">Загрузка...</div>
      <ErrorNotice v-else-if="sharesError" :message="sharesError" />
      <div v-else-if="shares.length === 0" class="stage">
        <TvPlaceholder
          title="Вы пока не делились кадрами"
          text="Откройте кадр в разделе «Кадры» и нажмите кнопку «Поделиться», чтобы получить ссылку."
        >
          <router-link class="stage-link" to="/explore">Перейти к кадрам</router-link>
        </TvPlaceholder>
      </div>
      <div v-else class="list">
        <FrameThumb
          v-for="item in shares"
          :key="item.token"
          :card="item.card"
          :share-views="item.views"
          :to="{ path: '/explore', query: { frame: item.card.id } }"
        />
      </div>
    </section>

    <section v-else class="panel">
      <header class="panel-head">
        <h2>Мои комментарии</h2>
        <p>Кадры, к которым вы оставляли комментарии.</p>
      </header>

      <div v-if="commentsLoading" class="state">Загрузка...</div>
      <ErrorNotice v-else-if="commentsError" :message="commentsError" />
      <div v-else-if="comments.length === 0" class="stage">
        <TvPlaceholder
          title="Комментариев пока нет"
          text="Откройте кадр и нажмите на иконку комментария, чтобы обсудить его."
        >
          <router-link class="stage-link" to="/explore">Перейти к кадрам</router-link>
        </TvPlaceholder>
      </div>
      <div v-else class="list">
        <FrameThumb
          v-for="card in comments"
          :key="card.id"
          :card="card"
          :to="{ name: 'profile-comment-frame', params: { id: card.id } }"
        />
      </div>
    </section>

    <ScreenshotFilterDialog
      v-if="filterOpen"
      :players="filterPlayers"
      :clubs="filterClubs"
      :include-indi="filterIncludeIndi"
      :together="filterTogether"
      @close="filterOpen = false"
      @apply="saveFilter"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getClubsByIds,
  getDefaultFrameFilter,
  getErrorMessage,
  getMyCommentedScreenshots,
  getMyShares,
  getPlayersByIds,
  saveDefaultFrameFilter
} from '@/api'
import type { Club, Player, ScreenshotCard, SharedFrame } from '@/api'
import { authStore } from '@/stores/auth'
import ErrorNotice from '@/components/ErrorNotice.vue'
import FrameThumb from '@/components/FrameThumb.vue'
import NavIcon from '@/components/NavIcon.vue'
import ScreenshotFilterDialog from '@/components/ScreenshotFilterDialog.vue'
import TvPlaceholder from '@/components/TvPlaceholder.vue'

type TabId = 'filters' | 'shares' | 'comments'
type TabIcon = 'filters' | 'share' | 'comments'

interface Tab {
  id: TabId
  label: string
  icon: TabIcon
}

const tabs: Tab[] = [
  { id: 'filters', label: 'Мои фильтры', icon: 'filters' },
  { id: 'shares', label: 'Кадры по ссылке', icon: 'share' },
  { id: 'comments', label: 'Мои комментарии', icon: 'comments' }
]

const route = useRoute()
const router = useRouter()
const auth = authStore()

const activeTab = ref<TabId>('filters')
const filterOpen = ref(false)

const filterPlayers = ref<Player[]>([])
const filterClubs = ref<Club[]>([])
const filterIncludeIndi = ref(false)
const filterTogether = ref(false)
const filterLoading = ref(true)
const filterError = ref<string | null>(null)

const shares = ref<SharedFrame[]>([])
const sharesLoading = ref(true)
const sharesError = ref<string | null>(null)

const comments = ref<ScreenshotCard[]>([])
const commentsLoading = ref(true)
const commentsError = ref<string | null>(null)

const hasDefaultFilter = computed(() =>
  filterPlayers.value.length > 0
  || filterClubs.value.length > 0
  || filterIncludeIndi.value
  || (filterTogether.value && filterPlayers.value.length > 1)
)

const exploreTo = computed(() => {
  const query: Record<string, string | string[]> = {}
  if (filterPlayers.value.length) {
    query.players = filterPlayers.value.map(player => player.id)
  }
  if (filterClubs.value.length) {
    query.clubs = filterClubs.value.map(club => club.id)
  }
  if (filterIncludeIndi.value) {
    query.indi = '1'
  }
  if (filterTogether.value && filterPlayers.value.length > 1) {
    query.together = '1'
  }
  return { path: '/explore', query }
})

function tabFromQuery(value: unknown): TabId {
  return value === 'shares' || value === 'comments' ? value : 'filters'
}

async function loadFilter() {
  filterLoading.value = true
  filterError.value = null
  try {
    const filter = await getDefaultFrameFilter()
    const [players, clubs] = await Promise.all([
      getPlayersByIds(filter.playerIds),
      getClubsByIds(filter.clubIds)
    ])
    filterPlayers.value = players
    filterClubs.value = clubs
    filterIncludeIndi.value = filter.includeIndi
    filterTogether.value = filter.together
  } catch (e) {
    filterError.value = getErrorMessage(e, 'Не удалось загрузить фильтры')
  } finally {
    filterLoading.value = false
  }
}

async function loadShares() {
  sharesLoading.value = true
  sharesError.value = null
  try {
    shares.value = await getMyShares()
  } catch (e) {
    sharesError.value = getErrorMessage(e, 'Не удалось загрузить кадры по ссылке')
  } finally {
    sharesLoading.value = false
  }
}

async function loadComments() {
  commentsLoading.value = true
  commentsError.value = null
  try {
    comments.value = await getMyCommentedScreenshots()
  } catch (e) {
    commentsError.value = getErrorMessage(e, 'Не удалось загрузить мои комментарии')
  } finally {
    commentsLoading.value = false
  }
}

async function saveFilter(value: {
  players: Player[]
  clubs: Club[]
  includeIndi: boolean
  together: boolean
}) {
  filterOpen.value = false
  filterLoading.value = true
  filterError.value = null
  try {
    await saveDefaultFrameFilter({
      playerIds: value.players.map(player => player.id),
      clubIds: value.clubs.map(club => club.id),
      includeIndi: value.includeIndi,
      together: value.together
    })
    await loadFilter()
  } catch (e) {
    filterError.value = getErrorMessage(e, 'Не удалось сохранить фильтры')
    filterLoading.value = false
  }
}

async function selectTab(tab: TabId) {
  activeTab.value = tab
  await router.replace({
    path: '/profile',
    query: tab === 'filters' ? {} : { tab }
  })
}

watch(
  () => route.query.tab,
  value => {
    activeTab.value = tabFromQuery(value)
  }
)

onMounted(() => {
  auth.update()
  activeTab.value = tabFromQuery(route.query.tab)
  void loadFilter()
  void loadShares()
  void loadComments()
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

h1 {
  font-size: 1.4rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  overflow-x: auto;
}

.tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.45rem;
  min-height: 42px;
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  white-space: nowrap;
}

.tab svg {
  width: 19px;
  height: 19px;
}

.tab:hover {
  color: var(--text-primary);
  background: var(--color-nav-hover);
}

.tab.active {
  color: var(--accent-dark);
  background: var(--text-primary);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.panel-head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.panel-head h2 {
  font-size: 1.1rem;
}

.panel-head p {
  color: var(--text-secondary);
  font-size: 0.83rem;
}

.filter-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--accent-dark);
  color: var(--text-primary);
  font-size: 0.82rem;
}

.empty-filter {
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.btn-ghost,
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0.5rem 1.2rem;
  border-radius: 7px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
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
  text-decoration: none;
}

.btn-primary {
  border: 1px solid var(--btn-primary-bg);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.btn-primary:hover {
  border-color: var(--btn-primary-bg-hover);
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
  text-decoration: none;
}

.state {
  padding: 1.5rem 0.5rem;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.stage {
  position: relative;
  min-height: min(50vh, 380px);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.stage-link {
  margin-top: 0.4rem;
  min-height: 44px;
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--btn-ghost-border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-weight: 600;
  text-decoration: none;
}

.stage-link:hover {
  background: var(--text-primary);
  color: var(--accent-dark);
  text-decoration: none;
}

@media (max-width: 599px) {
  .tab-label {
    display: none;
  }

  .tab {
    padding: 0.45rem;
  }
}
</style>
