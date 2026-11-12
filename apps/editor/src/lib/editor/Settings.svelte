<script lang="ts">
    import { displays, type Display } from './displays'

    let { display = $bindable('code') }: {
        display?: Display
    } = $props()
</script>

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
        margin-block-start: calc(2 * var(--gap));
    }

    summary {
        cursor: pointer;
    }

    fieldset {
        display: flex;
        gap: 16px;
        margin-block-start: var(--gap);
    }

    label {
        cursor: pointer;
    }
</style>
