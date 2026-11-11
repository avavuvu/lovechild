import { Fraction, Hap, Pattern, TimeSpan } from '@strudel/core'

export interface TriggerOptions {
    time?: number
    length?: number
}

export interface Input {
    trigger: (value?: number, options?: TriggerOptions) => void
}

interface InputEvent {
    begin: number
    end: number
    value: number
}

const defaultEventLength = 0.1

const historyCycles = 8

const createEventPattern = (events: ReadonlyArray<InputEvent>) => new Pattern<number>((state) => events.flatMap((event) => {
    const whole = new TimeSpan(Fraction(event.begin), Fraction(event.end))
    const part = whole.intersection(state.span)
    return part === undefined ? [] : [new Hap(whole, part, event.value, {})]
}))

export const createInput = (getTime: () => number) => {
    const events: Array<InputEvent> = []

    const trigger = (value = 1, { time = getTime(), length = defaultEventLength }: TriggerOptions = {}) => {
        events.push({ begin: time, end: time + length, value })
        const keptEvents = events.filter((event) => event.end >= time - historyCycles)
        events.splice(0, events.length, ...keptEvents)
    }

    return { pattern: createEventPattern(events), input: { trigger } }
}
