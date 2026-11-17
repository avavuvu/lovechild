<script lang="ts">
    import Hatnote from './Hatnote.svelte'

    let { name }: { name: string } = $props()

    const href = $derived(`https://hydra.ojack.xyz/api/#functions/${name}/0`)
</script>

<Hatnote>
    Based on the Hydra function, <code><a {href}>{name}()</a></code>.
</Hatnote>
