import { camera, generateGraph, gradient, image, isChain, noise, osc, polygon, shape, solid, video, voronoi, type Chain, type MediaInput } from '@lovechild/core'
import { createRenderer, type CompiledGraph, type MediaElement } from '@lovechild/webgl'
import * as strudel from '@strudel/core'
import { Cyclist, Hap, isPattern, reify, setTime, silence, stack, type Pattern } from '@strudel/core'
import { cleanupDraw } from '@strudel/draw'
import * as mini from '@strudel/mini'
import * as tonal from '@strudel/tonal'
import type { Widget } from '@strudel/transpiler'
import * as webaudio from '@strudel/webaudio'
import { aliasBank, getAudioContext, initAudio, registerSynthSounds, samples, webaudioOutput } from '@strudel/webaudio'
import './curves'
import './selections'
import { evaluateCode, type MiniLocation, type Preview } from './evaluate'
import type { Block } from './names'
import './events'
import { createMediaElement, getMediaKey, releaseMediaElement } from './media'

const sampleHost = 'https://strudel.b-cdn.net'

interface Visual {
    graph: CompiledGraph
    patterns: ReadonlyArray<Pattern>
    encoders: ReadonlyArray<(value: unknown) => number>
    values: Array<number>
    previews: ReadonlyArray<HTMLElement>
    media: ReadonlyArray<MediaElement>
}

export interface PreviewElement {
    id: string
    element: HTMLElement
}

export interface EvaluationResult {
    miniLocations: ReadonlyArray<MiniLocation>
    widgets: ReadonlyArray<Widget>
    previews: ReadonlyArray<PreviewElement>
}

export interface RuntimeOptions {
    onFrame: (time: number, haps: ReadonlyArray<Hap>) => void
}

export interface Runtime {
    evaluate: (code: string) => Promise<EvaluationResult>
    stop: () => void
    destroy: () => void
}

const readSource = (source: string | Pattern<string>) => isPattern(source) ? source.queryArc(0, 0)[0]?.value ?? '' : source

const imageFunctions = {
    osc,
    shape,
    polygon,
    solid,
    noise,
    voronoi,
    gradient,
    camera,
    video: (source: string | Pattern<string>) => video(readSource(source)),
    image: (source: string | Pattern<string>) => image(readSource(source)),
}

export const imageFunctionNames: ReadonlyArray<string> = [...Object.keys(imageFunctions), 'previous']

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
        const key = getMediaKey(input)
        const existing = mediaElements.get(key)

        if (existing) {
            return existing
        }

        const element = createMediaElement(input)
        mediaElements.set(key, element)
        return element
    }

    const releaseUnusedMedia = (used: ReadonlyArray<MediaInput>) => {
        const usedKeys = new Set(used.map(getMediaKey))

        for (const [key, element] of mediaElements) {
            if (!usedKeys.has(key)) {
                releaseMediaElement(element)
                renderer.release(element)
                mediaElements.delete(key)
            }
        }
    }

    const createVisual = (chain: Chain | undefined, previews: ReadonlyArray<Preview>, names: ReadonlyMap<string, Block>): Visual | undefined => {
        if (chain === undefined && previews.length === 0) {
            releaseUnusedMedia([])
            return undefined
        }

        const namedChains = new Map(Array.from(names).filter((entry): entry is [string, Chain] => isChain(entry[1])))
        const graph = generateGraph(chain, previews.map((preview) => preview.chain), namedChains)
        const compiled = renderer.compile(graph)
        releaseUnusedMedia(graph.media)

        return {
            graph: compiled,
            patterns: graph.uniforms.map((uniform) => reify(uniform.value)),
            encoders: graph.uniforms.map((uniform) => uniform.encode),
            values: graph.uniforms.map(() => 0),
            previews: previews.map((preview) => getPreviewElement(preview.id)),
            media: graph.media.map(getMediaElement),
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
            for (const [index, pattern] of visual.patterns.entries()) {
                const found = pattern.queryArc(time, time)
                haps.push(...found.map(fillWhole))

                if (found.length > 0) {
                    visual.values[index] = visual.encoders[index](found[0].value)
                }
            }

            renderer.draw(visual.graph, visual.values, visual.previews, visual.media)
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

            const { blocks, names, previews, miniLocations, widgets } = await evaluateCode(code, scope)
            const chains = blocks.filter(isChain)
            const chain = chains.length > 0 ? chains.reduce((layered, next) => layered.screen(next)) : undefined
            const sounds = blocks.filter(isPattern)

            visual = createVisual(chain, previews, names)
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
