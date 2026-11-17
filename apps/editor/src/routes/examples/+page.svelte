<script lang="ts">
    import { onMount } from 'svelte'
    import { goto } from '$app/navigation'
    import Backdrop from '$lib/Backdrop.svelte'
    import { pickExampleName } from '$lib/examples/examples'

    onMount(() => {
        goto(`/examples/${pickExampleName()}`, { replaceState: true })
    })
</script>

<Backdrop />
