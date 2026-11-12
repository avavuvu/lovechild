<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { Notice } from './messages'
    import Notices from './Notices.svelte'

    let { infoHref, notices = [], isMuted, onToggleMute, onPlay, onStop, panel, isPanelOpen = $bindable(false) }: {
        infoHref: string
        notices?: ReadonlyArray<Notice>
        isMuted: boolean
        onToggleMute: () => void
        onPlay: () => void
        onStop: () => void
        panel?: Snippet
        isPanelOpen?: boolean
    } = $props()

    let noticesHeight = $state(0)
</script>

{#snippet controls()}
    <nav class:below={notices.length > 0}>
        <button type="button" onclick={onPlay}>▶</button>
        <button type="button" onclick={onStop}>■</button>
        <button type="button" class="mute" aria-pressed={isMuted} onclick={onToggleMute}>muted</button>
        <a href={infoHref}>ⓘ</a>
        <a href="/explore">∞</a>
    </nav>
{/snippet}

<aside style:--notices-height="{noticesHeight}px">
    <Notices {notices} bind:height={noticesHeight} />
    {#if panel}
        <div class="bar">
            <details bind:open={isPanelOpen}>
                <summary>𐄂 lovechild</summary>
                <section>
                    {@render panel()}
                </section>
            </details>
            {@render controls()}
        </div>
    {:else}
        {@render controls()}
    {/if}
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
        width: var(--panel-width);
        background: var(--color-background);
        color: var(--color-foreground);
    }

    nav {
        display: flex;
        align-items: center;
        height: var(--row-height);
        background: var(--color-background);
    }

    aside > nav {
        width: max-content;
        border: var(--border);
    }

    aside > nav.below {
        border-top: none;
    }

    .bar {
        position: relative;
        border: var(--border);
    }

    .bar nav {
        position: absolute;
        top: 0;
        right: 0;
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
        padding: 0 var(--gap);
        list-style: none;
        cursor: pointer;
    }

    summary::-webkit-details-marker {
        display: none;
    }

    section {
        display: flex;
        flex-direction: column;
        height: calc(100dvh - 2px - var(--notices-height) - var(--row-height));
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

    .mute {
        padding: 0 var(--gap);
    }

    .mute[aria-pressed='true'] {
        background: var(--color-primary);
        color: var(--color-white);
    }

    @media (prefers-reduced-motion: reduce) {
        details {
            transition: none;
        }
    }
</style>
