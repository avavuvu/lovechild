import type { Hap, Pattern } from '@strudel/core'

export type Tone = 'name' | 'number' | 'string' | 'boolean' | 'faint' | 'other'

interface Part { text: string, tone: Tone }

export type Cell = ReadonlyArray<Part>

type Moment = ReadonlyArray<unknown>

interface Rows { keys: ReadonlyArray<string>, header?: ReadonlyArray<Cell>, rows: ReadonlyArray<ReadonlyArray<Cell>> }

export interface Table extends Rows { widths: ReadonlyArray<number> }

export interface PatternHistory {
    update: (pattern: Pattern, from: number, to: number) => Table
}

const rest = Symbol('rest')

const historyLength = 16

export const rowOpacities = [1, 0.6, 0.4, 0.25]

const valueKey = ''

const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const formatNumber = (value: number) => {
    if (Number.isInteger(value)) {
        return String(value)
    }

    const size = Math.abs(value)
    return value.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)
}

const formatValue = (value: unknown): string => {
    if (value === rest) {
        return '~'
    }

    if (typeof value === 'number') {
        return formatNumber(value)
    }

    if (Array.isArray(value)) {
        return value.map(formatValue).join(':')
    }

    if (typeof value === 'object' && value !== null) {
        return Object.entries(value).map(([key, field]) => `${key}: ${formatValue(field)}`).join(' ')
    }

    return String(value)
}

const pickTone = (value: unknown): Tone => {
    if (value === rest) {
        return 'faint'
    }

    if (typeof value === 'number') {
        return 'number'
    }

    if (typeof value === 'boolean') {
        return 'boolean'
    }

    if (typeof value === 'string' || Array.isArray(value)) {
        return 'string'
    }

    return 'other'
}

const isPitchNumber = (key: string, value: unknown): value is number => key === 'note' && typeof value === 'number' && Number.isInteger(value)

const namePitch = (value: number) => pitchNames[((value % 12) + 12) % 12] + (Math.floor(value / 12) - 1)

const describeValue = (key: string, value: unknown): Cell => {
    const part: Part = { text: formatValue(value), tone: pickTone(value) }
    return isPitchNumber(key, value) ? [part, { text: ' ' + namePitch(value), tone: 'faint' }] : [part]
}

const emptyCell: Cell = [{ text: '', tone: 'other' }]

const missingPart: Part = { text: '-', tone: 'faint' }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const isChanging = (values: ReadonlyArray<string>) => new Set(values).size > 1

const readText = (cell: Cell) => cell.map((part) => part.text).join('')

const readPitch = (value: unknown) => isRecord(value) && typeof value.note === 'number' ? value.note : Infinity

const sortMoment = (moment: Moment) => [...moment].sort((first, second) => readPitch(first) - readPitch(second))

const describeMoment = (moment: Moment, key: string): Cell => {
    if (moment.length === 1 && moment[0] === rest) {
        return describeValue(key, rest)
    }

    const values = moment.map((event) => key === valueKey ? describeValue(key, event) : isRecord(event) && key in event ? describeValue(key, event[key]) : [missingPart])

    if (values.every((value) => value.length === 1 && value[0] === missingPart)) {
        return [missingPart]
    }

    const separator = values.some((value) => value.length > 1) ? '  ' : ' '
    return values.flatMap((value, index) => index > 0 ? [{ text: separator, tone: 'other' }, ...value] : value)
}

const collectKeys = (records: ReadonlyArray<Record<string, unknown>>) => [...new Set([...records].reverse().flatMap((record) => Object.keys(record).reverse()))]

const findLatestValue = (records: ReadonlyArray<Record<string, unknown>>, key: string) => [...records].reverse().find((record) => key in record)?.[key]

export const createPatternHistory = (): PatternHistory => {
    const history: Array<Moment> = []
    const changingKeys = new Set<string>()
    const widths = new Map<string, number>()
    const knownKeys: Array<string> = []
    let current: unknown = rest
    let lastTime = -Infinity
    let lastPattern: Pattern | undefined

    const reset = () => {
        history.length = 0
        changingKeys.clear()
        widths.clear()
        knownKeys.length = 0
    }

    const remember = (moment: Moment) => {
        history.push(moment)
        history.splice(0, Math.max(0, history.length - historyLength))
    }

    const groupOnsets = (haps: ReadonlyArray<Hap>, from: number, to: number) => {
        const moments = new Map<number, Array<unknown>>()

        for (const hap of haps) {
            const onset = hap.whole === undefined ? undefined : Number(hap.whole.begin)

            if (onset !== undefined && onset >= from && onset < to) {
                moments.set(onset, [...(moments.get(onset) ?? []), hap.value])
            }
        }

        return [...moments.entries()].sort(([first], [second]) => first - second).map(([_onset, values]) => sortMoment(values))
    }

    const record = (pattern: Pattern, from: number, to: number) => {
        if (to < lastTime) {
            reset()
        }

        if (pattern !== lastPattern) {
            history.length = 0
            lastPattern = pattern
        }

        lastTime = to
        const active = pattern.queryArc(to, to)

        for (const moment of groupOnsets(pattern.queryArc(from, to), from, to)) {
            remember(moment)
        }

        const last = history[history.length - 1]

        if (active.length === 0 && last !== undefined && last[0] !== rest) {
            remember([rest])
        }

        current = active.length > 0 ? active[0].value : rest
    }

    const readRows = (keys: ReadonlyArray<string>, fixed: Record<string, unknown> = {}) => {
        const moments = history.slice(-rowOpacities.length).reverse()

        return rowOpacities.map((_opacity, row) => keys.map((key) => {
            if (key in fixed) {
                return row === 0 && fixed[key] !== undefined ? describeValue(key, fixed[key]) : emptyCell
            }

            return row < moments.length ? describeMoment(moments[row], key) : emptyCell
        }))
    }

    const describeRecords = (records: ReadonlyArray<Record<string, unknown>>): Rows => {
        const presentKeys = collectKeys(records)
        const staleKeys = knownKeys.filter((key) => !presentKeys.includes(key))

        for (const key of staleKeys) {
            knownKeys.splice(knownKeys.indexOf(key), 1)
            changingKeys.delete(key)
            widths.delete(key)
        }

        for (const key of presentKeys) {
            if (!knownKeys.includes(key)) {
                knownKeys.push(key)
            }
        }

        for (const key of knownKeys) {
            if (isChanging(records.map((event) => key in event ? formatValue(event[key]) : ''))) {
                changingKeys.add(key)
            }
        }

        const fixedKeys = knownKeys.filter((key) => !changingKeys.has(key))
        const ordered = [...knownKeys.filter((key) => changingKeys.has(key)), ...fixedKeys]
        const fixed = Object.fromEntries(fixedKeys.map((key) => [key, findLatestValue(records, key)]))
        const rows = readRows(ordered, fixed)

        return {
            keys: ordered,
            header: ordered.map((key) => [{ text: key, tone: 'name' }]),
            rows: fixedKeys.length === ordered.length ? rows.slice(0, 1) : rows,
        }
    }

    const describeValues = (): Rows => {
        if (isChanging(history.flat().map(formatValue))) {
            changingKeys.add(valueKey)
        }

        return {
            keys: [valueKey],
            rows: changingKeys.has(valueKey) ? readRows([valueKey]) : [[describeValue(valueKey, current)]],
        }
    }

    const measure = ({ keys, header, rows }: Rows) => {
        for (const [column, key] of keys.entries()) {
            const lengths = [...(header ? [header] : []), ...rows].map((row) => readText(row[column]).length)
            widths.set(key, Math.max(widths.get(key) ?? 0, ...lengths))
        }

        return keys.map((key) => widths.get(key) ?? 0)
    }

    const describe = () => {
        const records = history.flat().filter(isRecord)
        return records.length > 0 ? describeRecords(records) : isRecord(current) ? describeRecords([current]) : describeValues()
    }

    return {
        update: (pattern, from, to) => {
            record(pattern, from, to)
            const rows = describe()
            return { ...rows, widths: measure(rows) }
        },
    }
}
