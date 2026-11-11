<script lang="ts">
    import type { Snippet } from 'svelte'
    import { displays, type Display } from './output'

    let { display = $bindable('code'), children }: {
        display?: Display
        children?: Snippet
    } = $props()
</script>

{@render children?.()}

<details>
    <summary>advanced settings</summary>
    <fieldset>
        {#each displays as name (name)}
            <label>
                <input type="radio" name="display" value={name} bind:group={display} />
                {name}
            </label>
        {/each}
    </fieldset>
</details>

<style>
    details {
        margin-top: 16px;
    }

    summary {
        cursor: pointer;
    }

    fieldset {
        display: flex;
        gap: 16px;
        margin: 8px 0 0;
        padding: 0;
        border: none;
    }

    label {
        cursor: pointer;
    }
</style>
