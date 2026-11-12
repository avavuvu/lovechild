<script lang="ts">
    import Backdrop from '$lib/Backdrop.svelte'
    import Examples from '$lib/examples/Examples.svelte'
</script>

<Backdrop />
<div>
    <Examples />
</div>

<style>
    div {
        position: fixed;
        bottom: var(--gap);
        left: 50%;
        transform: translateX(-50%);
    }
</style>
