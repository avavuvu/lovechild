import { register, type Pattern } from '@strudel/core'

interface Controls {
    s?: unknown
    sound?: unknown
    n?: unknown
}

const isControls = (value: unknown): value is Controls => typeof value === 'object' && value !== null && !Array.isArray(value)

const splitSoundName = (sound: unknown) => {
    const [name, number] = Array.isArray(sound) ? sound : String(sound).split(':')
    return { name: String(name), number: number === undefined || number === '' ? undefined : Number(number) }
}

export const only = register('only', (sound: unknown, pattern: Pattern) => {
    const { name, number } = splitSoundName(sound)

    return pattern.filterValues((value) => {
        if (!isControls(value)) {
            return String(value) === name
        }

        const hasName = value.s === name || value.sound === name
        return hasName && (number === undefined || Number(value.n ?? 0) === number)
    })
})
