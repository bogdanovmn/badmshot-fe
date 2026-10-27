import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTopScreenshots } from '@/api'
import type { TopScreenshotCard } from '@/api'

/**
 * Список ТОПа общий для всех пользователей (без персонального `liked`),
 * поэтому его можно держать в памяти между переходами по карточкам.
 */
const TTL_MS = 5 * 60 * 1000

export const topFramesStore = defineStore('topFrames', () => {
  const cards = ref<TopScreenshotCard[]>([])
  const loaded = ref(false)
  const loadedAt = ref(0)
  let pending: Promise<TopScreenshotCard[]> | null = null

  function isFresh(): boolean {
    return loaded.value && Date.now() - loadedAt.value < TTL_MS
  }

  async function fetchCards(): Promise<TopScreenshotCard[]> {
    const value = await getTopScreenshots()
    cards.value = value
    loaded.value = true
    loadedAt.value = Date.now()
    return cards.value
  }

  async function ensureLoaded(force = false): Promise<TopScreenshotCard[]> {
    if (!force && isFresh()) {
      return cards.value
    }
    if (!pending) {
      pending = fetchCards().finally(() => {
        pending = null
      })
    }
    return pending
  }

  function invalidate(): void {
    loaded.value = false
    loadedAt.value = 0
  }

  return { cards, loaded, ensureLoaded, invalidate }
})
