import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getFrameEffectSettings, saveFrameEffectSettings } from '@/api'
import type { FrameEffectSettings } from '@/api'

export const DEFAULT_FRAME_EFFECTS: FrameEffectSettings = {
  halftone: true,
  halftoneStrength: 3,
  blur: true,
  blurStrength: 0,
  pixelate: true,
  pixelStrength: 0,
  pixelColors: 10,
  transitionEnabled: true,
  transitionDuration: 3000,
  transitionPixels: 100
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, numeric))
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeFrameEffects(value: Partial<FrameEffectSettings> | null | undefined): FrameEffectSettings {
  return {
    halftone: boolOr(value?.halftone, DEFAULT_FRAME_EFFECTS.halftone),
    halftoneStrength: numberOr(value?.halftoneStrength, DEFAULT_FRAME_EFFECTS.halftoneStrength, 0, 100),
    blur: boolOr(value?.blur, DEFAULT_FRAME_EFFECTS.blur),
    blurStrength: numberOr(value?.blurStrength, DEFAULT_FRAME_EFFECTS.blurStrength, 0, 100),
    pixelate: boolOr(value?.pixelate, DEFAULT_FRAME_EFFECTS.pixelate),
    pixelStrength: numberOr(value?.pixelStrength, DEFAULT_FRAME_EFFECTS.pixelStrength, 0, 100),
    pixelColors: numberOr(value?.pixelColors, DEFAULT_FRAME_EFFECTS.pixelColors, 2, 16),
    transitionEnabled: boolOr(value?.transitionEnabled, DEFAULT_FRAME_EFFECTS.transitionEnabled),
    transitionDuration: numberOr(value?.transitionDuration, DEFAULT_FRAME_EFFECTS.transitionDuration, 400, 15000),
    transitionPixels: numberOr(value?.transitionPixels, DEFAULT_FRAME_EFFECTS.transitionPixels, 0, 100)
  }
}

export const frameEffectsStore = defineStore('frameEffects', () => {
  const settings = ref<FrameEffectSettings>({ ...DEFAULT_FRAME_EFFECTS })
  const loaded = ref(false)
  let pending: Promise<FrameEffectSettings> | null = null

  async function ensureLoaded(): Promise<FrameEffectSettings> {
    if (loaded.value) {
      return settings.value
    }
    if (!pending) {
      pending = getFrameEffectSettings()
        .then(value => {
          settings.value = normalizeFrameEffects(value)
          loaded.value = true
          return settings.value
        })
        .catch(() => {
          settings.value = { ...DEFAULT_FRAME_EFFECTS }
          loaded.value = true
          return settings.value
        })
        .finally(() => {
          pending = null
        })
    }
    return pending
  }

  async function persist(value: FrameEffectSettings): Promise<void> {
    const normalized = normalizeFrameEffects(value)
    settings.value = normalized
    loaded.value = true
    await saveFrameEffectSettings(normalized)
  }

  return { settings, loaded, ensureLoaded, persist }
})
