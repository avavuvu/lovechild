<script lang="ts">
    import type { Component } from 'svelte'
    import Backdrop from '../Backdrop.svelte'
    import { getEntryKind, indexName, type DocumentData } from './reference'
    import ReferenceEntry from './ReferenceEntry.svelte'

    let { data }: { data: DocumentData & { markdown: Component | undefined } } = $props()

    const isIndex = $derived(data.entry.namespace === 'lovechild' && data.entry.name === indexName)
</script>

<Backdrop href={isIndex ? undefined : '/explore'} />
<article class="flow">
    {#if data.other}
        <p class="other {getEntryKind(data.other)}">
            <a href={data.other.href}>{data.other.label}</a>
        </p>
    {/if}
    {#if !isIndex}
        <ReferenceEntry entry={data.entry} heading="h1" isPlayable />
    {/if}
    {#if data.markdown}
        <data.markdown />
    {/if}
</article>

<style>
    article {
        position: fixed;
        inset: 0;
        width: min(640px, 100% - 2 * var(--gap));
        height: fit-content;
        max-height: 80dvh;
        margin: auto;
        overflow: auto;
        padding: var(--gap) calc(2 * var(--gap));
        background: var(--color-background);
        color: var(--color-foreground);
        border: var(--border);
        contain: content;
    }

    .other {
        text-align: right;
    }

    .other a {
        color: var(--kind-color);
    }
</style>
