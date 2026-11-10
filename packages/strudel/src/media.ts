import type { MediaInput } from '@lovechild/core'
import type { MediaElement } from '@lovechild/webgl'

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

export const getMediaKey = (input: MediaInput) => input.name + ':' + input.source

export const createMediaElement = (input: MediaInput): MediaElement => {
    switch (input.name) {
        case 'image': {
            const element = new Image()
            element.crossOrigin = 'anonymous'
            element.src = input.source
            return element
        }
        case 'video': {
            const element = createVideoElement()
            element.src = input.source
            element.play().catch((error: unknown) => console.error(error))
            return element
        }
        case 'camera': {
            const element = createVideoElement()
            startCamera(element).catch((error: unknown) => console.error(error))
            return element
        }
    }
}

export const releaseMediaElement = (element: MediaElement) => {
    if (element instanceof HTMLImageElement) {
        element.removeAttribute('src')
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
