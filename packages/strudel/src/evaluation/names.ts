import { closeLoop, isImage, previous, type Image } from '@lovechild/core'
import { isPattern, silence, type Pattern } from '@strudel/core'

export type ImageOrPattern = Image | Pattern

export interface Named {
    name: string
    imageOrPattern: ImageOrPattern
}

export const isImageOrPattern = (value: unknown): value is ImageOrPattern => isImage(value) || isPattern(value)

export const isName = (key: string) => key.length > 1 && key.startsWith('$')

export const isMuted = (label: string) => label.startsWith('_') || label.endsWith('_')

export const getBlockName = (label: string) => label.replace(/^_+|_+$/g, '')

export const closeLoopIfImage = (imageOrPattern: ImageOrPattern) => isImage(imageOrPattern) ? closeLoop(imageOrPattern) : imageOrPattern

export const getImagesByName = (imagesAndPatternsByName: ReadonlyMap<string, ImageOrPattern>) => new Map(Array.from(imagesAndPatternsByName).filter((entry): entry is [string, Image] => isImage(entry[1])))

export const switchOff = (imageOrPattern: ImageOrPattern): ImageOrPattern => isImage(imageOrPattern) ? imageOrPattern.hush() : silence

export const createNames = (inputs: ReadonlyMap<string, ImageOrPattern>) => {
    const defined = new Map<string, ImageOrPattern>()
    const values = new Map<string, unknown>()
    const bound: Array<Named> = []
    const imageNames = new WeakMap<object, string>()
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

        imageNames.set(later, name)
        laterNames.set(name, later)
        return later
    }

    const claim = (name: string) => {
        if (defined.has(name) || values.has(name)) {
            throw new Error(`${name} is already defined`)
        }
    }

    const define = (name: string, imageOrPattern: ImageOrPattern) => {
        claim(name)
        defined.set(name, imageOrPattern)

        if (isImage(imageOrPattern)) {
            imageNames.set(imageOrPattern, name)
        }
    }

    const bind = (name: string, value: unknown) => {
        if (!isImageOrPattern(value)) {
            claim(name)
            values.set(name, value)
            return
        }

        const imageOrPattern = closeLoopIfImage(value)
        define(name, imageOrPattern)
        bound.push({ name, imageOrPattern })
    }

    const read = (name: string) => {
        const imageOrPattern = defined.get(name)

        if (imageOrPattern !== undefined) {
            return imageOrPattern
        }

        if (values.has(name)) {
            return values.get(name)
        }

        return inputs.get(name) ?? getLaterName(name)
    }

    const lookup = new Proxy({}, {
        has: (_target, key) => typeof key === 'string' && isName(key),
        get: (_target, key) => typeof key === 'string' ? read(key) : undefined,
        set: (_target, key, value) => {
            if (typeof key !== 'string' || !isName(key)) {
                return false
            }

            bind(key, value)
            return true
        },
    })

    const readPrevious = (image?: object) => {
        if (image === undefined) {
            return previous()
        }

        const name = imageNames.get(image)

        if (name === undefined) {
            throw new Error('previous() takes a named track')
        }

        return previous(name)
    }

    return { defined: defined as ReadonlyMap<string, ImageOrPattern>, bound: bound as ReadonlyArray<Named>, lookup, define, readPrevious }
}
