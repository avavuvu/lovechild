import { Hap, Pattern, register, signal, TimeSpan, type HitLength } from '@strudel/core'

const findGaps = (span: TimeSpan, events: ReadonlyArray<Hap>): Array<Hap<number>> => {
    if (events.length === 0) {
        return [new Hap(undefined, span, 0, {})]
    }

    const sorted = [...events].sort((first, second) => first.part.begin.lt(second.part.begin) ? -1 : 1)
    const gaps: Array<Hap<number>> = []
    let cursor = span.begin

    for (const event of sorted) {
        if (event.part.begin.gt(cursor)) {
            gaps.push(new Hap(undefined, new TimeSpan(cursor, event.part.begin), 0, {}))
        }

        cursor = cursor.max(event.part.end)
    }

    if (cursor.lt(span.end)) {
        gaps.push(new Hap(undefined, new TimeSpan(cursor, span.end), 0, {}))
    }

    return gaps
}

const markHits = (pattern: Pattern) => new Pattern<number>((state) => {
    const events = pattern.query(state).filter((hap) => hap.whole !== undefined)
    const marked = events.map((hap) => new Hap(hap.whole, hap.part, 1, hap.context))
    return [...marked, ...findGaps(state.span, events)]
})

const fadeAfterOnsets = (length: number, pattern: Pattern) => signal((time) => {
    const now = Number(time)
    const onsets = [...pattern.queryArc(now - length, now), ...pattern.queryArc(now, now)]
        .flatMap((hap) => hap.whole === undefined ? [] : [Number(hap.whole.begin)])
        .filter((onset) => onset <= now && onset >= now - length)

    if (onsets.length === 0) {
        return 0
    }

    return 1 - (now - Math.max(...onsets)) / length
})

const defaultHitLength = 0.2

register('hits', (length: number, pattern: Pattern) => length > 0 ? fadeAfterOnsets(length, pattern) : markHits(pattern))

const patternedHits = Pattern.prototype.hits

Object.defineProperty(Pattern.prototype, 'hits', {
    value: function (this: Pattern, ...lengths: ReadonlyArray<HitLength>) {
        return lengths.length > 0 ? patternedHits.call(this, ...lengths) : patternedHits.call(this, defaultHitLength)
    },
    configurable: true,
    writable: true,
})

const searchCycles = 8

const glideDepth = 8

const findLastEvent = (pattern: Pattern, time: number, isInclusive: boolean) => {
    for (let cycle = 0; cycle < searchCycles; cycle += 1) {
        const end = time - cycle
        const found = cycle === 0 ? [...pattern.queryArc(end - 1, end), ...pattern.queryArc(end, end)] : pattern.queryArc(end - 1, end)
        let latest: Hap | undefined

        for (const hap of found) {
            if (hap.whole === undefined) {
                continue
            }

            const onset = Number(hap.whole.begin)
            const isBefore = isInclusive ? onset <= time : onset < time

            if (isBefore && (latest === undefined || onset > Number(latest.whole?.begin))) {
                latest = hap
            }
        }

        if (latest) {
            return latest
        }
    }

    return undefined
}

const getGlideValue = (pattern: Pattern, length: number, time: number, isInclusive: boolean, depth: number): number => {
    const current = findLastEvent(pattern, time, isInclusive)

    if (current?.whole === undefined) {
        return 0
    }

    const target = Number(current.value)
    const onset = Number(current.whole.begin)
    const progress = length > 0 ? (time - onset) / length : 1

    if (progress >= 1 || depth === 0) {
        return target
    }

    const start = getGlideValue(pattern, length, onset, false, depth - 1)
    return start + (target - start) * progress
}

register('glide', (length: number, pattern: Pattern) => signal((time) => getGlideValue(pattern, length, Number(time), true, glideDepth)))
