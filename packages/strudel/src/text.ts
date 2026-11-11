import type { TextSettings, Value } from '@lovechild/core'
import { markCanvasChanged } from '@lovechild/webgl'
import { isPattern, type Hap } from '@strudel/core'

export interface TextLayer {
    update: (time: number, width: number, height: number) => Array<Hap>
}

interface TextValues {
    content: string
    font: string
    outline: number
    wrap: number
}

const defaults: TextValues = { content: '', font: 'sans-serif', outline: 0, wrap: 1 }

const fillMask = '#ff0000'

const strokeMask = '#00ff00'

const measureSize = 100

const lineHeight = 1.2

const margin = 0.05

const outlineScale = 0.05

const toText = (value: unknown, fallback: string) => typeof value === 'string' || typeof value === 'number' ? String(value) : fallback

const toNumber = (value: unknown, fallback: number) => {
    const number = Number(value)
    return value !== undefined && Number.isFinite(number) ? number : fallback
}

const wrapParagraph = (context: CanvasRenderingContext2D, paragraph: string, limit: number) => {
    const lines: Array<string> = []
    let line = ''

    for (const word of paragraph.split(' ')) {
        const candidate = line === '' ? word : line + ' ' + word

        if (line !== '' && context.measureText(candidate).width > limit) {
            lines.push(line)
            line = word
        } else {
            line = candidate
        }
    }

    return [...lines, line]
}

const getLines = (context: CanvasRenderingContext2D, values: TextValues) => {
    const paragraphs = values.content.split('\n')

    if (values.wrap >= 1) {
        return paragraphs
    }

    const widest = Math.max(...paragraphs.map((paragraph) => context.measureText(paragraph).width))
    return paragraphs.flatMap((paragraph) => wrapParagraph(context, paragraph, widest * values.wrap))
}

const drawText = (context: CanvasRenderingContext2D, values: TextValues, width: number, height: number) => {
    context.canvas.width = width
    context.canvas.height = height
    context.fillStyle = '#000000'
    context.fillRect(0, 0, width, height)
    context.font = `${measureSize}px ${values.font}`

    const lines = getLines(context, values)
    const outline = values.outline * outlineScale
    const textWidth = Math.max(...lines.map((line) => context.measureText(line).width)) + outline * measureSize * 2
    const textHeight = lines.length * lineHeight * measureSize + outline * measureSize * 2

    if (lines.every((line) => line === '')) {
        return
    }

    const size = measureSize * Math.min(width * (1 - 2 * margin) / textWidth, height * (1 - 2 * margin) / textHeight)

    context.font = `${size}px ${values.font}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'
    context.fillStyle = fillMask
    context.strokeStyle = strokeMask
    context.lineWidth = outline * size * 2

    for (const [index, line] of lines.entries()) {
        const y = height / 2 + (index - (lines.length - 1) / 2) * lineHeight * size

        if (outline > 0) {
            context.strokeText(line, width / 2, y)
        }

        context.fillText(line, width / 2, y)
    }
}

export const createTextLayer = (canvas: HTMLCanvasElement, settings: TextSettings): TextLayer => {
    const context = canvas.getContext('2d')
    let current = defaults
    let drawn = ''

    const redraw = () => {
        drawn = ''
    }

    const loadFont = (font: string) => {
        const sample = `${measureSize}px ${font}`

        if (!document.fonts.check(sample)) {
            document.fonts.load(sample).then(redraw, redraw)
        }
    }

    return {
        update: (time, width, height) => {
            const found: Array<Hap> = []

            const read = (value: Value | undefined) => {
                if (!isPattern(value)) {
                    return value
                }

                const haps = value.queryArc(time, time)
                found.push(...haps)
                return haps[0]?.value
            }

            current = {
                content: toText(read(settings.content), current.content),
                font: toText(read(settings.font), current.font),
                outline: toNumber(read(settings.outline), current.outline),
                wrap: toNumber(read(settings.wrap), current.wrap),
            }

            const signature = JSON.stringify([current, width, height])

            if (context && signature !== drawn) {
                drawn = signature
                loadFont(current.font)
                drawText(context, current, width, height)
                markCanvasChanged(canvas)
            }

            return found
        },
    }
}
