<script lang="ts">
    import { onMount } from 'svelte'
    import { setDocsContext } from './context'
    import { findMarkdown } from './pages'
    import ReferenceEntry from './entry/ReferenceEntry.svelte'
    import { getCategoryKey, getEntryKey, getKind, lovechildCategories, neutralCategories, type Entry, type Kind, type Links, type ReferenceData } from './reference'

    interface Group {
        key: string
        category: string
        kind: Kind
        entries: ReadonlyArray<Entry>
    }

    const kinds: ReadonlyArray<Kind> = ['image', 'text', 'neutral', 'sound']
    const openKinds: ReadonlyArray<Kind> = ['image', 'text']
    const categoryOrder = [...lovechildCategories, ...neutralCategories]

    let entries: ReadonlyArray<Entry> = $state.raw([])
    let links: Links = $state.raw({})
    let search = $state('')
    let selectedKey: string | undefined = $state()
    let openCategories: Record<string, boolean> = $state({})

    const findRank = (category: string) => {
        const index = categoryOrder.indexOf(category)
        return index === -1 ? categoryOrder.length : index
    }

    const compareGroups = (first: Group, second: Group) => kinds.indexOf(first.kind) - kinds.indexOf(second.kind)
        || findRank(first.category) - findRank(second.category)
        || first.category.localeCompare(second.category)

    const createGroups = (found: ReadonlyArray<Entry>) => {
        const pairs = found.flatMap((entry) => entry.categories.map((category) => ({ entry, category, key: getCategoryKey(category) })))

        return Array.from(new Set(pairs.map((pair) => pair.key)), (key): Group => {
            const members = pairs.filter((pair) => pair.key === key)
            const { category } = members[0]
            return { key, category, kind: getKind(category), entries: members.map((member) => member.entry) }
        }).sort(compareGroups)
    }

    const isMatch = (entry: Entry) => [entry.label, ...entry.synonyms].some((name) => name.includes(search.trim()))

    const groups = $derived(createGroups(entries.filter(isMatch)))
    const shownEntries = $derived(groups.filter((group) => openCategories[group.key]).flatMap((group) => group.entries))
    const currentEntry = $derived(shownEntries.find((entry) => getEntryKey(entry) === selectedKey) ?? shownEntries[0])
    const currentMarkdown = $derived(currentEntry && findMarkdown(currentEntry.namespace, currentEntry.name))

    setDocsContext({
        get links() {
            return links
        },
        isPlayable: false,
    })

    onMount(() => {
        fetch('/reference.json')
            .then((response) => response.json())
            .then((found: ReferenceData) => {
                entries = found.entries
                links = found.links
                openCategories = Object.fromEntries(createGroups(found.entries).map((group) => [group.key, openKinds.includes(group.kind)]))
            })
    })
</script>

<div class="reference">
    <div class="index">
            <input type="search" bind:value={search} placeholder="search"/>
        <div class="lists">
            {#each groups as group (group.key)}
                <details class={group.kind} bind:open={openCategories[group.key]}>
                    <summary>{group.category}</summary>
                    <ul>
                        {#each group.entries as entry (getEntryKey(entry))}
                            <li>
                                <button type="button" aria-current={entry === currentEntry} onclick={() => selectedKey = getEntryKey(entry)}>{entry.label}</button>
                            </li>
                        {/each}
                    </ul>
                </details>
            {/each}
        </div>
    </div>
    <div class="entry prose flow">
        {#if currentEntry}
            <ReferenceEntry entry={currentEntry} heading="h3" isLinked>
                {#if currentMarkdown}
                    <currentMarkdown.component />
                {/if}
            </ReferenceEntry>
        {/if}
    </div>
</div>

<style>
    .reference {
        --code-font-size: 12px;
        display: flex;
        min-height: 0;
        flex: 1;
    }

    .index {
        display: flex;
        flex-direction: column;
        width: 33%;
        min-width: 0;
    }

    input {
        width: 100%;
        /*border: var(--border);*/
        height: var(--row-height);
        padding: 0 0.5em;

    }

    input:focus {
        border: 1px solid var(--color-primary);
        border-radius: 0;
    }

    .lists {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }

    summary {
        cursor: pointer;
        color: var(--color-white);
        background-color: var(--kind-color);
        padding: 0 0 0 0.25em;
    }

    details {
        color: var(--kind-color);

    }

    ul {
        margin-block-end: var(--gap);
    }

    li > *{
        padding: 0 0 0 0.5em;
    }

    button {
        width: 100%;
        overflow: hidden;
        color: var(--kind-color);
        text-align: left;
        text-overflow: ellipsis;
        cursor: pointer;
    }

    button:hover,
    button[aria-current='true'] {
        background: var(--color-selection);
    }

    .entry {
        flex: 1;
        min-width: 0;
        overflow-y: auto;
        overflow-wrap: break-word;
        padding: var(--gap);
        padding-top: var(--row-height);
    }
</style>
