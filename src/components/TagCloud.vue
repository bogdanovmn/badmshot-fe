<template>
    <div class="tag-cloud">
        <button v-for="tag in tags" :key="tag.id" type="button" class="tag" :style="tagStyle(tag)"
            :disabled="!interactive" :aria-label="`${tag.label}: ${tag.matches} ${unit}`" @click="emit('select', tag)">
            <span class="tag-label">{{ tag.label }}</span>
            <span class="tag-weight" aria-hidden="true">{{ tag.matches }} {{ unit }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue'
    import type { CatalogTag } from '@/api'

    const props = withDefaults(defineProps < {
        tags: CatalogTag[]
  unit?: string
  interactive?: boolean
    } > (), {
        unit: 'матчей',
        interactive: true
    })

    const emit = defineEmits < { select: [tag: CatalogTag] } > ()

    const MIN_SIZE_REM = 0.6
    const MAX_SIZE_REM = 4.5
    /** Количество групп, на которое делится первая (размерная) половина. */
    const TAG_SIZE_STEPS = 15
    /** Всего групп: первая половина меняет размер, вторая — бледность и жирность. */
    const TAG_GROUPS = TAG_SIZE_STEPS * 2
    const GROUP_SPAN = Math.max(1, TAG_SIZE_STEPS - 1)

    const MAX_FONT_WEIGHT = 700
    const PALE_FONT_WEIGHT_START = 600
    const PALE_FONT_WEIGHT_END = 400
    const PALE_OPACITY_START = 0.195
    const PALE_OPACITY_END = 0.16

    const maxMatches = computed(() => Math.max(1, ...props.tags.map(tag => tag.matches)))

    /**
     * Квантование веса в 2*TAG_SIZE_STEPS групп:
     * 1 — самый тяжёлый тэг, TAG_GROUPS — самый лёгкий.
     */
    function tagGroup(tag: CatalogTag): number {
        const ratio = Math.min(1, Math.max(0, tag.matches / maxMatches.value))
        const bucket = Math.min(TAG_GROUPS, Math.floor(ratio * TAG_GROUPS) + 1)
        return TAG_GROUPS - bucket + 1
    }

    function tagStyle(tag: CatalogTag): Record<string, string> {
        const group = tagGroup(tag)

        if (group <= TAG_SIZE_STEPS) {
            const step = (group - 1) / GROUP_SPAN
            const size = MAX_SIZE_REM - (MAX_SIZE_REM - MIN_SIZE_REM) * step
            return {
                fontSize: `${size.toFixed(2)}rem`,
                fontWeight: `${MAX_FONT_WEIGHT}`,
                '--tag-opacity': '1'
            }
        }

        const step = (group - TAG_SIZE_STEPS - 1) / GROUP_SPAN
        const opacity = PALE_OPACITY_START - (PALE_OPACITY_START - PALE_OPACITY_END) * step
        const fontWeight = Math.round(
            PALE_FONT_WEIGHT_START - (PALE_FONT_WEIGHT_START - PALE_FONT_WEIGHT_END) * step
        )

        return {
            fontSize: `${MIN_SIZE_REM}rem`,
            fontWeight: `${fontWeight}`,
            '--tag-opacity': opacity.toFixed(2)
        }
    }
</script>

<style scoped>
    .tag-cloud {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 0.4rem 0.9rem;
        padding: 1.5rem 0 0.75rem;
        line-height: 1.1;
    }

    .tag {
        position: relative;
        display: inline-flex;
        align-items: baseline;
        padding: 0.12rem 0.4rem;
        border: none;
        border-radius: 7px;
        background: transparent;
        color: var(--color-primary);
        opacity: var(--tag-opacity, 1);
        line-height: 1.1;
        cursor: pointer;
        transition: opacity 0.18s ease, color 0.18s ease, background-color 0.18s ease;
    }

    .tag:hover:not(:disabled),
    .tag:focus-visible {
        color: var(--text-primary);
        opacity: 1;
        background: var(--color-primary-soft);
    }

    .tag:disabled {
        cursor: default;
    }

    .tag-weight {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 0.1rem);
        z-index: 2;
        transform: translate(-50%, 0.25rem);
        padding: 0.1rem 0.45rem;
        border: 1px solid var(--color-border);
        border-radius: 999px;
        background: var(--bg-main);
        color: var(--text-secondary);
        font-size: 0.7rem;
        font-weight: 500;
        line-height: 1.3;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s ease;
    }

    .tag:hover .tag-weight,
    .tag:focus-visible .tag-weight {
        transform: translate(-50%, 0);
        opacity: 1;
    }
</style>