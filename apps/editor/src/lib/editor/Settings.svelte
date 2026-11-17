<script lang="ts">
    import { changeSetting, settingNames, settingOptions, settings, type SettingName } from './preferences.svelte'

    const labels: Record<SettingName, string> = {
        theme: 'theme',
        format: 'format on run',
        resolution: 'resolution',
        fps: 'fps',
        display: 'display',
    }
</script>

<details>
    <summary>advanced settings</summary>
    <div class="settings">
        {#each settingNames as name (name)}
            <span class="name">{labels[name]}</span>
            <div class="options" role="radiogroup" aria-label={labels[name]}>
                {#each settingOptions[name] as option (option)}
                    <label>
                        <input type="radio" {name} value={option} checked={settings[name] === option} onchange={() => changeSetting(name, option)} />
                        {option}
                    </label>
                {/each}
            </div>
        {/each}
    </div>
</details>

<style>
    details {
        margin-block-start: calc(2 * var(--gap));
    }

    summary {
        cursor: pointer;
    }

    .settings {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: var(--gap) 16px;
        margin-block-start: var(--gap);
    }

    .name {
        color: var(--color-muted);
    }

    .options {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
    }

    label {
        cursor: pointer;
    }
</style>
