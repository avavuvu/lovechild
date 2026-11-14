<script lang="ts">
    import { page as current } from '$app/state'
    import { getDocsContext } from '../context'
    import type { Namespace } from '../reference'
    import Hatnote from './Hatnote.svelte'
    import WikiLink from './WikiLink.svelte'

    let { page }: { page: string } = $props()

    const namespaceNames: Record<Namespace, string> = { lovechild: 'lovechild', strudel: 'Strudel' }

    const context = getDocsContext()
    const target = $derived((context?.links ?? current.data.links)?.[page])
    const description = $derived(target ? `the ${namespaceNames[target.namespace]} ${target.isConcept ? 'page' : 'function'}, ` : '')
    const label = $derived(target ? `${target.label}${target.isConcept ? '' : '()'}` : page)
</script>

<Hatnote>
    Not to be confused with {description}<WikiLink {page} {label} />.
</Hatnote>
