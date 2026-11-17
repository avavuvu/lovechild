<script lang="ts">
    import { goto } from '$app/navigation'
    import { exampleNames } from './examples'

    let { current }: { current: string } = $props()

    const open = (name: string) => goto(`/examples/${name}`, { state: { isChosen: true } })

    const step = (offset: number) => {
        const index = exampleNames.indexOf(current)
        open(exampleNames.at((index + offset) % exampleNames.length) ?? current)
    }
</script>

<nav>
    <button type="button" onclick={() => step(-1)}>←</button>
    <select value={current} onchange={(event) => open(event.currentTarget.value)}>
        {#each exampleNames as name (name)}
            <option value={name}>{name}</option>
        {/each}
    </select>
    <button type="button" onclick={() => step(1)}>→</button>
</nav>

<style>
    nav {
        display: flex;
        height: var(--row-height);
        background: var(--color-background);
        border: var(--border);
    }

    button,
    select {
        height: 100%;
        background: var(--color-background);
        color: var(--color-foreground);
        cursor: pointer;
    }

    button {
        min-width: 32px;
    }
</style>
