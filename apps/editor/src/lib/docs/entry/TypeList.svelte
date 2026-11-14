<script lang="ts">
    let { types, hrefs }: { types: ReadonlyArray<string>, hrefs: Record<string, string> } = $props()
</script>

<ul>
    {#each types as type (type)}
        <li>
            {#if hrefs[type]}
                <a href={hrefs[type]}>{type}</a>
            {:else}
                {type}
            {/if}
        </li>
    {/each}
</ul>

<style>
    ul {
        display: flex;
        flex-wrap: wrap;
        column-gap: 0.25em;
    }

    li:not(:last-child)::after {
        content: ',';
        color: var(--color-muted);
    }

    li:nth-last-child(2)::after {
        content: ' or';
        white-space: pre;
    }

    a {
        color: inherit;
    }
</style>
