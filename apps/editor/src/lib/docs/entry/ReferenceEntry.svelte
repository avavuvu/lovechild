<script lang="ts">
    import type { Snippet } from 'svelte'
    import ParameterTable from './ParameterTable.svelte'
    import { getEntryKind, isConcept, type Entry } from '../reference'
    import RelatedList from './RelatedList.svelte'
    import Try from '../markdown/Try.svelte'

    let { entry, heading = 'h2', isPlayable = false, isLinked = false, children }: {
        entry: Entry
        heading?: string
        isPlayable?: boolean
        isLinked?: boolean
        children?: Snippet
    } = $props()

    const isFunction = $derived(!isConcept(entry))
    const aliases = $derived(entry.synonyms.filter((synonym) => synonym !== entry.label).map((synonym) => isFunction ? `${synonym}()` : synonym).join(', '))
    const hasTable = $derived(entry.parameters.length > 0 || entry.returns.length > 0)
</script>

<section class="prose {getEntryKind(entry)}">
    <hgroup>
        <ul class="categories">
            {#each entry.categories as category (category)}
                <li>
                    {#if entry.categoryHrefs[category]}
                        <a href={entry.categoryHrefs[category]}>{category}</a>
                    {:else}
                        {category}
                    {/if}
                </li>
            {/each}
        </ul>
        <svelte:element this={heading} class="signature">
            <svelte:element this={isLinked ? 'a' : 'span'} class="name" class:mono={isFunction} href={isLinked ? entry.href : undefined}>
                {entry.label}
            </svelte:element>
            {#if isFunction}
                <ol class="parameters mono">
                    {#each entry.parameters as parameter (parameter.name)}
                        <li>{parameter.name}</li>
                    {/each}
                </ol>
            {/if}
        </svelte:element>
    </hgroup>

    {@render children?.()}

    <div class="description">
        {@html entry.description}

        <div class="examples">
            {#each entry.examples as example, index (index)}
                {#if isPlayable}
                    <Try code={example} />
                {:else}
                    <pre><code>{example}</code></pre>
                {/if}
            {/each}

        </div>

    </div>

    {#if aliases}
        <p class="aliases"><span class="punctuation">aliases:</span> <span class:mono={isFunction}>{aliases}</span></p>
    {/if}



    {#if hasTable}
        <ParameterTable {entry} />
    {/if}

    <RelatedList label="methods" references={entry.methods} />
    <RelatedList label="returned by" references={entry.returnedBy} />
    <RelatedList label="accepted by" references={entry.acceptedBy} />
    <RelatedList label="in this category" references={entry.members} />
    <RelatedList label="mentioned in" references={entry.mentionedIn} />
</section>

<style>
    section {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
        gap: var(--gap);
    }

    .categories {
        display: flex;
        flex-wrap: wrap;
        line-height: var(--row-height);
        letter-spacing: 0.05em;
    }

    .categories li:not(:last-child)::after {
        content: ', ';
        white-space: pre;
    }

    .signature {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        min-height: calc(2 * var(--row-height));
        font-size: var(--size-xl);
        line-height: var(--row-height);
    }

    .aliases {
        font-size: var(--size-sm);
    }

    .description {
        padding-bottom: var(--row-height);
    }

    .examples {
        padding-top: var(--row-height);
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    .parameters {
        display: flex;
        flex-wrap: wrap;
    }

    .parameters::before,
    .parameters::after,
    .parameters li:not(:last-child)::after {
        color: var(--color-muted);
    }

    .parameters::before {
        content: '(';
    }

    .parameters::after {
        content: ')';
    }

    .parameters li:not(:last-child)::after {
        content: ', ';
        white-space: pre;
    }

    .name {
        font-weight: bold;
        color: var(--kind-color);
        text-decoration: none;
    }

    a.name:hover {
        text-decoration: underline;
    }

    .punctuation {
        color: var(--color-muted);
    }

    pre {
        padding: var(--gap);
        overflow-x: auto;
        background: var(--color-background);
        color: var(--color-syntax-foreground);
        border: var(--border);
    }
</style>
