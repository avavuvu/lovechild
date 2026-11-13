import { isImage, previous, type Image } from '@lovechild/core'
import type { Pattern } from '@strudel/core'

export type Track = Image | Pattern

export const isName = (key: string) => key.length > 1 && key.startsWith('$')

export const createNames = (inputs: ReadonlyMap<string, Track>) => {
    const tracks = new Map<string, Track>()
    const trackNames = new WeakMap<object, string>()
    const laterNames = new Map<string, object>()

    const getLaterName = (name: string) => {
        const existing = laterNames.get(name)

        if (existing) {
            return existing
        }

        const later = new Proxy({}, {
            get: () => {
                throw new Error(`${name} is not defined`)
            },
        })

        trackNames.set(later, name)
        laterNames.set(name, later)
        return later
    }

    const lookup = new Proxy({}, {
        has: (_target, key) => typeof key === 'string' && isName(key),
        get: (_target, key) => {
            if (typeof key !== 'string') {
                return undefined
            }

            return tracks.get(key) ?? inputs.get(key) ?? getLaterName(key)
        },
    })

    const defineName = (name: string, track: Track) => {
        tracks.set(name, track)

        if (isImage(track)) {
            trackNames.set(track, name)
        }
    }

    const readPrevious = (track?: object) => {
        if (track === undefined) {
            return previous()
        }

        const name = trackNames.get(track)

        if (name === undefined) {
            throw new Error('previous() takes a named track')
        }

        return previous(name)
    }

    return { tracks, lookup, defineName, readPrevious }
}
