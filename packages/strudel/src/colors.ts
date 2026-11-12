const colors = new Map<string, ReadonlyArray<number>>()

let context: CanvasRenderingContext2D | null | undefined

const parseColor = (value: string) => {
    context ??= document.createElement('canvas').getContext('2d')

    if (!context) {
        return [0, 0, 0, 1]
    }

    context.fillStyle = '#000000'
    context.fillStyle = value
    const normalized = context.fillStyle

    if (normalized.startsWith('#')) {
        return [1, 3, 5].map((start) => parseInt(normalized.slice(start, start + 2), 16) / 255).concat(1)
    }

    const [red = 0, green = 0, blue = 0, alpha = 1] = normalized.replace(/[^\d.,]/g, '').split(',').map(Number)
    return [red / 255, green / 255, blue / 255, alpha]
}

export const readColor = (value: unknown): ReadonlyArray<number> | undefined => {
    if (typeof value === 'number') {
        return [value, value, value, 1]
    }

    if (typeof value !== 'string' || !CSS.supports('color', value)) {
        return undefined
    }

    const existing = colors.get(value)

    if (existing) {
        return existing
    }

    const color = parseColor(value)
    colors.set(value, color)
    return color
}
