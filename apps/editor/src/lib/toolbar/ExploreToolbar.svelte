<script lang="ts">
    import { onMount } from 'svelte'
    import { goto } from '$app/navigation'
    import type { GraphNode } from '$lib/server/graph'
    import { findSearchMatch, loadGraph, type SearchMatch } from '../docs/graph-data'
    import type { Notice } from '../messages'
    import Toolbar from './Toolbar.svelte'

    let { infoHref, notices = [], onPlay, onStop, search = $bindable(''), focus = $bindable() }: {
        infoHref: string
        notices?: ReadonlyArray<Notice>
        onPlay: () => void
        onStop: () => void
        search?: string
        focus?: string
    } = $props()

    let nodes: ReadonlyArray<GraphNode> = $state.raw([])
    let activeIndex = $state(0)
    let list: HTMLUListElement | undefined = $state.raw()

    const results: ReadonlyArray<SearchMatch> = $derived(search.trim() === ''
        ? []
        : nodes
            .flatMap((node) => findSearchMatch(node, search) ?? [])
            .sort((a, b) => a.node.label.localeCompare(b.node.label)))

    const moveActive = (step: number) => {
        activeIndex = Math.min(Math.max(activeIndex + step, 0), results.length - 1)
    }

    const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            moveActive(event.key === 'ArrowDown' ? 1 : -1)
            return
        }

        if (event.key === 'Enter' && results[activeIndex]) {
            goto(results[activeIndex].node.href)
        }
    }

    $effect(() => {
        focus = results[activeIndex]?.node.href
        list?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
    })

    onMount(() => {
        loadGraph().then((graph) => {
            nodes = graph.nodes
        })
    })
</script>

{#snippet field()}
    <input type="search" placeholder="search" bind:value={search} oninput={() => activeIndex = 0} onkeydown={handleKey} />
{/snippet}

<Toolbar isGraphSelected {infoHref} {notices} {onPlay} {onStop} start={field}>
    {#if results.length > 0}
        <ul bind:this={list}>
            {#each results as { node, alias }, index (node.key)}
                <li>
                    <a class={node.kind} class:active={index === activeIndex} href={node.href} onmouseenter={() => activeIndex = index}>
                        {node.label}
                        {#if alias}
                            <span class="alias">{alias}</span>
                        {/if}
                    </a>
                </li>
            {/each}
        </ul>
    {/if}
</Toolbar>

<style>
    input {
        flex: 1;
        min-width: 0;
        padding: 0 var(--gap);
        background: var(--color-background);
        color: var(--color-foreground);
    }

    input:focus {
        outline: none;
    }

    ul {
        max-height: 50dvh;
        overflow-y: auto;
        border-top: var(--border);
    }

    a {
        display: block;
        padding: 0 var(--gap);
        line-height: var(--row-height);
        color: var(--kind-color);
        text-decoration: none;
    }

    .alias {
        color: var(--color-muted);
    }

    a.active,
    a:focus-visible {
        background: var(--color-foreground);
        outline: none;
    }
</style>
