<template>
    <div class="page">
        <h1 v-if="!embedded">Игроки</h1>
        <p class="hint">
            Псевдонимы и отображаемые имена. Псевдоним — другое имя игрока в имени файла: такие записи считаются одним
            игроком.
        </p>

        <label class="toggle">
            <input v-model="unprocessedOnly" type="checkbox" @change="load()" />
            <span>Только необработанные</span>
        </label>

        <div class="letter-filter" role="group" aria-label="Фильтр по первой букве">
            <button v-for="item in letters" :key="item.letter" type="button" class="letter-btn"
                :class="{ active: selectedLetter === item.letter }" @click="selectLetter(item.letter)">
                <span>{{ item.letter }}</span>
                <span class="letter-count">{{ item.count }}</span>
            </button>
            <button type="button" class="letter-btn" :class="{ active: selectedLetter === NO_GAMES }"
                @click="selectLetter(NO_GAMES)">
                Без игр
            </button>
        </div>

        <ErrorNotice v-if="error" :message="error" />
        <div v-else-if="loading" class="loading">Загрузка...</div>
        <div v-else-if="players.length === 0" class="empty">Игроки не найдены.</div>
        <div v-else class="list">
            <div v-for="player in players" :key="player.id" class="row">
                <div class="row-name">
                    <router-link class="name" :to="{ path: '/archive', query: { playerId: player.id } }"
                        :title="`Открыть файлы игрока ${player.displayLabel}`">
                        {{ player.name }}
                    </router-link>
                    <span class="label">{{ player.displayLabel }}</span>
                    <span v-if="aliasFor(player.id)" class="alias-hint">
                        Псевдоним: {{ aliasFor(player.id)?.displayLabel }}
                    </span>
                </div>
                <label class="field">
                    <span>Отображаемое имя</span>
                    <input v-model="edits[player.id].displayName" type="text" />
                </label>
                <div class="field alias-field">
                    <span>Псевдоним (имя в файле)</span>
                    <div v-if="aliasFor(player.id)" class="alias-chip">
                        <span class="alias-chip-label">{{ aliasFor(player.id)?.displayLabel }}</span>
                        <button type="button" class="chip-remove" aria-label="Удалить псевдоним"
                            @click="removeAlias(player)">
                            ×
                        </button>
                    </div>
                    <div v-else class="alias-search-wrap">
                        <input v-model="aliasTerms[player.id]" type="text" placeholder="Начните вводить имя игрока..."
                            autocomplete="off" @input="scheduleAliasSearch" @focus="focusAliasSearch(player)"
                            @blur="closeAliasSearch" />
                        <span v-if="aliasLoading && aliasTargetId === player.id" class="alias-status">...</span>
                        <ul v-if="aliasTargetId === player.id && aliasTerms[player.id] && aliasOptions.length"
                            class="suggestions">
                            <li v-for="option in aliasOptions" :key="option.id">
                                <button type="button" @mousedown.prevent="selectAlias(player, option)">
                                    <span>{{ option.displayLabel }}</span>
                                    <span v-if="option.displayLabel !== option.name" class="suggest-name">{{ option.name
                                        }}</span>
                                </button>
                            </li>
                        </ul>
                        <p v-else-if="aliasTargetId === player.id && aliasTerms[player.id] && !aliasLoading"
                            class="no-results">
                            Ничего не найдено
                        </p>
                    </div>
                </div>
                <div class="row-actions">
                    <button class="btn-secondary" type="button" @click="openRename(player)">
                        Массовое переименование
                    </button>
                    <button class="btn-primary" :disabled="savingId === player.id || !isDirty(player)"
                        @click="save(player)">
                        {{ savingId === player.id ? '...' : 'Сохранить' }}
                    </button>
                    <span v-if="savedId === player.id" class="success">Ок</span>
                </div>
            </div>
        </div>

        <div v-if="renameNotice" class="notice">{{ renameNotice }}</div>

        <PlayerRenameDialog v-if="renameTarget" :player="renameTarget" @close="renameTarget = null"
            @renamed="onRenamed" />
    </div>
</template>

<script setup lang="ts">
    import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
    import {
        getErrorMessage,
        getPlayerLetters,
        getPlayers,
        getPlayersByLetter,
        getPlayersWithoutGames,
        updatePlayer
    } from '@/api'
    import type { Player, PlayerAlias, PlayerLetterCount, PlayerRenameResult } from '@/api'
    import ErrorNotice from '@/components/ErrorNotice.vue'
    import PlayerRenameDialog from '@/components/PlayerRenameDialog.vue'

    defineProps < { embedded?: boolean } > ()

    interface PlayerEdit {
        displayName: string
        alias: PlayerAlias | null
    }

    const NO_GAMES = '__no_games__'

    const letters = ref < PlayerLetterCount[] > ([])
    const selectedLetter = ref < string | null > (null)
    const unprocessedOnly = ref(true)
    const players = ref < Player[] > ([])
    const edits = reactive < Record < string, PlayerEdit>> ({})
    const loading = ref(true)
    const error = ref < string | null > (null)
    const savingId = ref < string | null > (null)
    const savedId = ref < string | null > (null)
    const renameTarget = ref < Player | null > (null)
    const renameNotice = ref < string | null > (null)

    const aliasTargetId = ref < string | null > (null)
    const aliasTerms = reactive < Record < string, string >> ({})
    const aliasOptions = ref < Player[] > ([])
    const aliasLoading = ref(false)

    let aliasTimer: ReturnType<typeof setTimeout> | null = null
    let aliasCloseTimer: ReturnType<typeof setTimeout> | null = null

    function aliasFor(id: string): PlayerAlias | null {
        return edits[id]?.alias ?? null
    }

    async function load(silent = false) {
        if (!silent) {
            loading.value = true
        }
        error.value = null
        try {
            const foundLetters = await getPlayerLetters(unprocessedOnly.value)
            letters.value = [...foundLetters].sort(
                (left, right) => left.letter.localeCompare(right.letter, 'ru')
            )
            const knownFilter = selectedLetter.value === NO_GAMES || (
                selectedLetter.value !== null
                && letters.value.some(item => item.letter === selectedLetter.value)
            )
            if (!knownFilter) {
                selectedLetter.value = letters.value[0]?.letter ?? NO_GAMES
            }
            players.value = selectedLetter.value === NO_GAMES
                ? await getPlayersWithoutGames(unprocessedOnly.value)
                : selectedLetter.value
                    ? await getPlayersByLetter(selectedLetter.value, unprocessedOnly.value)
                    : []
            Object.keys(edits).forEach(key => delete edits[key])
            Object.keys(aliasTerms).forEach(key => delete aliasTerms[key])
            players.value.forEach(player => {
                edits[player.id] = {
                    displayName: player.displayName || '',
                    alias: player.alias
                }
            })
        } catch (e) {
            error.value = getErrorMessage(e, 'Не удалось загрузить игроков')
        } finally {
            loading.value = false
        }
    }

    async function selectLetter(letter: string) {
        if (letter === selectedLetter.value) {
            return
        }
        selectedLetter.value = letter
        await load()
    }

    function isDirty(player: Player): boolean {
        const edit = edits[player.id]
        if (!edit) {
            return false
        }
        return edit.displayName !== (player.displayName || '')
            || (edit.alias?.id ?? null) !== (player.alias?.id ?? null)
    }

    async function save(player: Player) {
        const edit = edits[player.id]
        if (!edit || savingId.value) {
            return
        }
        savingId.value = player.id
        savedId.value = null
        error.value = null
        try {
            const displayName = edit.displayName.trim() || null
            await updatePlayer(player.id, {
                displayName,
                aliasPlayerId: edit.alias?.id ?? null
            })
            player.displayName = displayName
            player.alias = edit.alias ? { ...edit.alias } : null
            player.displayLabel = displayName ?? player.name
            edit.displayName = displayName ?? ''
            savedId.value = player.id
            if (unprocessedOnly.value) {
                await load(true)
            }
        } catch (e) {
            error.value = getErrorMessage(e, 'Не удалось сохранить игрока')
        } finally {
            savingId.value = null
        }
    }

    function removeAlias(player: Player) {
        const edit = edits[player.id]
        if (edit) {
            edit.alias = null
        }
    }

    function openRename(player: Player) {
        renameNotice.value = null
        renameTarget.value = player
    }

    async function onRenamed(result: PlayerRenameResult) {
        renameTarget.value = null
        renameNotice.value = result.filesReadOnly
            ? `Игрок переименован в «${result.name}» в метаинформации. Файлы на диске не изменены (BADMSHOT_ARCHIVE_FILES_READ_ONLY).`
            : `Игрок переименован в «${result.name}» (файлов: ${result.renamedFiles}).`
        await load()
    }

    async function searchAliases() {
        const targetId = aliasTargetId.value
        const term = targetId ? (aliasTerms[targetId] ?? '').trim() : ''
        if (!targetId || !term) {
            aliasOptions.value = []
            aliasLoading.value = false
            return
        }
        aliasLoading.value = true
        try {
            const found = await getPlayers({ term })
            if (aliasTargetId.value !== targetId) {
                return
            }
            aliasOptions.value = found.filter(option => option.id !== targetId && option.alias === null)
        } catch {
            aliasOptions.value = []
        } finally {
            if (aliasTargetId.value === targetId) {
                aliasLoading.value = false
            }
        }
    }

    function scheduleAliasSearch() {
        if (aliasTimer) {
            clearTimeout(aliasTimer)
        }
        aliasTimer = setTimeout(searchAliases, 350)
    }

    function focusAliasSearch(player: Player) {
        if (aliasCloseTimer) {
            clearTimeout(aliasCloseTimer)
            aliasCloseTimer = null
        }
        if (aliasTargetId.value !== player.id) {
            aliasTargetId.value = player.id
            aliasTerms[player.id] = ''
            aliasOptions.value = []
        }
    }

    function closeAliasSearch() {
        if (aliasCloseTimer) {
            clearTimeout(aliasCloseTimer)
        }
        aliasCloseTimer = setTimeout(() => {
            aliasTargetId.value = null
            aliasOptions.value = []
            aliasCloseTimer = null
        }, 150)
    }

    function selectAlias(player: Player, option: Player) {
        const edit = edits[player.id]
        if (!edit) {
            return
        }
        edit.alias = {
            id: option.id,
            name: option.name,
            displayName: option.displayName,
            displayLabel: option.displayLabel
        }
        aliasTargetId.value = null
        aliasTerms[player.id] = ''
        aliasOptions.value = []
    }

    onMounted(load)
    onBeforeUnmount(() => {
        if (aliasTimer) {
            clearTimeout(aliasTimer)
        }
        if (aliasCloseTimer) {
            clearTimeout(aliasCloseTimer)
        }
    })
</script>

<style scoped>
    .page {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    h1 {
        font-size: 1.4rem;
    }

    .hint {
        color: var(--color-muted);
        font-size: 0.9rem;
    }

    .toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        align-self: flex-start;
        color: var(--color-text);
        font-size: 0.9rem;
        cursor: pointer;
        user-select: none;
    }

    .toggle input {
        width: 18px;
        height: 18px;
        accent-color: var(--color-primary);
        cursor: pointer;
    }

    .letter-filter {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }

    .letter-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 38px;
        min-height: 38px;
        padding: 0.3rem 0.55rem;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text);
        font-weight: 600;
        cursor: pointer;
    }

    .letter-count {
        color: var(--color-muted);
        font-size: 0.75rem;
        font-weight: 500;
    }

    .letter-btn.active .letter-count {
        color: inherit;
        opacity: 0.8;
    }

    .letter-btn:hover {
        border-color: var(--color-primary);
    }

    .letter-btn.active {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: var(--color-on-primary);
    }

    .list {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.6rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
    }

    @media (min-width: 720px) {
        .row {
            grid-template-columns: minmax(160px, 1fr) 1fr 1fr auto;
            align-items: end;
        }
    }

    .row-name {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }

    .name {
        font-weight: 600;
        text-decoration: underline;
        text-decoration-color: var(--color-border);
        text-underline-offset: 2px;
    }

    .name:hover {
        text-decoration-color: currentColor;
    }

    .label {
        color: var(--color-muted);
        font-size: 0.8rem;
    }

    .alias-hint {
        color: var(--color-muted);
        font-size: 0.75rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        font-size: 0.75rem;
        color: var(--color-muted);
    }

    .field input {
        min-height: 40px;
        padding: 0.45rem 0.7rem;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--color-bg);
        color: var(--color-text);
    }

    .alias-field {
        position: relative;
    }

    .alias-search-wrap {
        position: relative;
    }

    .alias-search-wrap input {
        width: 100%;
    }

    .alias-status {
        position: absolute;
        right: 0.7rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-muted);
        font-size: 0.8rem;
    }

    .alias-chip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        min-height: 40px;
        padding: 0.35rem 0.45rem 0.35rem 0.7rem;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--color-bg);
        color: var(--color-text);
    }

    .alias-chip-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .chip-remove {
        flex: none;
        width: 28px;
        height: 28px;
        border: 1px solid var(--color-border);
        border-radius: 50%;
        background: transparent;
        color: var(--color-text);
        font-size: 1.1rem;
        line-height: 1;
        cursor: pointer;
    }

    .chip-remove:hover {
        border-color: var(--color-danger);
        color: var(--color-danger);
    }

    .suggestions {
        position: absolute;
        z-index: 20;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        max-height: 180px;
        margin: 0.25rem 0 0;
        padding: 0.25rem;
        list-style: none;
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-bg);
        box-shadow: var(--shadow-strong);
    }

    .suggestions button {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
        width: 100%;
        padding: 0.45rem 0.6rem;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text);
        text-align: left;
        cursor: pointer;
    }

    .suggestions button:hover {
        background: var(--color-primary-soft);
    }

    .suggest-name {
        color: var(--color-muted);
        font-size: 0.75rem;
    }

    .no-results {
        position: absolute;
        z-index: 20;
        left: 0;
        right: 0;
        margin: 0.25rem 0 0;
        padding: 0.45rem 0.6rem;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-bg);
        color: var(--color-muted);
        font-size: 0.85rem;
    }

    .row-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .btn-primary,
    .btn-secondary {
        min-height: 40px;
        padding: 0.5rem 1.1rem;
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
        opacity: 0.5;
        cursor: default;
    }

    .notice {
        padding: 0.6rem 0.8rem;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-success);
        font-size: 0.85rem;
    }

    .success {
        color: var(--color-success);
        font-size: 0.85rem;
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