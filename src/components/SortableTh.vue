<template>
  <th :class="{ num: numeric }" :aria-sort="ariaSort">
    <button type="button" class="sort-btn" :class="{ active }" @click="emit('sort')">
      <span>{{ label }}</span>
      <span class="sort-arrow" aria-hidden="true">
        {{ active ? (direction === 'asc' ? '▲' : '▼') : '↕' }}
      </span>
    </button>
  </th>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SortDirection } from '@/composables/useSortable'

const props = withDefaults(defineProps<{
  label: string
  active?: boolean
  direction?: SortDirection
  numeric?: boolean
}>(), {
  active: false,
  direction: 'desc',
  numeric: false
})

const emit = defineEmits<{ sort: [] }>()

const ariaSort = computed(() => {
  if (!props.active) {
    return 'none'
  }
  return props.direction === 'asc' ? 'ascending' : 'descending'
})
</script>

<style scoped>
.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  min-height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-align: inherit;
  cursor: pointer;
}

th.num .sort-btn {
  justify-content: flex-end;
}

.sort-btn:hover,
.sort-btn.active {
  color: var(--color-primary);
}

.sort-arrow {
  font-size: 0.7rem;
  opacity: 0.45;
}

.sort-btn.active .sort-arrow {
  opacity: 1;
}
</style>
