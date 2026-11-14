import { camera, colorNames, combineNames, coordinateNames, definitions, Image, picture, previous, sourceFunctions, sourceNames, splitNames, text, TextImage, video } from '@lovechild/core'
import type { EntryParameter } from '../docs/reference'
import { readSignatureTypes } from './types'

export interface LovechildDoc {
    name: string
    category: string
    synonyms: ReadonlyArray<string>
    parameters: ReadonlyArray<EntryParameter>
    returns: ReadonlyArray<string>
    owners: ReadonlyArray<string>
}

type Callable = (...values: Array<never>) => unknown

type FindPath = (name: string) => ReadonlyArray<string>

type FindOwner = (name: string) => string | undefined

const stepCategories = new Map<string, string>([
    ...sourceNames.map((name): [string, string] => [name, 'source']),
    ...coordinateNames.map((name): [string, string] => [name, 'coordinate']),
    ...colorNames.map((name): [string, string] => [name, 'color']),
    ...combineNames.map((name): [string, string] => [name, 'combine']),
    ...splitNames.map((name): [string, string] => [name, 'split']),
])

const swizzlePattern = /^(?:[rgba]{1,4}|[xyzw]{1,4})$/
const wrapperPattern = /^\w+\(([^)]*)\)\s*\{\s*return\s+this\.(\w+)\(([^)]*)\);?\s*\}$/

const readParameterNames = (callable: Callable) => {
    const list = callable.toString().match(/^[^(]*\(([^)]*)\)/)?.[1] ?? ''
    return list.split(',').map((name) => name.trim()).filter(Boolean)
}

const readSignature = (name: string, callable: Callable, path: ReadonlyArray<string>) => {
    const defined = name in definitions ? definitions[name as keyof typeof definitions].parameters : []
    const types = readSignatureTypes(path)

    const parameters = readParameterNames(callable).map((parameter): EntryParameter => ({
        name: parameter,
        types: types.parameters.get(parameter) ?? [],
        default: defined.find((found) => found.name === parameter)?.default?.toString(),
    }))

    return { parameters, returns: types.returns }
}

const readMethods = (prototype: object) => Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor' && !swizzlePattern.test(name))
    .map((name): [string, Callable] => [name, Reflect.get(prototype, name)])

const readWrapper = (callable: Callable) => {
    const match = callable.toString().replace(/\s+/g, ' ').match(wrapperPattern)
    return match ? { target: match[2], isSame: match[1].replace(/\s/g, '') === match[3].replace(/\s/g, '') } : undefined
}

const createDocs = (functions: ReadonlyArray<[string, Callable]>, findCategory: (name: string) => string, findPath: FindPath, findOwner: FindOwner = () => undefined) => {
    const docs = new Map<string, LovechildDoc & { synonyms: Array<string> }>()
    const canonical = new Map<Callable, string>()

    functions.forEach(([name, callable]) => {
        const wrapper = readWrapper(callable)
        const sameAs = canonical.get(callable) ?? (wrapper?.isSame ? wrapper.target : undefined)
        const original = sameAs === undefined ? undefined : docs.get(sameAs)

        if (original) {
            original.synonyms.push(name)
            return
        }

        canonical.set(callable, name)
        docs.set(name, {
            name,
            category: findCategory(wrapper?.target ?? name),
            synonyms: [],
            owners: [findOwner(name)].filter((owner) => owner !== undefined),
            ...readSignature(name, callable, findPath(name)),
        })
    })

    return Array.from(docs.values())
}

export const readLovechildDocs = (): ReadonlyArray<LovechildDoc> => {
    const findCategory = (name: string) => stepCategories.get(name) ?? 'other'
    const sources: Array<[string, Callable]> = [...Object.entries(sourceFunctions), ['previous', previous]]
    const media: Array<[string, Callable]> = [['camera', camera], ['video', video], ['picture', picture]]

    const findExportPath: FindPath = (name) => name in sourceFunctions ? ['sourceFunctions', name] : [name]
    const findTextPath: FindPath = (name) => name === 'text' ? [name] : ['TextImage', name]

    return [
        ...createDocs(sources, () => 'source', findExportPath),
        ...createDocs(media, () => 'media', findExportPath),
        ...createDocs([['text', text], ...readMethods(TextImage.prototype)], () => 'text', findTextPath, (name) => name === 'text' ? undefined : 'TextImage'),
        ...createDocs(readMethods(Image.prototype), findCategory, (name) => ['Image', name], () => 'Image'),
    ]
}
