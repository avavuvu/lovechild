import { generateGraph, type Graph, type MediaInput } from '@lovechild/core'
import { createRenderer, type CompiledGraph, type MediaElement } from '@lovechild/webgl'
import * as strudel from '@strudel/core'
import { Cyclist, Hap, isPattern, setTime, silence, stack, type Pattern } from '@strudel/core'
import { cleanupDraw } from '@strudel/draw'
import * as mini from '@strudel/mini'
import * as tonal from '@strudel/tonal'
import type { Widget } from '@strudel/transpiler'
import * as webaudio from '@strudel/webaudio'
import { aliasBank, getAudioContext, initAudio, registerSynthSounds, samples, webaudioOutput } from '@strudel/webaudio'
import './curves'
import './selections'
import { evaluateCode, type MiniLocation, type Preview } from './evaluate'
import { imageFunctions } from './images'
import type { Block } from './names'
import './events'
import { createMediaElement, releaseMediaElement } from './media'
import { createTextLayer, type TextLayer } from './text'
import { createValueReader, getNamedChains, layerChains, type ValueReader } from './visuals'

const sampleHost = 'https://strudel.b-cdn.net'

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
    scope?: Record<string, unknown>
}

export interface Runtime {
    evaluate: (code: string) => Promise<EvaluationResult>
    stop: () => void
    destroy: () => void
}

const fillWhole = (hap: Hap) => hap.whole === undefined ? new Hap(hap.part, hap.part, hap.value, hap.context) : hap

export const createRuntime = (canvas: HTMLCanvasElement, options: RuntimeOptions): Runtime => {
    const renderer = createRenderer(canvas)
    const audioContext = getAudioContext()
    const scheduler = new Cyclist({ getTime: () => audioContext.currentTime, onTrigger: webaudioOutput })
    const previewElements = new Map<string, HTMLElement>()
    const mediaElements = new Map<string, MediaElement>()
    let sound: Pattern = silence
    let visual: Visual | undefined
    let audioReady: Promise<void> | undefined
    let frame = 0

    setTime(() => scheduler.now())
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

    const createGraph = (blocks: ReadonlyArray<Block>, previews: ReadonlyArray<Preview>, names: ReadonlyMap<string, Block>) => {
        const chain = layerChains(blocks)

        if (chain === undefined && previews.length === 0) {
            return undefined
        }

        return generateGraph(chain, previews.map((preview) => preview.chain), getNamedChains(names))
    }

    const createTextLayers = (inputs: ReadonlyArray<MediaInput>) => inputs.flatMap((input) => {
        const element = getMediaElement(input)
        return input.name === 'text' && element instanceof HTMLCanvasElement ? [createTextLayer(element, input.settings)] : []
    })

    const createVisual = (graph: Graph, previews: ReadonlyArray<Preview>): Visual => {
        return {
            graph: renderer.compile(graph),
            reader: createValueReader(graph.uniforms),
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

        if (visual) {
            haps.push(...visual.reader.updateValues(time).map(fillWhole))

            for (const text of visual.texts) {
                haps.push(...text.update(time, canvas.width, canvas.height).map(fillWhole))
            }

            renderer.draw(visual.graph, visual.reader.values, time, visual.previews, visual.media)
        }

        options.onFrame(time, haps)
    }

    frame = requestAnimationFrame(renderFrame)

    return {
        evaluate: async (code) => {
            await audioContext.resume()
            audioReady ??= initAudio()
            await audioReady

            cleanupDraw(true)

            const { blocks, names, previews, miniLocations, widgets, transpiled } = await evaluateCode(code, scope)
            const graph = createGraph(blocks, previews, names)
            const sounds = blocks.filter(isPattern)

            visual = graph && createVisual(graph, previews)
            releaseUnusedMedia(graph?.media ?? [])
            sound = sounds.length > 0 ? stack(...sounds) : silence
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
                previews: previews.map((preview) => ({ id: preview.id, element: getPreviewElement(preview.id) })),
                transpiled,
                graph,
            }
        },
        stop: () => {
            scheduler.stop()
            cleanupDraw(true)
            options.onFrame(0, [])
        },
        destroy: () => {
            cancelAnimationFrame(frame)
            scheduler.stop()
            releaseUnusedMedia([])
            renderer.destroy()
        },
    }
}
