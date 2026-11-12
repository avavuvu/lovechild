<script lang="ts">
    let { href = '/code' }: { href?: string } = $props()
</script>

<a {href} tabindex="-1" aria-hidden="true"></a>

<style>
    a {
        position: fixed;
        inset: 0;
    }
</style>
