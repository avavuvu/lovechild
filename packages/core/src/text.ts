import { Image, isImage } from './image'
import { paint as createPaint } from './sources'
import type { Operation, TextSettings, Value } from './operation'

type Paint = Value | Image

interface TextParts {
    settings: TextSettings
    fill: Operation
    stroke: Operation
}

const defaultOutline = 0.5

const defaultWrap = 0.5

const toOperation = (paint: Paint): Operation => isImage(paint) ? paint.operation : createPaint(paint).operation

export class TextImage extends Image {
    readonly parts: TextParts

    constructor(parts: TextParts) {
        super({ kind: 'text', ...parts })
        this.parts = parts
    }

    font(family: Value) {
        return this.#change({ settings: { ...this.parts.settings, font: family } })
    }

    fill(paint: Paint) {
        return this.#change({ fill: toOperation(paint) })
    }

    stroke(paint: Paint) {
        const { settings } = this.parts
        return this.#change({ stroke: toOperation(paint), settings: { ...settings, outline: settings.outline ?? defaultOutline } })
    }

    outline(width?: Value) {
        return this.#change({ settings: { ...this.parts.settings, outline: width ?? defaultOutline } })
    }

    wrap(width?: Value) {
        return this.#change({ settings: { ...this.parts.settings, wrap: width ?? defaultWrap } })
    }

    #change(parts: Partial<TextParts>) {
        return new TextImage({ ...this.parts, ...parts })
    }
}

export const textStyleNames: ReadonlyArray<string> = Object.getOwnPropertyNames(TextImage.prototype).filter((name) => name !== 'constructor')

const textStyles: ReadonlySet<string> = new Set(textStyleNames)

export const isTextStyle = (name: string) => textStyles.has(name)

export const text = (content?: Value) => new TextImage({ settings: { content: content ?? '' }, fill: toOperation('white'), stroke: toOperation('black') })
