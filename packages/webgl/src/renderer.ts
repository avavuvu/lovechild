import type { BufferInput, Graph, Target } from '@lovechild/core'
import { createFeedbackBuffer, deleteFeedbackBuffer, resizeFeedbackBuffer, type FeedbackBuffer } from './buffer'
import { createEmptyTexture, createMediaTexture, deleteMediaTexture, getCurrentTexture, updateMediaTexture, type MediaElement, type MediaTexture } from './media'
import { createProgram, createVertexShader } from './program'

interface CompiledPass {
    program: WebGLProgram
    target: Target
    inputs: ReadonlyArray<BufferInput>
    resolutionLocation: WebGLUniformLocation | null
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
    draw: (graph: CompiledGraph, values: ReadonlyArray<number>, previews: ReadonlyArray<HTMLElement>, media: ReadonlyArray<MediaElement>) => void
    clear: () => void
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

    const getProgram = (source: string) => {
        const existing = programs.get(source)

        if (existing) {
            return existing
        }

        const program = createProgram(gl, vertexShader, source)
        programs.set(source, program)
        return program
    }

    const resizeCanvas = () => {
        const width = Math.round(canvas.clientWidth * window.devicePixelRatio)
        const height = Math.round(canvas.clientHeight * window.devicePixelRatio)

        if (canvas.width === width && canvas.height === height) {
            return
        }

        canvas.width = width
        canvas.height = height

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
                    resolutionLocation: gl.getUniformLocation(program, 'resolution'),
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
        draw: (graph, values, previews, media) => {
            resizeCanvas()
            addBuffers(graph.bufferCount)
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
                gl.uniform2f(pass.resolutionLocation, area.width, area.height)
                gl.uniform2f(pass.originLocation, area.x, area.y)
                gl.uniform2f(pass.bufferResolutionLocation, canvas.width, canvas.height)

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
            }

            writeIndex = 1 - writeIndex
        },
        clear: clearScreen,
        release: (element) => {
            const media = mediaTextures.get(element)

            if (media) {
                deleteMediaTexture(gl, media)
                mediaTextures.delete(element)
            }
        },
        destroy: () => {
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
