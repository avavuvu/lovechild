<script lang="ts">
    import { exampleNames, examples } from './examples'
    import { getExamplePlayer } from '../player'

    const player = getExamplePlayer()
    const id = Symbol('examples')

    let selected = $state(exampleNames.find((name) => examples.get(name) === player.code) ?? '')

    const select = (name: string) => {
        selected = name
        player.play({ id, code: examples.get(name) ?? '', onFrame: () => {} })
    }

    const step = (offset: number) => {
        const index = exampleNames.indexOf(selected)
        const current = index === -1 && offset < 0 ? 0 : index
        select(exampleNames.at((current + offset) % exampleNames.length) ?? '')
    }
</script>

<nav>
    <button type="button" onclick={() => step(-1)}>←</button>
    <select value={selected} onchange={(event) => select(event.currentTarget.value)}>
        <option value="" disabled></option>
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
