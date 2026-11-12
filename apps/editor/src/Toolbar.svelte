<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { Notice } from './messages'

    let { examples, selected, notices = [], onPlay, onStop, onSelect, isExpanded = $bindable(false), children }: {
        examples: ReadonlyArray<string>
        selected: string
        notices?: ReadonlyArray<Notice>
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

    let noticesHeight = $state(0)
</script>

<aside style:--notices-height="{noticesHeight}px">
    <div class="notices" class:open={notices.length > 0} bind:clientHeight={noticesHeight}>
        <ul>
            {#each notices as notice, index (index)}
                <li class={notice.kind}>{notice.text}</li>
            {/each}
        </ul>
    </div>
    <div class="bar">
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
    </div>
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

    .notices {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 300ms ease;
    }

    .notices.open {
        grid-template-rows: 1fr;
        border-bottom: 1px solid black;
    }

    ul {
        min-height: 0;
        max-height: 30dvh;
        overflow: auto;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    li {
        padding: 4px 8px;
        white-space: pre-wrap;
    }

    li.error {
        background-color: #d00000;
        color: white;
    }

    li.warning {
        background-color: #a05a00;
        color: white;
    }

    .bar {
        position: relative;
    }

    details {
        height: var(--row-height);
        overflow: hidden;
        transition: height 300ms ease;
    }

    details[open] {
        height: calc(100dvh - 2px - var(--notices-height));
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
        details,
        .notices {
            transition: none;
        }
    }
</style>
