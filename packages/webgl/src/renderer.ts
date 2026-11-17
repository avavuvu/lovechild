import type { BufferInput, Graph, Target } from '@lovechild/core'
import { createFeedbackBuffer, deleteFeedbackBuffer, resizeFeedbackBuffer, updateMipmaps, type FeedbackBuffer } from './buffer'
import { createEmptyTexture, createMediaTexture, deleteMediaTexture, getCurrentTexture, updateMediaTexture, type MediaElement, type MediaTexture } from './media'
import { createProgram, createVertexShader } from './program'

interface CompiledPass {
    program: WebGLProgram
    target: Target
    inputs: ReadonlyArray<BufferInput>
    areaSizeLocation: WebGLUniformLocation | null
    timeLocation: WebGLUniformLocation | null
    previousTimeLocation: WebGLUniformLocation | null
    cpsLocation: WebGLUniformLocation | null
    isFirstFrameLocation: WebGLUniformLocation | null
    originLocation: WebGLUniformLocation | null
    bufferResolutionLocation: WebGLUniformLocation | null
    parameterLocations: ReadonlyArray<WebGLUniformLocation | null>
    inputLocations: ReadonlyArray<WebGLUniformLocation | null>
    media: ReadonlyArray<number>
    mediaLocations: ReadonlyArray<MediaLocation>
}

interface MediaLocation {
    image: WebGLUniformLocation | null
    size: WebGLUniformLocation | null
}

export interface CompiledGraph {
    passes: ReadonlyArray<CompiledPass>
    bufferCount: number
}

export interface Renderer {
    compile: (graph: Graph) => CompiledGraph
    draw: (graph: CompiledGraph, values: ReadonlyArray<number>, time: number, cps: number, previews: ReadonlyArray<HTMLElement>, media: ReadonlyArray<MediaElement>) => void
    clear: () => void
    setScale: (scale: number) => void
    release: (element: MediaElement) => void
    destroy: () => void
}

export const createRenderer = (canvas: HTMLCanvasElement): Renderer => {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false })

    if (!gl) {
        throw new Error('WebGL 2 is not available')
    }

    const vertexShader = createVertexShader(gl)
    const programs = new Map<string, WebGLProgram>()
    const buffers: Array<FeedbackBuffer> = []
    const mediaTextures = new Map<MediaElement, MediaTexture>()
    const emptyTexture = createEmptyTexture(gl)
    let writeIndex = 0
    let drawnGraph: CompiledGraph | undefined
    let previousTime = 0
    let wasResized = false

    const getProgram = (source: string) => {
        const existing = programs.get(source)

        if (existing) {
            return existing
        }

        const program = createProgram(gl, vertexShader, source)
        programs.set(source, program)
        return program
    }

    const deleteUnusedPrograms = (graph: CompiledGraph) => {
        const used = new Set(graph.passes.map((pass) => pass.program))

        for (const [source, program] of programs) {
            if (!used.has(program)) {
                gl.deleteProgram(program)
                programs.delete(source)
            }
        }
    }

    let size = { width: canvas.width, height: canvas.height }
    let bounds = { width: canvas.clientWidth, height: canvas.clientHeight }
    let scale = 1

    const measure = () => {
        const ratio = window.devicePixelRatio * scale

        size = {
            width: Math.max(1, Math.round(bounds.width * ratio)),
            height: Math.max(1, Math.round(bounds.height * ratio)),
        }
    }

    const observer = new ResizeObserver(([entry]) => {
        bounds = { width: entry.contentRect.width, height: entry.contentRect.height }
        measure()
    })

    observer.observe(canvas)

    const resizeCanvas = () => {
        const { width, height } = size

        if (canvas.width === width && canvas.height === height) {
            return
        }

        canvas.width = width
        canvas.height = height
        wasResized = true

        for (const buffer of buffers) {
            resizeFeedbackBuffer(gl, buffer, width, height)
        }
    }

    const addBuffers = (count: number) => {
        while (buffers.length < count) {
            buffers.push(createFeedbackBuffer(gl, canvas.width, canvas.height))
        }
    }

    const getTexture = (input: BufferInput) => {
        const index = input.frame === 'current' ? writeIndex : 1 - writeIndex
        return buffers[input.buffer].textures[index]
    }

    const updateMedia = (element: MediaElement) => {
        const existing = mediaTextures.get(element)
        const media = existing ?? createMediaTexture(gl)
        mediaTextures.set(element, media)
        return updateMediaTexture(gl, media, element) ? media : undefined
    }

    const clearScreen = () => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT)
    }

    const getArea = (target: Target, previews: ReadonlyArray<HTMLElement>) => {
        if (target.kind !== 'preview') {
            return { x: 0, y: 0, width: canvas.width, height: canvas.height }
        }

        const element = previews[target.index]

        if (!element.isConnected) {
            return undefined
        }

        const bounds = canvas.getBoundingClientRect()
        const rectangle = element.getBoundingClientRect()
        const scale = canvas.width / bounds.width
        const area = {
            x: Math.round((rectangle.left - bounds.left) * scale),
            y: Math.round((bounds.bottom - rectangle.bottom) * scale),
            width: Math.round(rectangle.width * scale),
            height: Math.round(rectangle.height * scale),
        }
        const isVisible = area.width > 0 && area.height > 0 && area.x < canvas.width && area.y < canvas.height && area.x + area.width > 0 && area.y + area.height > 0

        return isVisible ? area : undefined
    }

    return {
        compile: (graph) => ({
            bufferCount: graph.bufferCount,
            passes: graph.passes.map((pass) => {
                const program = getProgram(pass.source)

                return {
                    program,
                    target: pass.target,
                    inputs: pass.inputs,
                    areaSizeLocation: gl.getUniformLocation(program, 'areaSize'),
                    timeLocation: gl.getUniformLocation(program, 'time'),
                    previousTimeLocation: gl.getUniformLocation(program, 'previousTime'),
                    cpsLocation: gl.getUniformLocation(program, 'cps'),
                    isFirstFrameLocation: gl.getUniformLocation(program, 'isFirstFrame'),
                    originLocation: gl.getUniformLocation(program, 'origin'),
                    bufferResolutionLocation: gl.getUniformLocation(program, 'bufferResolution'),
                    parameterLocations: graph.uniforms.map((uniform) => gl.getUniformLocation(program, uniform.name)),
                    inputLocations: pass.inputs.map((input) => gl.getUniformLocation(program, input.name)),
                    media: pass.media,
                    mediaLocations: pass.media.map((index) => ({
                        image: gl.getUniformLocation(program, `media${index}`),
                        size: gl.getUniformLocation(program, `media${index}Size`),
                    })),
                }
            }),
        }),
        draw: (graph, values, time, cps, previews, media) => {
            resizeCanvas()
            addBuffers(graph.bufferCount)
            const isNewGraph = graph !== drawnGraph
            const isFirstFrame = isNewGraph || wasResized

            if (isNewGraph) {
                deleteUnusedPrograms(graph)
            }

            const lastTime = isFirstFrame ? time : previousTime
            const readyMedia = media.map(updateMedia)

            if (!graph.passes.some((pass) => pass.target.kind === 'screen')) {
                clearScreen()
            }

            for (const pass of graph.passes) {
                const { target } = pass
                const area = getArea(target, previews)

                if (!area) {
                    continue
                }

                const framebuffer = target.kind === 'buffer' ? buffers[target.index].framebuffers[writeIndex] : null

                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
                gl.viewport(area.x, area.y, area.width, area.height)
                gl.useProgram(pass.program)
                gl.uniform2f(pass.areaSizeLocation, area.width, area.height)
                gl.uniform2f(pass.originLocation, area.x, area.y)
                gl.uniform2f(pass.bufferResolutionLocation, canvas.width, canvas.height)
                gl.uniform1f(pass.timeLocation, time)
                gl.uniform1f(pass.previousTimeLocation, lastTime)
                gl.uniform1f(pass.cpsLocation, cps)
                gl.uniform1f(pass.isFirstFrameLocation, isFirstFrame ? 1 : 0)

                for (const [index, value] of values.entries()) {
                    gl.uniform1f(pass.parameterLocations[index], value)
                }

                for (const [unit, input] of pass.inputs.entries()) {
                    gl.activeTexture(gl.TEXTURE0 + unit)
                    gl.bindTexture(gl.TEXTURE_2D, getTexture(input))
                    gl.uniform1i(pass.inputLocations[unit], unit)
                }

                for (const [position, index] of pass.media.entries()) {
                    const unit = pass.inputs.length + position
                    const ready = readyMedia[index]
                    const location = pass.mediaLocations[position]

                    gl.activeTexture(gl.TEXTURE0 + unit)
                    gl.bindTexture(gl.TEXTURE_2D, ready ? getCurrentTexture(ready) : emptyTexture)
                    gl.uniform1i(location.image, unit)
                    gl.uniform2f(location.size, ready?.width ?? 1, ready?.height ?? 1)
                }

                gl.drawArrays(gl.TRIANGLES, 0, 3)

                if (target.kind === 'buffer') {
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                    updateMipmaps(gl, buffers[target.index], writeIndex)
                }
            }

            writeIndex = 1 - writeIndex
            drawnGraph = graph
            previousTime = time
            wasResized = false
        },
        clear: clearScreen,
        setScale: (next) => {
            scale = next
            measure()
        },
        release: (element) => {
            const media = mediaTextures.get(element)

            if (media) {
                deleteMediaTexture(gl, media)
                mediaTextures.delete(element)
            }
        },
        destroy: () => {
            observer.disconnect()

            for (const program of programs.values()) {
                gl.deleteProgram(program)
            }

            for (const buffer of buffers) {
                deleteFeedbackBuffer(gl, buffer)
            }

            for (const media of mediaTextures.values()) {
                deleteMediaTexture(gl, media)
            }

            gl.deleteTexture(emptyTexture)
            gl.deleteShader(vertexShader)
        },
    }
}
