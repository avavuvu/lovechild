import { generateGraph, type Graph, type MediaInput } from '@lovechild/core'
import { createRenderer, type CompiledGraph, type MediaElement } from '@lovechild/webgl'
import * as strudel from '@strudel/core'
import { Cyclist, Hap, isPattern, Pattern, setClockTime, setTime, silence, stack, type State } from '@strudel/core'
import { cleanupDraw } from '@strudel/draw'
import * as mini from '@strudel/mini'
import * as tonal from '@strudel/tonal'
import type { Widget } from '@strudel/transpiler'
import * as webaudio from '@strudel/webaudio'
import { aliasBank, getAudioContext, initAudio, registerSynthSounds, samples, webaudioOutput } from '@strudel/webaudio'
import './curves'
import './selections'
import { evaluateCode, type MiniLocation, type Peek, type Preview } from './evaluate'
import { imageFunctions } from './images'
import type { Track } from './names'
import './events'
import './sounds'
import { createMediaElement, releaseMediaElement } from './media'
import { createPeekView, type PeekView } from './peeks'
import { createTextLayer, type TextLayer } from './text'
import { createValueReader, getNamedImages, layerImages, type ValueReader } from './visuals'
import { createWarningList, type Location, type Warning, type WarningList } from './warnings'

const sampleHost = 'https://strudel.b-cdn.net'

const logEvent = 'strudel.log'

interface Visual {
    graph: CompiledGraph
    reader: ValueReader
    previews: ReadonlyArray<HTMLElement>
    media: ReadonlyArray<MediaElement>
    texts: ReadonlyArray<TextLayer>
}

export interface PreviewElement {
    id: string
    element: HTMLElement
}

export interface EvaluationResult {
    miniLocations: ReadonlyArray<MiniLocation>
    widgets: ReadonlyArray<Widget>
    previews: ReadonlyArray<PreviewElement>
    transpiled: string
    graph: Graph | undefined
}

export interface RuntimeOptions {
    onFrame: (time: number, haps: ReadonlyArray<Hap>) => void
    onWarning?: (warning: Warning) => void
    onPlaybackError?: (error: Error, locations: ReadonlyArray<Location>) => void
    scope?: Record<string, unknown>
}

export interface Runtime {
    evaluate: (code: string) => Promise<EvaluationResult>
    unmute: () => Promise<void>
    mute: () => Promise<void>
    stop: () => void
    destroy: () => void
}

let audioReady: Promise<void> | undefined

const fillWhole = (hap: Hap) => hap.whole === undefined ? new Hap(hap.part, hap.part, hap.value, hap.context) : hap

export const createRuntime = (canvas: HTMLCanvasElement, options: RuntimeOptions): Runtime => {
    const renderer = createRenderer(canvas)
    const audioContext = getAudioContext()
    const reportedErrors = new Set<string>()

    const reportError = (error: unknown, locations?: ReadonlyArray<Location>) => {
        const found = error instanceof Error ? error : new Error(String(error))
        const key = JSON.stringify([found.message, locations])

        if (!reportedErrors.has(key)) {
            reportedErrors.add(key)
            options.onPlaybackError?.(found, locations ?? [])
        }
    }

    const isErrorLog = (detail: { message?: unknown, type?: unknown }) => detail.type === 'error' || /^\[\w+\] error: /.test(String(detail.message))

    const readLog = (event: Event) => {
        if (event instanceof CustomEvent && event.detail && isErrorLog(event.detail)) {
            reportError(new Error(String(event.detail.message)))
        }
    }

    const readHaps = (read: () => Array<Hap>) => {
        try {
            return read()
        } catch (error) {
            reportError(error)
            return []
        }
    }

    const guardPattern = (pattern: Pattern) => new Pattern((state: State) => {
        try {
            return pattern.query(state)
        } catch (error) {
            reportError(error)
            return []
        }
    })

    let isMuted = true
    let audioOffset = 0

    const getTime = () => isMuted ? performance.now() / 1000 : audioContext.currentTime + audioOffset

    const playHap = (hap: Hap, time: number, cps: number) => {
        const { onSchedule, dominantSchedule, locations } = hap.context

        if (!isMuted && !(onSchedule && dominantSchedule)) {
            webaudioOutput(hap, time - audioOffset, cps).catch((error) => reportError(error, locations))
        }

        if (onSchedule) {
            Promise.resolve(onSchedule(hap, time, cps)).catch((error) => reportError(error, locations))
        }
    }

    const scheduler = new Cyclist({ getTime, onSchedule: playHap, onError: reportError })
    const previewElements = new Map<string, HTMLElement>()
    const peekViews = new Map<string, PeekView>()
    let peeks: ReadonlyArray<Peek> = []
    let peekTime = 0
    const mediaElements = new Map<string, MediaElement>()
    let sound: Pattern = silence
    let visual: Visual | undefined
    let frame = 0

    setTime(() => scheduler.now())
    setClockTime(getTime)
    document.addEventListener(logEvent, readLog)
    registerSynthSounds()
    samples('github:tidalcycles/dirt-samples')
    samples(sampleHost + '/tidal-drum-machines.json', sampleHost + '/tidal-drum-machines/machines/').then(() => aliasBank(sampleHost + '/tidal-drum-machines-alias.json'))

    const setCps = (cps: number) => {
        scheduler.setCps(cps)
        return silence
    }

    const scope = {
        ...strudel,
        ...webaudio,
        ...mini,
        ...tonal,
        ...imageFunctions,
        ...options.scope,
        setcps: setCps,
        setcpm: (cpm: number) => setCps(cpm / 60),
    }

    const getVisualTime = () => {
        const delay = scheduler.latency - scheduler.clock.duration + (audioContext.outputLatency || 0)
        return scheduler.now() - delay * scheduler.cps
    }

    const getPreviewElement = (id: string) => {
        const existing = previewElements.get(id)

        if (existing) {
            return existing
        }

        const element = document.createElement('div')
        element.style.width = '25vw'
        element.style.height = '25vh'
        previewElements.set(id, element)
        return element
    }

    const getPeekView = (id: string) => {
        const existing = peekViews.get(id)

        if (existing) {
            return existing
        }

        const view = createPeekView()
        peekViews.set(id, view)
        return view
    }

    const updatePeeks = (time: number) => {
        const from = Math.min(peekTime, time)
        peekTime = time

        for (const { id, pattern } of peeks) {
            try {
                getPeekView(id).update(pattern, from, time)
            } catch (error) {
                reportError(error)
            }
        }
    }

    const getMediaElement = (input: MediaInput) => {
        const existing = mediaElements.get(input.key)

        if (existing) {
            return existing
        }

        const element = createMediaElement(input)
        mediaElements.set(input.key, element)
        return element
    }

    const releaseUnusedMedia = (used: ReadonlyArray<MediaInput>) => {
        const usedKeys = new Set(used.map((input) => input.key))

        for (const [key, element] of mediaElements) {
            if (!usedKeys.has(key)) {
                releaseMediaElement(element)
                renderer.release(element)
                mediaElements.delete(key)
            }
        }
    }

    const createGraph = (tracks: ReadonlyArray<Track>, previews: ReadonlyArray<Preview>, names: ReadonlyMap<string, Track>) => {
        const image = layerImages(tracks)

        if (image === undefined && previews.length === 0) {
            return undefined
        }

        return generateGraph(image, previews.map((preview) => preview.image), getNamedImages(names))
    }

    const createTextLayers = (inputs: ReadonlyArray<MediaInput>) => inputs.flatMap((input) => {
        const element = getMediaElement(input)
        return input.name === 'text' && element instanceof HTMLCanvasElement ? [createTextLayer(element, input.settings)] : []
    })

    const createVisual = (graph: Graph, previews: ReadonlyArray<Preview>, warnings: WarningList): Visual => {
        return {
            graph: renderer.compile(graph),
            reader: createValueReader(graph.uniforms, warnings),
            previews: previews.map((preview) => getPreviewElement(preview.id)),
            media: graph.media.map(getMediaElement),
            texts: createTextLayers(graph.media),
        }
    }

    const renderFrame = () => {
        frame = requestAnimationFrame(renderFrame)

        if (!scheduler.started) {
            return
        }

        const time = getVisualTime()
        const haps = sound.queryArc(time, time)
        const shown = visual

        if (shown) {
            haps.push(...readHaps(() => shown.reader.updateValues(time)).map(fillWhole))

            for (const text of shown.texts) {
                haps.push(...readHaps(() => text.update(time, canvas.width, canvas.height)).map(fillWhole))
            }

            renderer.draw(shown.graph, shown.reader.values, time, shown.previews, shown.media)
        }

        updatePeeks(time)
        options.onFrame(time, haps)
    }

    frame = requestAnimationFrame(renderFrame)

    return {
        evaluate: async (code) => {
            cleanupDraw(true)
            reportedErrors.clear()

            const { tracks, names, previews, peeks: evaluatedPeeks, miniLocations, widgets, transpiled, reports } = await evaluateCode(code, scope)
            const warnings = createWarningList(code, options.onWarning)

            for (const { details, place } of reports) {
                warnings.add(details, place)
            }

            const graph = createGraph(tracks, previews, names)
            const sounds = tracks.filter(isPattern)

            visual = graph && createVisual(graph, previews, warnings)
            peeks = evaluatedPeeks
            releaseUnusedMedia(graph?.media ?? [])
            sound = sounds.length > 0 ? guardPattern(stack(...sounds)) : silence
            await scheduler.setPattern(sound)

            if (!visual) {
                renderer.clear()
            }

            if (!scheduler.started) {
                await scheduler.start()
            }

            return {
                miniLocations,
                widgets,
                previews: [
                    ...previews.map((preview) => ({ id: preview.id, element: getPreviewElement(preview.id) })),
                    ...evaluatedPeeks.map((peek) => ({ id: peek.id, element: getPeekView(peek.id).element })),
                ],
                transpiled,
                graph,
            }
        },
        unmute: async () => {
            await audioContext.resume()
            audioReady ??= initAudio()
            await audioReady
            audioOffset = performance.now() / 1000 - audioContext.currentTime
            isMuted = false
        },
        mute: async () => {
            isMuted = true
            await audioContext.suspend()
        },
        stop: () => {
            scheduler.stop()
            cleanupDraw(true)
            options.onFrame(0, [])
        },
        destroy: () => {
            cancelAnimationFrame(frame)
            document.removeEventListener(logEvent, readLog)
            scheduler.stop()
            releaseUnusedMedia([])
            renderer.destroy()
        },
    }
}
