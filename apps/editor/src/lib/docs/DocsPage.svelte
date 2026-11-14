<script lang="ts">
    import type { Component } from 'svelte'
    import Backdrop from '../Backdrop.svelte'
    import { indexName, type DocumentData } from './reference'
    import ReferenceEntry from './entry/ReferenceEntry.svelte'

    let { data }: { data: DocumentData & { markdown: Component | undefined } } = $props()

    const isIndex = $derived(data.entry.namespace === 'lovechild' && data.entry.name === indexName)
</script>

<Backdrop href={isIndex ? undefined : '/explore'} />
<article class="prose flow">
    {#if isIndex}
        {#if data.markdown}
            <data.markdown />
        {/if}
    {:else}
        <ReferenceEntry entry={data.entry} heading="h1" isPlayable>
            {#if data.markdown}
                <data.markdown />
            {/if}
        </ReferenceEntry>
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
        --prose-size: var(--size-lg);
    }
</style>
