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
        width: min(720px, 100% - 2 * var(--gap));
        height: fit-content;
        max-height: 80dvh;
        margin: auto;
        overflow: auto;
        padding: calc(4 * var(--gap)) calc(5 * var(--gap));
        background: var(--color-background);
        color: var(--color-foreground);
        border: var(--border);
        contain: content;
        --prose-size: var(--size-lg);
    }

    article > :global(* + *) {
        margin-block-start: calc(3 * var(--gap));
    }

    article > :global(h3:not(:first-child)) {
        margin-block-start: calc(7 * var(--gap));
    }

    article > :global(h2:not(:first-child)) {
        margin-block-start: calc(12 * var(--gap));
    }

    article > :global(:is(h2, h3) + *) {
        margin-block-start: calc(2 * var(--gap));
    }

    article > :global(section) {
        gap: calc(3 * var(--gap));
    }

    article > :global(section > h3) {
        margin-block-start: calc(4 * var(--gap));
    }

    article > :global(section > h2) {
        margin-block-start: calc(9 * var(--gap));
    }

    article > :global(section > :is(h2, h3) + *) {
        margin-block-start: 0;
    }

    article :global(:is(p, ul, ol, blockquote)) {
        line-height: 1.6;
    }
</style>
