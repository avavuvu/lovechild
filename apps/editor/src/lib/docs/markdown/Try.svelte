<script lang="ts">
    import { onMount } from 'svelte'
    import type { Editor } from '../../editor/editor'
    import { getExamplePlayer } from '../../player'
    import { getDocsContext } from '../context'

    let { code, language = 'lovechild' }: { code: string, language?: 'lovechild' | 'hydra' } = $props()

    // svelte-ignore state_referenced_locally
    const isHydra = language === 'hydra'
    const hydraUrl = $derived(`https://hydra.ojack.xyz/?code=${encodeURIComponent(btoa(encodeURIComponent(code)))}`)

    const player = getExamplePlayer()
    const isPlayable = getDocsContext()?.isPlayable ?? true
    const id = Symbol('example')
    const isPlaying = $derived(player.playing === id)

    let container: HTMLElement | undefined = $state.raw()
    let editor: Editor | undefined = $state.raw()

    const play = async (current: string) => {
        const result = await player.play({ id, code: current, onFrame: (time, haps) => editor?.highlight(time, haps) })

        if (result) {
            editor?.showEvaluation(result)
        }
    }

    const toggle = () => {
        if (isPlaying) {
            player.stop()
            return
        }

        if (editor) {
            editor.evaluate()
            return
        }

        play(code)
    }

    onMount(() => {
        if (!isPlayable) {
            return
        }

        let isMounted = true

        import('../../editor/editor').then(({ createEditor }) => {
            if (!isMounted || !container) {
                return
            }

            editor = createEditor({ parent: container, onEvaluate: isHydra ? () => {} : play, onStop: player.stop, isReadOnly: isHydra })
            editor.setCode(code)
        })

        return () => {
            isMounted = false
            editor?.destroy()
        }
    })
</script>

{#if isPlayable}
    <figure>
        <div bind:this={container}></div>
        {#if !editor}
            <pre><code>{code}</code></pre>
        {/if}
        {#if isHydra}
            <a class="action" href={hydraUrl} target="_blank" rel="noreferrer">↗</a>
        {:else}
            <button class="action" type="button" onclick={toggle}>{isPlaying ? '■' : '▶'}</button>
        {/if}
    </figure>
{:else}
    <pre class="static"><code>{code}</code></pre>
{/if}

<style>
    figure {
        --code-font-size: 14px;
        position: relative;
        background: var(--color-background);
        color: var(--color-syntax-foreground);
        border: var(--border);
    }

    div {
        padding-right: calc(var(--row-height) + var(--gap));
    }

    pre {
        padding: var(--gap) calc(var(--row-height) + var(--gap)) var(--gap) var(--gap);
        overflow-x: auto;
    }

    .static {
        padding: var(--gap);
        background: var(--color-background);
        color: var(--color-syntax-foreground);
        border: var(--border);
    }

    .action {
        display: grid;
        place-items: center;
        position: absolute;
        top: 0;
        right: 0;
        width: 32px;
        height: var(--row-height);
        background: var(--color-background);
        color: var(--color-foreground);
        text-decoration: none;
        cursor: pointer;
    }
</style>
