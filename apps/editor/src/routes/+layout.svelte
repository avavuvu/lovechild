<script lang="ts">
    import type { Location, Runtime, Warning } from '@lovechild/strudel'
    import { onMount, type Snippet } from 'svelte'
    import { afterNavigate, goto } from '$app/navigation'
    import { page } from '$app/state'
    import Graph from '$lib/docs/Graph.svelte'
    import QuickReference from '$lib/docs/QuickReference.svelte'
    import type { Display } from '$lib/editor/displays'
    import type { Editor } from '$lib/editor/editor'
    import type { LineMessage } from '$lib/editor/lines'
    import type { Output } from '$lib/editor/output'
    import Settings from '$lib/editor/Settings.svelte'
    import { readSavedCode, saveCode } from '$lib/editor/storage'
    import type { Viewer } from '$lib/editor/viewer'
    import { examples, pickExampleName } from '$lib/examples/examples'
    import { describeError, describeWarning, type Notice } from '$lib/messages'
    import { setExamplePlayer, type Example, type ExamplePlayer } from '$lib/player'
    import CodeToolbar from '$lib/toolbar/CodeToolbar.svelte'
    import ExploreToolbar from '$lib/toolbar/ExploreToolbar.svelte'
    import Toolbar from '$lib/toolbar/Toolbar.svelte'
    import '../app.css'

    let { children }: { children: Snippet } = $props()

    const codePath = '/code'
    const explorePath = '/explore'
    const editorId = Symbol('editor')
    const graphRoutes = ['/explore', '/[page]', '/strudel/[page]']
    const isCodePage = $derived(page.route.id === codePath)
    const isGraphPage = $derived(graphRoutes.includes(page.route.id ?? ''))
    const isExplorePage = $derived(page.route.id === explorePath)
    const paneless = [codePath, explorePath]

    let canvas: HTMLCanvasElement
    let container: HTMLElement
    let viewerContainer: HTMLElement
    let runtime: Runtime | undefined
    let editor: Editor | undefined = $state.raw()
    let viewer: Viewer | undefined
    let locateError: ((error: unknown) => ReadonlyArray<Location>) | undefined
    let isMuted = $state(true)
    let isPanelOpen = $state(true)
    let display: Display = $state('code')
    let output: Output = $state.raw({ code: '', transpiled: '', graph: undefined })
    let notices: Array<Notice> = $state([])
    let warnings: Array<Warning> = []
    let errors: Array<LineMessage> = []
    let playing: Example | undefined = $state.raw()
    let last: Example | undefined
    let lastPanePath = $state('/')
    let search = $state('')
    let searchFocus: string | undefined = $state()

    afterNavigate(({ from }) => {
        if (from && !paneless.includes(from.route.id ?? '')) {
            lastPanePath = from.url.pathname
        }
    })

    const addNotice = (notice: Notice) => {
        notices = [...notices, notice]
    }

    const showWarning = (warning: Warning) => {
        console.warn(warning)

        if (warning.locations.length > 0 && playing?.showWarning) {
            playing.showWarning(warning)
            return
        }

        addNotice({ kind: 'warning', text: describeWarning(warning) })
    }

    const showError = (error: unknown, locations: ReadonlyArray<Location>) => {
        console.error(error)

        if (locations.length > 0 && playing?.showError) {
            playing.showError(error, locations)
            return
        }

        addNotice({ kind: 'error', text: describeError(error) })
    }

    const unmute = async () => {
        if (!isMuted) {
            return
        }

        isMuted = false
        await runtime?.unmute()
    }

    const mutedNotice: Notice = { kind: 'info', text: 'muted', onSelect: unmute }
    const shownNotices = $derived(isMuted ? [mutedNotice, ...notices] : notices)

    const player: ExamplePlayer = {
        get playing() {
            return playing?.id
        },
        get code() {
            return last?.code
        },
        play: async (example) => {
            if (!example.isAutomatic) {
                await unmute()
            }

            playing?.onFrame(0, [])
            playing = example
            last = example
            notices = []

            try {
                return await runtime?.evaluate(example.code)
            } catch (error) {
                showError(error, locateError?.(error) ?? [])
                return undefined
            }
        },
        stop: () => {
            runtime?.stop()
            playing = undefined
        },
    }

    setExamplePlayer(player)

    const showEditorWarning = (warning: Warning) => {
        warnings = [...warnings, warning]
        editor?.showWarnings(warnings.flatMap((shown) => shown.locations.map((location) => ({ location, text: describeWarning(shown) }))))
    }

    const showEditorError = (error: unknown, locations: ReadonlyArray<Location>) => {
        errors = [...errors, ...locations.map((location) => ({ location, text: describeError(error) }))]
        editor?.showErrors(errors)
    }

    const playEditor = async (code: string, isAutomatic = false) => {
        warnings = []
        errors = []
        editor?.showWarnings([])
        editor?.showErrors([])

        const result = await player.play({
            id: editorId,
            code,
            isAutomatic,
            onFrame: (time, haps) => editor?.highlight(time, haps),
            showWarning: showEditorWarning,
            showError: showEditorError,
        })

        if (result) {
            editor?.showEvaluation(result)
            output = { code, transpiled: result.transpiled, graph: result.graph }
        }
    }

    const evaluateEditor = (code: string) => {
        saveCode(code)
        playEditor(code)
    }

    const isEditing = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) {
            return false
        }

        const isFilledField = (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && target.value !== ''
        return isFilledField || target.closest('.cm-editor') !== null
    }

    const goBack = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || event.defaultPrevented || isCodePage || isEditing(event.target)) {
            return
        }

        goto(isExplorePage ? codePath : explorePath)
    }

    const replay = () => {
        if (last) {
            player.play({ ...last, isAutomatic: false })
        }
    }

    onMount(() => {
        let isMounted = true

        Promise.all([
            import('@lovechild/strudel'),
            import('$lib/editor/editor'),
            import('$lib/editor/viewer'),
            import('@strudel/codemirror/slider.mjs'),
        ]).then(([strudel, { createEditor }, { createViewer }, { slider, sliderWithID }]) => {
            if (!isMounted) {
                return
            }

            locateError = strudel.locateError

            runtime = strudel.createRuntime(canvas, {
                onFrame: (time, haps) => playing?.onFrame(time, haps),
                onWarning: showWarning,
                onPlaybackError: showError,
                scope: { slider, sliderWithID },
            })

            editor = createEditor({ parent: container, onEvaluate: evaluateEditor, onStop: player.stop })
            viewer = createViewer({ parent: viewerContainer, onEvaluate: () => editor?.evaluate(), onStop: player.stop })

            const code = readSavedCode() ?? examples.get(pickExampleName()) ?? ''
            editor.setCode(code)

            if (isCodePage) {
                playEditor(code, true)
                return
            }

            player.play({ id: Symbol('background'), code, isAutomatic: true, onFrame: () => {} })
        })

        return () => {
            isMounted = false
            viewer?.destroy()
            editor?.destroy()
            runtime?.destroy()
        }
    })

    $effect(() => {
        if (isCodePage && editor && playing && playing.id !== editorId) {
            editor.setCode(playing.code)
            playEditor(playing.code)
        }
    })

    $effect(() => {
        if (display === 'code') {
            return
        }

        const shown = display
        let isCurrent = true

        import('$lib/editor/output').then(({ formatOutput }) => formatOutput(shown, output)).then((code) => {
            if (isCurrent) {
                viewer?.show(code)
            }
        })

        return () => {
            isCurrent = false
        }
    })
</script>

<svelte:window onkeydown={goBack} />

<svelte:head>
    <title>
        lovechild REPL
    </title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 16 16'><text x='0' y='14'>💌</text></svg>" />
</svelte:head>

{#snippet panel()}
    <QuickReference />
    <Settings bind:display />
{/snippet}

<canvas class="stage" bind:this={canvas}></canvas>
<main hidden={!isCodePage} class:narrow={isCodePage && isPanelOpen}>
    <div bind:this={container} hidden={display !== 'code'}></div>
    <div bind:this={viewerContainer} hidden={display === 'code'}></div>
</main>
<Graph current={page.url.pathname} isVisible={isGraphPage} isInteractive={isExplorePage} search={isExplorePage ? search : ''} focus={isExplorePage ? searchFocus : undefined} />
{@render children()}
{#if isCodePage}
    <CodeToolbar
        infoHref={lastPanePath}
        notices={shownNotices}
        onPlay={() => editor?.evaluate()}
        onStop={player.stop}
        {panel}
        bind:isPanelOpen
    />
{:else if isExplorePage}
    <ExploreToolbar
        infoHref={lastPanePath}
        notices={shownNotices}
        onPlay={replay}
        onStop={player.stop}
        bind:search
        bind:focus={searchFocus}
    />
{:else}
    <Toolbar
        isGraphSelected={isGraphPage}
        isInfoSelected
        infoHref={lastPanePath}
        notices={shownNotices}
        onPlay={replay}
        onStop={player.stop}
    />
{/if}

<style>
    main {
        position: fixed;
        inset: 0;
        contain: strict;
    }

    main.narrow {
        right: var(--panel-width);
    }

    main > div {
        height: 100%;
    }
</style>
