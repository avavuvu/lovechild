import type { MediaInput } from '@lovechild/core'
import type { MediaElement, Renderer } from '@lovechild/webgl'
import { getOrCreate } from '../maps'
import type { ErrorReporter } from './errors'

const createVideoElement = () => {
    const element = document.createElement('video')
    element.crossOrigin = 'anonymous'
    element.muted = true
    element.loop = true
    element.playsInline = true
    return element
}

const startCamera = async (element: HTMLVideoElement) => {
    element.srcObject = await navigator.mediaDevices.getUserMedia({ video: true })
    await element.play()
}

const createMediaElement = (input: MediaInput, errors: ErrorReporter): MediaElement => {
    switch (input.name) {
        case 'text': {
            return document.createElement('canvas')
        }
        case 'picture': {
            const element = document.createElement('img')
            element.crossOrigin = 'anonymous'
            element.src = input.source
            return element
        }
        case 'video': {
            const element = createVideoElement()
            element.src = input.source
            element.play().catch((error: unknown) => errors.report(error))
            return element
        }
        case 'camera': {
            const element = createVideoElement()
            startCamera(element).catch((error: unknown) => errors.report(error))
            return element
        }
    }
}

const releaseMediaElement = (element: MediaElement) => {
    if (element instanceof HTMLImageElement) {
        element.removeAttribute('src')
        return
    }

    if (element instanceof HTMLCanvasElement) {
        element.width = 0
        element.height = 0
        return
    }

    if (element.srcObject instanceof MediaStream) {
        for (const track of element.srcObject.getTracks()) {
            track.stop()
        }
    }

    element.pause()
    element.srcObject = null
    element.removeAttribute('src')
    element.load()
}

export const createMediaCache = (renderer: Renderer, errors: ErrorReporter) => {
    const elements = new Map<string, MediaElement>()

    const get = (input: MediaInput) => getOrCreate(elements, input.key, () => createMediaElement(input, errors))

    const releaseUnused = (used: ReadonlyArray<MediaInput>) => {
        const usedKeys = new Set(used.map((input) => input.key))

        for (const [key, element] of elements) {
            if (!usedKeys.has(key)) {
                releaseMediaElement(element)
                renderer.release(element)
                elements.delete(key)
            }
        }
    }

    return { get, releaseUnused }
}
