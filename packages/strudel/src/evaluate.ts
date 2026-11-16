import { Image, closeLoop, hasFreePrevious, isImage, isEmptyLoop, isOpaque } from '@lovechild/core'
import { isPattern, Pattern, silence } from '@strudel/core'
import { registerWidgetType, transpiler, type Widget } from '@strudel/transpiler'
import { createNames, isName, type Track } from './names'
import { findBlockLabels, findTrackBlocks, separateStatements } from './statements'
import { getNamedImages } from './visuals'
import { collectWarnings, reportWarning, type Location, type Report } from './warnings'

export type MiniLocation = [number, number]

export interface Preview {
    id: string
    image: Image
}

export interface Peek {
    id: string
    pattern: Pattern
}

export interface Evaluation {
    tracks: ReadonlyArray<Track>
    names: ReadonlyMap<string, Track>
    previews: ReadonlyArray<Preview>
    peeks: ReadonlyArray<Peek>
    miniLocations: ReadonlyArray<MiniLocation>
    widgets: ReadonlyArray<Widget>
    transpiled: string
    reports: ReadonlyArray<Report>
}

export const previewNames = ['preview', 'peek', 'peak']

for (const name of previewNames) {
    registerWidgetType(name)
}

const isMuted = (label: string) => label.startsWith('_') || label.endsWith('_')

const trackNamePattern = /\.track\(\s*"([^"\\\n]*)"\s*\)/g

const quoteTrackNames = (code: string) => code.replace(trackNamePattern, (call: string, name: string) => call.replace(`"${name}"`, `'${name}'`))

export const getTrackName = (label: string) => label.replace(/^_+|_+$/g, '')

const isTrack = (value: unknown): value is Track => isImage(value) || isPattern(value)

const closeTrack = (track: Track) => isImage(track) ? closeLoop(track) : track

const switchOff = (track: Track): Track => isImage(track) ? track.hush() : silence

interface Registered {
    name: string
    track: Track
}

interface InnerTrack extends Registered {
    label: string
}

interface Block {
    name: string
    image: Image
    location: Location | undefined
}

const reportCoveredBlocks = (blocks: ReadonlyArray<Block>) => {
    for (const [index, block] of blocks.entries()) {
        const cover = blocks.slice(index + 1).find((later) => isOpaque(later.image.operation))

        if (cover) {
            reportWarning({ details: { kind: 'coveredBlock', name: block.name, coveredBy: cover.name }, place: { locations: block.location ? [block.location] : [] } })
        }
    }
}

const checkLoops = (registered: ReadonlyArray<Registered>, inner: ReadonlyArray<Registered> = []) => {
    const images = getNamedImages(new Map([...inner, ...registered].filter(({ name }) => isName(name)).map(({ name, track }) => [name, track])))
    const empty = registered.find(({ name, track }) => isImage(track) && isEmptyLoop(track, images, isName(name) ? name : undefined))

    if (empty) {
        throw new Error(`${isName(empty.name) ? empty.name : '$:'} only reads previous frames`)
    }
}

export const evaluateCode = async (code: string, scope: Record<string, unknown>, inputs: ReadonlyMap<string, Track> = new Map()): Promise<Evaluation> => {
    const { output, miniLocations = [], widgets = [] } = transpiler(separateStatements(quoteTrackNames(code)), { wrapAsync: true })
    const names = createNames(inputs)
    const tracks = new Map<string, Track>()
    const previews: Array<Preview> = []
    const peeks: Array<Peek> = []
    const registered: Array<Registered> = []
    const innerTracks: Array<InnerTrack> = []
    const namedInner: Array<Registered> = []
    const trackBlocks = findTrackBlocks(code)
    const blockLabels = findBlockLabels(code)
    const labelCounts = new Map<string, number>()
    const blocks: Array<Block> = []
    let anonymousCount = 0

    const registerTrack = function (this: Track, label: string) {
        const name = getTrackName(label)
        const track = closeTrack(this)
        const isOff = isMuted(label)
        const occurrence = labelCounts.get(label) ?? 0
        labelCounts.set(label, occurrence + 1)
        registered.push({ name, track })

        for (const inner of innerTracks.splice(0)) {
            const isInside = !trackBlocks.has(inner.label) || trackBlocks.get(inner.label) === label
            names.defineName(inner.name, isOff && isInside ? switchOff(inner.track) : inner.track)
        }

        if (isName(name)) {
            names.defineName(name, isOff ? switchOff(track) : track)
        }

        if (isOff) {
            return silence
        }

        const id = name === '$' ? name + anonymousCount : name
        anonymousCount += 1
        tracks.set(id, track)

        if (isImage(track)) {
            blocks.push({ name, image: track, location: blockLabels.get(label)?.[occurrence] })
        }

        return track
    }

    const nameTrack = function (this: Track, label: unknown) {
        const name = typeof label === 'string' ? getTrackName(label) : ''

        if (typeof label !== 'string' || !isName(name)) {
            throw new Error('track needs a name starting with $, like .track("$kick")')
        }

        if (names.tracks.has(name)) {
            throw new Error(`${name} is already a track`)
        }

        if (isImage(this) && hasFreePrevious(this.operation)) {
            reportWarning({ details: { kind: 'ambiguousPrevious', name }, place: { search: { text: label } } })
        }

        const track = isMuted(label) ? switchOff(this) : this
        names.defineName(name, track)
        innerTracks.push({ name, label, track })
        namedInner.push({ name, track: this })
        return track
    }

    const registerPreview = function (this: Image, id: string) {
        previews.push({ id, image: this })
        return this
    }

    const registerPeek = function (this: Pattern, id: string) {
        peeks.push({ id, pattern: this })
        return this
    }

    for (const prototype of [Pattern.prototype, Image.prototype]) {
        Object.defineProperty(prototype, 'p', { value: registerTrack, configurable: true, writable: true })
        Object.defineProperty(prototype, 'track', { value: nameTrack, configurable: true, writable: true })
    }

    for (const name of previewNames) {
        Object.defineProperty(Image.prototype, name, { value: registerPreview, configurable: true, writable: true })
        Object.defineProperty(Pattern.prototype, name, { value: registerPeek, configurable: true, writable: true })
    }

    const values = { ...scope, previous: names.readPrevious }
    const run = new Function('lookup', ...Object.keys(values), 'with (lookup) { return ' + output + ' }')
    const { result, reports } = await collectWarnings(async (): Promise<unknown> => {
        const value = await run(names.lookup, ...Object.values(values))
        reportCoveredBlocks(blocks)
        return value
    })

    const shown = tracks.size > 0 ? Array.from(tracks.values()) : [result].filter(isTrack).map(closeTrack)
    checkLoops(tracks.size > 0 ? registered : shown.map((track) => ({ name: '$', track })), namedInner)

    return {
        tracks: shown,
        names: names.tracks,
        previews,
        peeks,
        miniLocations,
        widgets,
        transpiled: output,
        reports,
    }
}
