import { Chain, isChain } from './chain'
import { paint as createPaint } from './sources'
import type { Operation, TextSettings, Value } from './operation'

type Paint = Value | Chain

interface TextParts {
    settings: TextSettings
    fill: Operation
    stroke: Operation
}

const defaultOutline = 0.5

const toOperation = (paint: Paint): Operation => isChain(paint) ? paint.operation : createPaint(paint).operation

export class TextChain extends Chain {
    readonly parts: TextParts

    constructor(parts: TextParts) {
        super({ kind: 'text', ...parts })
        this.parts = parts
    }

    font(family: Value) {
        return this.change({ settings: { ...this.parts.settings, font: family } })
    }

    fill(paint: Paint) {
        return this.change({ fill: toOperation(paint) })
    }

    stroke(paint: Paint) {
        const { settings } = this.parts
        return this.change({ stroke: toOperation(paint), settings: { ...settings, outline: settings.outline ?? defaultOutline } })
    }

    outline(width: Value = defaultOutline) {
        return this.change({ settings: { ...this.parts.settings, outline: width } })
    }

    wrap(width: Value = 0.5) {
        return this.change({ settings: { ...this.parts.settings, wrap: width } })
    }

    private change(parts: Partial<TextParts>) {
        return new TextChain({ ...this.parts, ...parts })
    }
}

export const textStyleNames: ReadonlyArray<string> = ['font', 'fill', 'stroke', 'outline', 'wrap']

export const text = (content: Value = '') => new TextChain({ settings: { content }, fill: toOperation('white'), stroke: toOperation('black') })
