<script lang="ts">
    import type { Entry } from '../reference'
    import TypeList from './TypeList.svelte'

    let { entry }: { entry: Entry } = $props()

    const hasDefaults = $derived(entry.parameters.some((parameter) => parameter.default !== undefined))
    const columnCount = $derived(hasDefaults ? 3 : 2)
</script>

<table>
    <colgroup>
        <col class="name-column" />
        <col />
        {#if hasDefaults}
            <col class="default-column" />
        {/if}
    </colgroup>
    {#if entry.parameters.length > 0}
        <tbody>
            {#each entry.parameters as parameter, index (index)}
                <tr>
                    <td>{parameter.name}</td>
                    <td><TypeList types={parameter.types} hrefs={entry.typeHrefs} /></td>
                    {#if hasDefaults}
                        <td>{parameter.default ?? ''}</td>
                    {/if}
                </tr>
                {#if parameter.description}
                    <tr>
                        <td class="description" colspan={columnCount}>{parameter.description}</td>
                    </tr>
                {/if}
            {/each}
        </tbody>
    {/if}
    {#if entry.returns.length > 0}
        <tfoot>
            <tr>
                <td class="label">returns</td>
                <td colspan={columnCount - 1}><TypeList types={entry.returns} hrefs={entry.typeHrefs} /></td>
            </tr>
        </tfoot>
    {/if}
</table>

<style>
    table {
        width: 100%;
        font-size: var(--size-sm);
        table-layout: fixed;
        border-collapse: collapse;
    }

    .name-column {
        width: 30%;
    }

    .default-column {
        width: 15%;
    }

    td {
        padding: 0 var(--gap);
        border-block: 1px solid var(--color-border);
        line-height: var(--row-height);
        vertical-align: top;
        overflow-wrap: anywhere;
    }

    .description {
        padding-block: calc(var(--gap) / 2);
        line-height: 1.5;
        color: var(--color-muted);
    }

    tbody + tfoot td {
        border-top-width: 3px;
        border-top-style: double;
    }

    .label {
        color: var(--color-muted);
    }
</style>
