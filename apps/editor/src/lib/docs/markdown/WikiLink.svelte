<script lang="ts">
    import { page as current } from '$app/state'
    import { getDocsContext } from '../context'
    import { getHref, strudelPrefix } from '../reference'

    let { page, label }: { page: string, label: string } = $props()

    const guessHref = (written: string) => {
        const name = written.trim().replace(/\(\)$/, '')
        return name.startsWith(strudelPrefix) ? getHref('strudel', name.slice(strudelPrefix.length)) : getHref('lovechild', name)
    }

    const context = getDocsContext()
    const target = $derived((context?.links ?? current.data.links)?.[page])
    const href = $derived(target?.href ?? guessHref(page))
    const isCall = $derived(label.endsWith('()'))
</script>

{#if isCall}
    <code>
        <a class:missing={!target} {href}>{label}</a>
    </code>
{:else}
    <a class:missing={!target} {href}>{label}</a>
{/if}

<style>
    .missing {
        color: var(--color-error);
    }
</style>
