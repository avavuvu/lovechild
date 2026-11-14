<script lang="ts">
    import Hatnote from './Hatnote.svelte'

    let { name }: { name: string } = $props()

    // svelte-ignore state_referenced_locally
    const apiUrl = `https://hydra.ojack.xyz/api/#functions/${name}/0`
</script>

<Hatnote>
    <a href={apiUrl}>Hydra has a function called {name}().</a>
</Hatnote>
