<script lang="ts">
    import { createRuntime, type Runtime } from '@heartbreak/strudel'
    import { onMount } from 'svelte'
    import { createEditor, type Editor } from './editor'
    import Toolbar from './Toolbar.svelte'

    const exampleFiles = import.meta.glob<string>('./examples/*.js', { query: '?raw', import: 'default', eager: true })

    const getExampleName = (path: string) => path.replace(/^.*\//, '').replace(/\.js$/, '')

    const defaultExample = 'demo'

    const examples = new Map(Object.entries(exampleFiles).map(([path, code]) => [getExampleName(path), code]))

    let canvas: HTMLCanvasElement
    let container: HTMLElement
    let runtime: Runtime | undefined
    let editor: Editor | undefined
    let isPanelOpen = $state(true)

    const evaluateCode = async (code: string) => {
        if (!runtime || !editor) {
            return
        }

        try {
            editor.showEvaluation(await runtime.evaluate(code))
        } catch (error) {
            console.error(error)
        }
    }

    const selectExample = (name: string) => {
        const code = examples.get(name)

        if (code !== undefined) {
            editor?.setCode(code)
        }
    }

    onMount(() => {
        runtime = createRuntime(canvas, {
            onFrame: (time, haps) => editor?.highlight(time, haps),
        })

        editor = createEditor({
            parent: container,
            onEvaluate: evaluateCode,
            onStop: () => runtime?.stop(),
        })

        selectExample(defaultExample)

        return () => {
            editor?.destroy()
            runtime?.destroy()
        }
    })
</script>

<svelte:head>
    <title>
        lovechild REPL
    </title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 16 16'><text x='0' y='14'>💌</text></svg>" />
</svelte:head>

<canvas bind:this={canvas}></canvas>
    <Toolbar
        examples={Array.from(examples.keys())}
        selected={defaultExample}
        onPlay={() => editor?.evaluate()}
        onStop={() => runtime?.stop()}
        onSelect={selectExample}
        bind:isExpanded={isPanelOpen}
    >
        <p>
        lovechild is an open source video synth
        </p>
        <p>
        it is based on the live-coding platform <a href="https://strudel.cc/">strudel</a>,
        combining it with a video synth inspired by <a href="https://hydra.ojack.xyz/?">hydra</a>.
        </p>
        <p>
        made by <a href="https://avavu.au">ava dinh-vu</a>
        </p>
    </Toolbar>
<main bind:this={container} class:narrow={isPanelOpen}></main>

<style>
    :global(body) {
        margin: 0;
        overflow: hidden;
        background: black;
        --foreground: white;
        --panel-width: 400px;
    }

    canvas {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
    }

    header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        /*height: 40px;*/
    }

    main {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }

    main.narrow {
        right: var(--panel-width);
    }
</style>
