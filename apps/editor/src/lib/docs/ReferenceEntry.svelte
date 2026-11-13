<script lang="ts">
    import { getEntryKind, isConcept, type Entry } from './reference'
    import Try from './Try.svelte'

    let { entry, heading = 'h2', isPlayable = false, isLinked = false }: {
        entry: Entry
        heading?: string
        isPlayable?: boolean
        isLinked?: boolean
    } = $props()

</script>

<section class={getEntryKind(entry)}>
    <hgroup>
        <p class="categories">{entry.categories.join(', ')}</p>
        <svelte:element this={heading} class="signature">
            {#if isLinked}
                <a class="name" href={entry.href}>{entry.label}</a>
            {:else}
                <span class="name">{entry.label}</span>
            {/if}{#if !isConcept(entry)}<span class="punctuation">(</span>{#each entry.parameters as parameter, index (index)}{#if index > 0}<span class="punctuation">{', '}</span>{/if}<span class="parameter">{parameter.name}</span>{/each}<span class="punctuation">)</span>{/if}
        </svelte:element>
    </hgroup>
    {#if entry.parameters.length > 0}
        <table>
            <colgroup>
                <col class="name-column" />
                <col class="types-column" />
                <col class="default-column" />
            </colgroup>
            <tbody>
                {#each entry.parameters as parameter, index (index)}
                    <tr>
                        <td>{parameter.name}</td>
                        <td>
                            <ul>
                                {#each parameter.types as type, typeIndex (typeIndex)}
                                    <li>{#if typeIndex > 0}<span class="or">{'or '}</span>{/if}{type}</li>
                                {/each}
                            </ul>
                        </td>
                        <td class="default">{parameter.default}</td>
                    </tr>
                    {#if parameter.description}
                        <tr>
                            <td class="description" colspan="3">{parameter.description}</td>
                        </tr>
                    {/if}
                {/each}
            </tbody>
        </table>
    {/if}
    {#if entry.synonyms.length > 1}
        <div class="aliases">
            <p>
                aliases:
            </p>
            <ul>
                {#each entry.synonyms as synonym (synonym)}
                    <li><code>{synonym}()</code></li>
                {/each}
            </ul>
        </div>
    {/if}

    {@html entry.description}

    {#each entry.examples as example, index (index)}
        {#if isPlayable}
            <Try code={example} />
        {:else}
            <pre><code>{example}</code></pre>
        {/if}
    {/each}
</section>

<style>
    section {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
        gap: var(--gap);
    }

    .categories {
        line-height: var(--row-height);
        letter-spacing: 0.05em;
    }

    .signature {
        min-height: calc(2 * var(--row-height));
        font-size: 1.25em;
        line-height: var(--row-height);
        overflow-wrap: anywhere;
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

    .parameter {
        white-space: nowrap;
    }

    table {
        width: 100%;
        font-size: 0.9em;
        table-layout: fixed;
        border-collapse: collapse;
    }

    .name-column {
        width: 40%;
    }

    .types-column {
        width: 40%;
    }

    .default-column {
        width: 20%;
    }

    td {
        padding: 0 var(--gap);
        border-top: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);
        line-height: var(--row-height);
        vertical-align: top;
        overflow-wrap: anywhere;
    }

    td ul {
        padding-block: calc((var(--row-height) - 1.5em) / 2);
        line-height: 1.5;
    }

    .description {
        padding-block: calc(var(--gap) / 2);
        line-height: 1.5;
    }

    .or {
        color: var(--color-muted);
    }

    .aliases {
        display: flex;
        flex-wrap: wrap;
        gap: 1ch;
        /*font-size: 0.85em;*/
        color: var(--color-muted);
    }

    .aliases ul {
        display: flex;
        flex-wrap: wrap;
        gap: 1ch;
    }

    .aliases code {
        color: var(--kind-color);
    }

    pre {
        padding: var(--gap);
        overflow-x: auto;
        background: var(--color-background);
        color: var(--color-syntax-foreground);
        border: var(--border);
    }
</style>
