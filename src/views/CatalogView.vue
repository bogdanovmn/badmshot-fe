<template>
  <div class="page">
    <div class="heading-row">
      <BackButton fallback="/archive" />
      <h1>Справочники</h1>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <component :is="activeComponent" embedded />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BackButton from '@/components/BackButton.vue'
import PlayersView from '@/views/PlayersView.vue'
import ClubsView from '@/views/ClubsView.vue'

type CatalogTab = 'players' | 'clubs'

const tabs: { key: CatalogTab; label: string }[] = [
  { key: 'players', label: 'Игроки' },
  { key: 'clubs', label: 'Клубы' }
]

const route = useRoute()
const router = useRouter()

const activeTab = computed<CatalogTab>(() => route.query.tab === 'clubs' ? 'clubs' : 'players')
const activeComponent = computed(() => activeTab.value === 'clubs' ? ClubsView : PlayersView)

function selectTab(tab: CatalogTab) {
  router.replace({ query: { ...route.query, tab } })
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.heading-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

h1 {
  font-size: 1.4rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab {
  min-height: 38px;
  padding: 0.4rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
}

.tab:hover {
  border-color: var(--color-primary);
}

.tab.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
}
</style>
