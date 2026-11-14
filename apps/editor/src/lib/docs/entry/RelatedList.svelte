<script lang="ts">
    import type { EntryReference } from '../reference'

    let { label, references }: { label: string, references: ReadonlyArray<EntryReference> } = $props()
</script>

{#if references.length > 0}
    <details>
        <summary>{label} ({references.length})</summary>
        <ul>
            {#each references as reference (reference.href)}
                <li><a class={reference.kind} href={reference.href}>{reference.label}</a></li>
            {/each}
        </ul>
    </details>
{/if}

<style>
    details {
        color: var(--color-muted);
    }

    summary {
        cursor: pointer;
    }

    ul {
        display: flex;
        flex-wrap: wrap;
        gap: 0 1ch;
    }

    a {
        color: var(--kind-color);
    }
</style>
