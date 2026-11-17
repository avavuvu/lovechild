import { converter, modeHsl, modeHwb, modeLab, modeLch, modeOklab, modeOklch, modeP3, modeRgb, parse, useMode } from 'culori/fn'

for (const mode of [modeRgb, modeHsl, modeHwb, modeLab, modeLch, modeOklab, modeOklch, modeP3]) {
    useMode(mode)
}

const toRgb = converter('rgb')

const colors = new Map<string, ReadonlyArray<number>>()

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)

const parseColor = (value: string) => {
    const parsed = parse(value)

    if (!parsed) {
        return undefined
    }

    const { r, g, b, alpha = 1 } = toRgb(parsed)
    return [clamp(r), clamp(g), clamp(b), alpha]
}

export const readColor = (value: unknown): ReadonlyArray<number> | undefined => {
    if (typeof value === 'number') {
        return [value, value, value, 1]
    }

    if (typeof value !== 'string') {
        return undefined
    }

    const existing = colors.get(value)

    if (existing) {
        return existing
    }

    const color = parseColor(value)

    if (color) {
        colors.set(value, color)
    }

    return color
}
