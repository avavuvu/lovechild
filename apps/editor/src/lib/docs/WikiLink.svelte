<script lang="ts">
    import type { Snippet } from 'svelte'
    import { page as current } from '$app/state'
    import { getDocsContext } from './context'

    let { page, children }: { page: string, children?: Snippet } = $props()

    const context = getDocsContext()
    const href = $derived((context?.links ?? current.data.links)?.[page])
</script>

{#if href}
    <a {href}>{@render children?.()}</a>
{:else}
    <span class="missing">{@render children?.()}</span>
{/if}

<style>
    .missing {
        color: var(--color-error);
    }
</style>
