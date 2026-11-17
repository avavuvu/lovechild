import { hasFreePrevious, isEmptyLoop, isImage, type Image } from '@lovechild/core'
import { silence, type Pattern } from '@strudel/core'
import { closeLoopIfImage, createNames, getImagesByName, getBlockName, isMuted, isName, isImageOrPattern, switchOff, type Named, type ImageOrPattern } from './names'
import type { Prepared } from './prepare'
import { reportWarning } from './warnings'

export interface ImagePreview {
    id: string
    image: Image
}

export interface PatternPreview {
    id: string
    pattern: Pattern
}

export interface Scene {
    onStage: ReadonlyArray<ImageOrPattern>
    imagesAndPatternsByName: ReadonlyMap<string, ImageOrPattern>
    imagePreviews: ReadonlyArray<ImagePreview>
    patternPreviews: ReadonlyArray<PatternPreview>
}

interface Block extends Named {
    isOff: boolean
}

export interface SceneBuilder {
    lookup: object
    readPrevious: (image?: object) => Image
    addBlock: (label: string, imageOrPattern: ImageOrPattern) => ImageOrPattern
    giveNameToImageOrPattern: (label: unknown, imageOrPattern: ImageOrPattern) => ImageOrPattern
    addImagePreview: (id: string, image: Image) => void
    addPatternPreview: (id: string, pattern: Pattern) => void
    build: (result: unknown) => Scene
}

const anonymousName = '$'

const checkLoops = (checked: ReadonlyArray<Named>, imagesAndPatternsByName: ReadonlyMap<string, ImageOrPattern>) => {
    const images = getImagesByName(imagesAndPatternsByName)
    const empty = checked.find(({ name, imageOrPattern }) => isImage(imageOrPattern) && isEmptyLoop(imageOrPattern, images, isName(name) ? name : undefined))

    if (empty) {
        throw new Error(`${isName(empty.name) ? empty.name : anonymousName + ':'} only reads previous frames`)
    }
}

const stageBlocks = (blocks: ReadonlyArray<Block>) => {
    const shown = new Map<string, ImageOrPattern>()

    for (const [index, block] of blocks.entries()) {
        shown.set(block.name === anonymousName ? anonymousName + index : block.name, block.imageOrPattern)
    }

    return Array.from(shown.values())
}

export const createSceneBuilder = (prepared: Prepared, inputs: ReadonlyMap<string, ImageOrPattern>): SceneBuilder => {
    const registry = createNames(inputs)
    const blocks: Array<Block> = []
    const imagePreviews: Array<ImagePreview> = []
    const patternPreviews: Array<PatternPreview> = []

    const addBlock = (label: string, imageOrPattern: ImageOrPattern) => {
        const name = getBlockName(label)
        const closed = closeLoopIfImage(imageOrPattern)
        const isOff = isMuted(label)
        blocks.push({ name, imageOrPattern: closed, isOff })

        if (isName(name)) {
            registry.define(name, isOff ? switchOff(closed) : closed)
        }

        return isOff ? silence : closed
    }

    const giveNameToImageOrPattern = (label: unknown, imageOrPattern: ImageOrPattern) => {
        const name = typeof label === 'string' ? getBlockName(label) : ''

        if (typeof label !== 'string' || !isName(name)) {
            throw new Error('track needs a name starting with $, like .track("$kick")')
        }

        if (isImage(imageOrPattern) && hasFreePrevious(imageOrPattern.operation)) {
            reportWarning({ details: { kind: 'ambiguousPrevious', name }, place: { search: { text: label } } })
        }

        const named = isMuted(label) ? switchOff(imageOrPattern) : imageOrPattern
        registry.define(name, prepared.mutedNames.has(name) ? switchOff(imageOrPattern) : named)
        return named
    }

    const build = (result: unknown) => {
        const visible = blocks.filter((block) => !block.isOff)
        const checked = visible.length > 0 ? visible : [result].filter(isImageOrPattern).map((imageOrPattern) => ({ name: anonymousName, imageOrPattern: closeLoopIfImage(imageOrPattern) }))
        checkLoops([...checked, ...registry.bound], registry.defined)

        return {
            onStage: visible.length > 0 ? stageBlocks(visible) : checked.map((block) => block.imageOrPattern),
            imagesAndPatternsByName: registry.defined,
            imagePreviews,
            patternPreviews,
        }
    }

    return {
        lookup: registry.lookup,
        readPrevious: registry.readPrevious,
        addBlock,
        giveNameToImageOrPattern,
        addImagePreview: (id, image) => imagePreviews.push({ id, image }),
        addPatternPreview: (id, pattern) => patternPreviews.push({ id, pattern }),
        build,
    }
}
