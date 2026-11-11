export type MediaElement = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement

export interface MediaTexture {
    textures: ReadonlyArray<WebGLTexture>
    index: number
    width: number
    height: number
    uploadedFrame: number
}

const frameCounts = new WeakMap<HTMLVideoElement, number>()

const canvasVersions = new WeakMap<HTMLCanvasElement, number>()

export const markCanvasChanged = (canvas: HTMLCanvasElement) => {
    canvasVersions.set(canvas, (canvasVersions.get(canvas) ?? 0) + 1)
}

const watchFrames = (element: HTMLVideoElement) => {
    if (frameCounts.has(element) || !('requestVideoFrameCallback' in element)) {
        return
    }

    const countFrame = () => {
        frameCounts.set(element, (frameCounts.get(element) ?? 0) + 1)
        element.requestVideoFrameCallback(countFrame)
    }

    frameCounts.set(element, 0)
    element.requestVideoFrameCallback(countFrame)
}

const isMediaReady = (element: MediaElement) => {
    if (element instanceof HTMLVideoElement) {
        return element.readyState >= element.HAVE_CURRENT_DATA && element.videoWidth > 0
    }

    if (element instanceof HTMLCanvasElement) {
        return element.width > 0 && element.height > 0
    }

    return element.complete && element.naturalWidth > 0
}

const getMediaSize = (element: MediaElement) => {
    if (element instanceof HTMLVideoElement) {
        return { width: element.videoWidth, height: element.videoHeight }
    }

    if (element instanceof HTMLCanvasElement) {
        return { width: element.width, height: element.height }
    }

    return { width: element.naturalWidth, height: element.naturalHeight }
}

const getFrame = (element: MediaElement, media: MediaTexture) => {
    if (element instanceof HTMLImageElement) {
        return 0
    }

    if (element instanceof HTMLCanvasElement) {
        return canvasVersions.get(element) ?? 0
    }

    watchFrames(element)
    return frameCounts.get(element) ?? media.uploadedFrame + 1
}

export const createImageTexture = (gl: WebGL2RenderingContext) => {
    const texture = gl.createTexture()

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return texture
}

export const createEmptyTexture = (gl: WebGL2RenderingContext) => {
    const texture = createImageTexture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    return texture
}

export const createMediaTexture = (gl: WebGL2RenderingContext): MediaTexture => ({
    textures: [createImageTexture(gl), createImageTexture(gl)],
    index: 0,
    width: 0,
    height: 0,
    uploadedFrame: -1,
})

export const getCurrentTexture = (media: MediaTexture) => media.textures[media.index]

export const deleteMediaTexture = (gl: WebGL2RenderingContext, media: MediaTexture) => {
    for (const texture of media.textures) {
        gl.deleteTexture(texture)
    }
}

export const updateMediaTexture = (gl: WebGL2RenderingContext, media: MediaTexture, element: MediaElement) => {
    if (!isMediaReady(element)) {
        return false
    }

    const frame = getFrame(element, media)

    if (frame === media.uploadedFrame) {
        return true
    }

    const { width, height } = getMediaSize(element)
    const index = 1 - media.index

    gl.bindTexture(gl.TEXTURE_2D, media.textures[index])
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    media.index = index
    media.width = width
    media.height = height
    media.uploadedFrame = frame

    return true
}
