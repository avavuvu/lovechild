<script lang="ts">
    import { createPatternHistory, rowOpacities, type Cell, type Table } from './pattern-history'
    import type { PatternSource } from './pattern-previews.svelte'

    let { id, source }: { id: string, source: PatternSource } = $props()

    const history = createPatternHistory()
    let table: Table | undefined = $state.raw(undefined)
    let lastTime = 0

    $effect(() => {
        const pattern = source.patterns.get(id)
        const time = source.time

        if (pattern === undefined) {
            return
        }

        const from = Math.min(lastTime, time)
        lastTime = time

        try {
            table = history.update(pattern, from, time)
        } catch {
            return
        }
    })

    const isEmpty = (cell: Cell) => cell.every((part) => part.text === '')
</script>

{#snippet cellParts(cell: Cell)}
    {#if isEmpty(cell)}
        {' '}
    {:else}
        {#each cell as part}<span class={part.tone}>{part.text}</span>{/each}
    {/if}
{/snippet}

<div class="pattern-table">
    {#if table}
        <table>
            {#if table.header}
                <thead>
                    <tr>
                        {#each table.header as cell, column}
                            <th style:width="{table.widths[column]}ch">{@render cellParts(cell)}</th>
                        {/each}
                    </tr>
                </thead>
            {/if}
            <tbody>
                {#each table.rows as row, index}
                    <tr style:opacity={rowOpacities[index]}>
                        {#each row as cell, column}
                            <td style:width="{table.widths[column]}ch">{@render cellParts(cell)}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    {:else}
        ~
    {/if}
</div>

<style>
    .pattern-table {
        width: fit-content;
        padding: 0 6px;
        background: var(--color-line-background);
    }

    table {
        border-collapse: collapse;
        font: inherit;
    }

    th,
    td {
        padding: 0 2ch 0 0;
        text-align: left;
        font-weight: inherit;
        white-space: pre;
    }

    th:last-child,
    td:last-child {
        padding: 0;
    }

    .name {
        color: var(--color-syntax-variable);
    }

    .number {
        color: var(--color-syntax-number);
    }

    .string {
        color: var(--color-syntax-pattern-string);
    }

    .boolean {
        color: var(--color-syntax-bool);
    }

    .faint {
        color: var(--color-gutter);
    }
</style>
