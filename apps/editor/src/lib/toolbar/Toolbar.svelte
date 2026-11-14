<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { Notice } from '../messages'
    import Notices from './Notices.svelte'

    let { isGraphSelected = false, isInfoSelected = false, infoHref, notices = [], onPlay, onStop, start, children }: {
        isGraphSelected?: boolean
        isInfoSelected?: boolean
        infoHref: string
        notices?: ReadonlyArray<Notice>
        onPlay: () => void
        onStop: () => void
        start?: Snippet
        children?: Snippet
    } = $props()

    const codeHref = '/code'
    const exploreHref = '/explore'

    const graphHref = $derived(isGraphSelected && !isInfoSelected ? codeHref : exploreHref)

    let noticesHeight = $state(0)
</script>

<aside style:--notices-height="{noticesHeight}px">
    <Notices {notices} bind:height={noticesHeight} />
    <div class="bar" class:wide={start !== undefined} class:below={notices.length > 0}>
        <div class="row">
            {@render start?.()}
            <nav>
                <button type="button" onclick={onPlay}>▶</button>
                <button type="button" onclick={onStop}>■</button>
                <a href={isInfoSelected ? codeHref : infoHref} class:selected={isInfoSelected}>ⓘ</a>
                <a href={graphHref} class:selected={isGraphSelected}>∞</a>
            </nav>
        </div>
        {@render children?.()}
    </div>
</aside>

<style>
    aside {
        position: fixed;
        top: 0;
        right: 0;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    aside > :global(*) {
        background: var(--color-background);
        color: var(--color-foreground);
    }

    aside > :global(.notices) {
        width: var(--panel-width);
    }

    .bar {
        border: var(--border);
    }

    .bar.below {
        border-top: none;
    }

    .bar.wide {
        width: var(--panel-width);
    }

    .row {
        display: flex;
        height: var(--row-height);
    }

    nav {
        display: flex;
        margin-left: auto;
    }

    button,
    a {
        min-width: 32px;
        height: 100%;
        background: var(--color-background);
        color: var(--color-foreground);
        cursor: pointer;
    }

    a {
        display: grid;
        place-items: center;
        font-size: 1.5em;
        text-decoration: none;
    }

    a.selected {
        background: var(--color-primary);
        color: var(--color-white);
    }
</style>
