import { findLocations, readSketch, type Search, type Sketch } from './locations'

export interface Location {
    start: number
    end: number
}

type Details =
    | { kind: 'extraArguments', name: string, expected: number, given: number }
    | { kind: 'invalidColor', value: unknown }

export type Warning = Details & { locations: ReadonlyArray<Location> }

export interface Place {
    locations?: ReadonlyArray<Location>
    search?: Search
}

export interface Report {
    details: Details
    place: Place
}

export interface WarningList {
    add: (details: Details, place: Place) => void
}

type Callable = (...values: Array<never>) => unknown

let report: ((found: Report) => void) | undefined

export const createWarningList = (code: string, onWarning: (warning: Warning) => void = () => {}): WarningList => {
    const seen = new Set<string>()
    let sketch: Sketch | undefined

    const locate = ({ locations, search }: Place) => {
        if (locations && locations.length > 0) {
            return locations
        }

        if (!search) {
            return []
        }

        sketch ??= readSketch(code)
        return findLocations(sketch, search)
    }

    return {
        add: (details, place) => {
            const warning = { ...details, locations: locate(place) }
            const key = JSON.stringify(warning)

            if (!seen.has(key)) {
                seen.add(key)
                onWarning(warning)
            }
        },
    }
}

export const collectWarnings = async <Result>(run: () => Promise<Result>) => {
    const reports: Array<Report> = []
    report = (found) => {
        reports.push(found)
    }

    try {
        return { result: await run(), reports }
    } finally {
        report = undefined
    }
}

const checkArguments = (name: string, callable: Callable) => function (this: unknown, ...values: Array<unknown>) {
    if (values.length > callable.length) {
        report?.({
            details: { kind: 'extraArguments', name, expected: callable.length, given: values.length },
            place: { search: { call: name, given: values.length } },
        })
    }

    return Reflect.apply(callable, this, values)
}

export const checkFunctions = (functions: Record<string, Callable>): Record<string, Callable> => {
    return Object.fromEntries(Object.entries(functions).map(([name, callable]) => [name, checkArguments(name, callable)]))
}

export const checkMethods = (prototype: object, names: ReadonlyArray<string>) => {
    for (const name of names) {
        const callable: Callable = Reflect.get(prototype, name)
        Object.defineProperty(prototype, name, { value: checkArguments(name, callable), configurable: true, writable: true })
    }
}

const hasPosition = (error: unknown): error is { pos: number } => typeof error === 'object' && error !== null && typeof Reflect.get(error, 'pos') === 'number'

export const locateError = (error: unknown): ReadonlyArray<Location> => hasPosition(error) ? [{ start: error.pos, end: error.pos }] : []
