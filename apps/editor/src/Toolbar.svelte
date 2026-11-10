<script lang="ts">
    import type { Snippet } from 'svelte'

    let { examples, selected, onPlay, onStop, onSelect, isExpanded = $bindable(false), children }: {
        examples: ReadonlyArray<string>
        selected: string
        onPlay: () => void
        onStop: () => void
        onSelect: (name: string) => void
        isExpanded?: boolean
        children?: Snippet
    } = $props()

    const onchange = (event: Event & {currentTarget: EventTarget & HTMLSelectElement;}) => {
        onSelect(event.currentTarget.value)
        onPlay()
    }
</script>

<aside>
    <details bind:open={isExpanded}>
        <summary>𐄂 lovechild</summary>
        <section>
            {@render children?.()}
        </section>
    </details>
    <nav>
        <button type="button" onclick={onPlay}>▶</button>
        <button type="button" onclick={onStop}>■</button>
        <select value={selected} {onchange}>
            <option value="" disabled></option>
            {#each examples as name (name)}
                <option value={name}>{name}</option>
            {/each}
        </select>
    </nav>
</aside>

<style>
    aside {
        --row-height: 28px;
        position: fixed;
        top: 0;
        right: 0;
        z-index: 10;
        width: var(--panel-width);
        box-sizing: border-box;
        background: white;
        border: 1px solid black;
        font-family: monospace;
    }

    details {
        height: var(--row-height);
        overflow: hidden;
        transition: height 300ms ease;
    }

    details[open] {
        height: calc(100dvh - 2px);
    }

    summary {
        height: var(--row-height);
        line-height: var(--row-height);
        padding: 0 8px;
        list-style: none;
        cursor: pointer;
        border-bottom: 1px solid black;
    }

    summary::-webkit-details-marker {
        display: none;
    }

    section {
        height: calc(100% - var(--row-height) - 1px);
        overflow: auto;
        padding: 8px;
        box-sizing: border-box;
    }

    nav {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        gap: 4px;
        align-items: center;
        height: var(--row-height);
        padding: 0 8px;
    }

    button,
    select {
        height: var(--row-height);
        border: none;
        background: white;
        color: black;
        font: inherit;
    }

    button {
        width: 32px;
        cursor: pointer;
    }

    button:hover,
    select:hover {
        background: #ffffff33;
    }

    @media (prefers-reduced-motion: reduce) {
        details {
            transition: none;
        }
    }
</style>
