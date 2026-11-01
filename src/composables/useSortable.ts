import { computed, ref, type Ref } from 'vue'

export type SortDirection = 'asc' | 'desc'

export interface SortableOptions<K extends string> {
  initialKey: K
  initialDirection?: SortDirection
  /** Колонки, значения которых сортируются как текст, а не как числа. */
  textKeys?: K[]
}

export function useSortable<T, K extends string>(
  rows: Ref<T[]>,
  accessors: Record<K, (row: T) => string | number>,
  options: SortableOptions<K>
) {
  const key = ref(options.initialKey) as Ref<K>
  const direction = ref<SortDirection>(options.initialDirection ?? 'desc')
  const textKeys = options.textKeys ?? []

  const sorted = computed(() => {
    const accessor = accessors[key.value]
    const list = [...rows.value]
    list.sort((left, right) => {
      const a = accessor(left)
      const b = accessor(right)
      const result = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a).localeCompare(String(b), 'ru')
      return direction.value === 'asc' ? result : -result
    })
    return list
  })

  function toggle(nextKey: K) {
    if (key.value === nextKey) {
      direction.value = direction.value === 'asc' ? 'desc' : 'asc'
      return
    }
    key.value = nextKey
    direction.value = textKeys.includes(nextKey) ? 'asc' : 'desc'
  }

  return { key, direction, sorted, toggle }
}
