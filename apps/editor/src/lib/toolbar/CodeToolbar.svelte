<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { Notice } from '../messages'
    import Toolbar from './Toolbar.svelte'

    let { infoHref, notices = [], onPlay, onStop, panel, isPanelOpen = $bindable(false) }: {
        infoHref: string
        notices?: ReadonlyArray<Notice>
        onPlay: () => void
        onStop: () => void
        panel: Snippet
        isPanelOpen?: boolean
    } = $props()
</script>

{#snippet toggle()}
    <button type="button" class="toggle" aria-expanded={isPanelOpen} onclick={() => isPanelOpen = !isPanelOpen}>
        𐄂 lovechild
    </button>
{/snippet}

<Toolbar {infoHref} {notices} {onPlay} {onStop} start={toggle}>
    <section class:open={isPanelOpen}>
        {@render panel()}
    </section>
</Toolbar>

<style>
    .toggle {
        flex: 1;
        padding: 0 var(--gap);
        text-align: left;
        background: var(--color-background);
        color: var(--color-foreground);
        cursor: pointer;
    }

    section {
        display: flex;
        flex-direction: column;
        height: 0;
        overflow: hidden;
        transition: height 300ms ease;
    }

    section.open {
        height: calc(100dvh - 2px - var(--notices-height) - var(--row-height));
    }

    @media (prefers-reduced-motion: reduce) {
        section {
            transition: none;
        }
    }
</style>
