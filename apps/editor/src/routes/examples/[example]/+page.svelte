<script lang="ts">
    import { untrack } from 'svelte'
    import { page } from '$app/state'
    import Backdrop from '$lib/Backdrop.svelte'
    import Examples from '$lib/examples/Examples.svelte'
    import { getExamplePlayer } from '$lib/player'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    const player = getExamplePlayer()

    $effect(() => {
        const { name, code } = data
        untrack(() => player.play({ id: Symbol(name), code, isAutomatic: !page.state.isChosen, onFrame: () => {} }))
    })
</script>

<Backdrop />
<div>
    <Examples current={data.name} />
</div>

<style>
    div {
        position: fixed;
        bottom: var(--gap);
        left: 50%;
        transform: translateX(-50%);
    }
</style>
