<script lang="ts">
    import type { Snippet } from 'svelte'

    let { children }: { children: Snippet } = $props()
</script>

<p class="hatnote">
    {@render children()}
</p>

<style>
    .hatnote {
        font-size: var(--size-sm);
        font-style: italic;
        color: var(--color-muted);
    }

    .hatnote :global(a) {
        color: var(--color-foreground);
    }
</style>
