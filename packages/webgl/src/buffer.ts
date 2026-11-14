export interface FeedbackBuffer {
    textures: ReadonlyArray<WebGLTexture>
    framebuffers: ReadonlyArray<WebGLFramebuffer>
}

const hasFloatColor = (gl: WebGL2RenderingContext) => gl.getExtension('EXT_color_buffer_float') !== null

const allocateTexture = (gl: WebGL2RenderingContext, texture: WebGLTexture, width: number, height: number) => {
    gl.bindTexture(gl.TEXTURE_2D, texture)

    if (hasFloatColor(gl)) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null)
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }
}

const createTexture = (gl: WebGL2RenderingContext, width: number, height: number) => {
    const texture = gl.createTexture()

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    allocateTexture(gl, texture, width, height)

    return texture
}

const createFramebuffer = (gl: WebGL2RenderingContext, texture: WebGLTexture) => {
    const framebuffer = gl.createFramebuffer()

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

    return framebuffer
}

export const createFeedbackBuffer = (gl: WebGL2RenderingContext, width: number, height: number): FeedbackBuffer => {
    const textures = [createTexture(gl, width, height), createTexture(gl, width, height)]

    return {
        textures,
        framebuffers: textures.map((texture) => createFramebuffer(gl, texture)),
    }
}

export const resizeFeedbackBuffer = (gl: WebGL2RenderingContext, buffer: FeedbackBuffer, width: number, height: number) => {
    for (const texture of buffer.textures) {
        allocateTexture(gl, texture, width, height)
    }
}

export const deleteFeedbackBuffer = (gl: WebGL2RenderingContext, buffer: FeedbackBuffer) => {
    for (const framebuffer of buffer.framebuffers) {
        gl.deleteFramebuffer(framebuffer)
    }

    for (const texture of buffer.textures) {
        gl.deleteTexture(texture)
    }
}
