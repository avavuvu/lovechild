<script lang="ts">
    import { createRuntime, type Runtime } from '@lovechild/strudel'
    import { slider, sliderWithID } from '@strudel/codemirror/slider.mjs'
    import { onMount } from 'svelte'
    import { createEditor, type Editor } from './editor'
    import { formatOutput, type Display, type Output } from './output'
    import Panel from './Panel.svelte'
    import Toolbar from './Toolbar.svelte'
    import { createViewer, type Viewer } from './viewer'

    const exampleFiles = import.meta.glob<string>('./examples/*.js', { query: '?raw', import: 'default', eager: true })

    const getExampleName = (path: string) => path.replace(/^.*\//, '').replace(/\.js$/, '')

    const defaultExample = 'demo'

    const examples = new Map(Object.entries(exampleFiles).map(([path, code]) => [getExampleName(path), code]))

    let canvas: HTMLCanvasElement
    let container: HTMLElement
    let viewerContainer: HTMLElement
    let runtime: Runtime | undefined
    let editor: Editor | undefined
    let viewer: Viewer | undefined
    let isPanelOpen = $state(true)
    let output: Output = $state.raw({ code: '', transpiled: '', graph: undefined })
    let display: Display = $state('code')

    const evaluateCode = async (code: string) => {
        if (!runtime || !editor) {
            return
        }

        try {
            const result = await runtime.evaluate(code)
            editor.showEvaluation(result)
            output = { code, transpiled: result.transpiled, graph: result.graph }
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
            scope: { slider, sliderWithID },
        })

        editor = createEditor({
            parent: container,
            onEvaluate: evaluateCode,
            onStop: () => runtime?.stop(),
        })

        viewer = createViewer({
            parent: viewerContainer,
            onEvaluate: () => editor?.evaluate(),
            onStop: () => runtime?.stop(),
        })

        selectExample(defaultExample)

        return () => {
            viewer?.destroy()
            editor?.destroy()
            runtime?.destroy()
        }
    })

    $effect(() => {
        if (display === 'code') {
            return
        }

        const shown = display
        let isCurrent = true

        formatOutput(shown, output).then((code) => {
            if (isCurrent) {
                viewer?.show(code)
            }
        })

        return () => {
            isCurrent = false
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
        <Panel bind:display>
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
        </Panel>
    </Toolbar>
<main class:narrow={isPanelOpen}>
    <div bind:this={container} hidden={display !== 'code'}></div>
    <div bind:this={viewerContainer} hidden={display === 'code'}></div>
</main>

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

    main > div {
        height: 100%;
    }
</style>
