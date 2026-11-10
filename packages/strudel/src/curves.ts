import { register, type Pattern } from '@strudel/core'

const smoothValue = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), 1)
    return clamped * clamped * (3 - 2 * clamped)
}

register('smooth', (pattern: Pattern<number>) => pattern.fmap(smoothValue))
