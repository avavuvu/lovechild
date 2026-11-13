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

    article > :global(:is(p, ul, ol, h2, h3, blockquote)) {
        font-family: 'Times New Roman', Times, serif;
        font-size: 1.2em;
        line-height: 1.35;
    }

    article :global(h2) {
        font-size: 1.15em;
        font-weight: bold;
    }

    article :global(h3) {
        font-weight: bold;
    }

    article > :global(:is(h2, h3) + *) {
        margin-block-start: calc(var(--gap) / 2);
    }

    article :global(:not(pre) > code) {
        padding: 0 0.4ch;
        background: color-mix(in srgb, var(--color-muted) 22%, transparent);
    }

    article :global(:is(h2, h3) code) {
        padding: 0;
        background: none;
    }

    article :global(ul) {
        padding-inline-start: 2ch;
        list-style: '- ';
    }

    .other {
        text-align: right;
    }

    .other a {
        color: var(--kind-color);
    }
</style>
