import { error } from '@sveltejs/kit'
import { getFileName } from '../files'
import { markdownPages, readNamespace } from '../docs/pages'
import { getEntryKey, getHref, strudelPrefix, type DocumentData, type Entry, type Namespace, type ReferenceData } from '../docs/reference'
import { readLovechildDocs } from './lovechild'
import { readStrudelDocs } from './strudel'

const reservedNames = ['code', 'explore', 'examples']

const markdownFiles = import.meta.glob<string>('../docs/pages/**/*.md', { query: '?raw', import: 'default', eager: true })

const linkPattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

const lovechild = readLovechildDocs().map(({ category, ...doc }) => ({ ...doc, categories: [category], namespace: 'lovechild' as const, description: '', examples: [] }))
const strudel = readStrudelDocs().map((doc) => ({ ...doc, namespace: 'strudel' as const }))
const generated = [...lovechild, ...strudel]

const isGenerated = (namespace: Namespace, name: string) => generated.some((doc) => doc.namespace === namespace && doc.name === name)

const createEntries = (): ReadonlyArray<Entry> => {
    const written = markdownPages
        .filter((page) => !isGenerated(page.namespace, page.name))
        .map((page) => ({ namespace: page.namespace, name: page.name, categories: [page.category ?? 'other'], synonyms: [], parameters: page.parameters, description: '', examples: [] }))

    const lovechildNames = new Set([...lovechild, ...written].filter((doc) => doc.namespace === 'lovechild').map((doc) => doc.name))

    return [...generated, ...written].map((doc) => {
        const aliases = markdownPages.find((page) => page.namespace === doc.namespace && page.name === doc.name)?.aliases ?? []
        const isClash = doc.namespace === 'strudel' && lovechildNames.has(doc.name)

        return {
            ...doc,
            synonyms: Array.from(new Set([...doc.synonyms, ...aliases])).filter((synonym) => synonym !== doc.name),
            label: isClash ? `${strudelPrefix}${doc.name}` : doc.name,
            href: getHref(doc.namespace, doc.name),
        }
    })
}

export const entries = createEntries()

export const functionEntries = entries.filter((entry) => isGenerated(entry.namespace, entry.name))

const reservedEntry = entries.find((entry) => entry.namespace === 'lovechild' && reservedNames.includes(entry.name))

if (reservedEntry) {
    throw new Error(`${reservedEntry.name} is a reserved page name`)
}

const readLinkNames = (entry: Entry) => [entry.name, ...entry.synonyms]

const strudelFallbacks = entries.filter((entry) => entry.namespace === 'strudel').flatMap((entry) => readLinkNames(entry).map((name): [string, Entry] => [name, entry]))

const linkTargets = new Map([...strudelFallbacks, ...entries.flatMap((entry) => {
    const prefix = entry.namespace === 'strudel' ? strudelPrefix : ''
    return readLinkNames(entry).map((name): [string, Entry] => [`${prefix}${name}`, entry])
})])

const linkNamesByLowerCase = new Map(Array.from(linkTargets.keys()).reverse().map((name) => [name.toLowerCase(), name]))

export const findLinkTarget = (target: string) => {
    const name = target.replace(/\(\)$/, '')
    return linkTargets.get(name) ?? linkTargets.get(linkNamesByLowerCase.get(name.toLowerCase()) ?? '')
}

export const readLinks = (namespace: Namespace, name: string) => Object.entries(markdownFiles)
    .filter(([path]) => readNamespace(path.replace('../docs', '.')) === namespace && getFileName(path) === name)
    .flatMap(([, text]) => Array.from(text.matchAll(linkPattern), (match) => match[1]))

export const findEntry = (namespace: Namespace, name: string) => entries.find((entry) => entry.namespace === namespace && entry.name === name)

export const listNames = (namespace: Namespace) => entries.filter((entry) => entry.namespace === namespace).map((entry) => entry.name)

const resolveLinks = (targets: ReadonlyArray<string>) => Object.fromEntries(targets.flatMap((target) => {
    const found = findLinkTarget(target)
    return found ? [[target, found.href]] : []
}))

export const loadDocument = (namespace: Namespace, name: string): DocumentData => {
    const entry = findEntry(namespace, name)

    if (!entry) {
        error(404)
    }

    return {
        entry,
        other: findEntry(namespace === 'strudel' ? 'lovechild' : 'strudel', name),
        links: resolveLinks(readLinks(namespace, name)),
    }
}

export const loadReference = (): ReferenceData => ({
    entries: functionEntries,
    links: resolveLinks(functionEntries.flatMap((entry) => readLinks(entry.namespace, entry.name))),
})

export const listEdges = () => {
    const pairs = entries.flatMap((entry) => readLinks(entry.namespace, entry.name).flatMap((target) => {
        const found = findLinkTarget(target)
        const keys = found && found !== entry ? [getEntryKey(entry), getEntryKey(found)].sort() : []
        return keys.length === 2 ? [[keys[0], keys[1]] as const] : []
    }))

    return Array.from(new Map(pairs.map((pair) => [pair.join('\n'), pair])).values())
}
