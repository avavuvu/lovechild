import { register, type Pattern } from '@strudel/core'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const readSound = (sound: unknown): [string, number | undefined] => {
    const [name, number] = Array.isArray(sound) ? sound : String(sound).split(':')
    return [String(name), number === undefined || number === '' ? undefined : Number(number)]
}

const isSound = (value: unknown, sound: unknown) => {
    const [name, number] = readSound(sound)

    if (!isRecord(value)) {
        return String(value) === name
    }

    const hasName = value.s === name || value.sound === name
    return hasName && (number === undefined || Number(value.n ?? 0) === number)
}

register('only', (sound: unknown, pattern: Pattern) => pattern.filterValues((value) => isSound(value, sound)))
