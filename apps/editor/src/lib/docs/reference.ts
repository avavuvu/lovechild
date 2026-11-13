export type Namespace = 'lovechild' | 'strudel'

export type Kind = 'image' | 'text' | 'neutral' | 'sound'

export interface EntryParameter {
    name: string
    types: ReadonlyArray<string>
    description?: string
    default?: string
}

export interface Entry {
    namespace: Namespace
    name: string
    label: string
    href: string
    categories: ReadonlyArray<string>
    synonyms: ReadonlyArray<string>
    parameters: ReadonlyArray<EntryParameter>
    description: string
    examples: ReadonlyArray<string>
}

export interface DocumentData {
    entry: Entry
    other: Entry | undefined
    links: Record<string, string>
}

export interface ReferenceData {
    entries: ReadonlyArray<Entry>
    links: Record<string, string>
}

export const indexName = 'index'

export const strudelPrefix = 'strudel:'

export const conceptCategory = 'concept'

export const lovechildCategories = ['source', 'media', 'text', 'coordinate', 'color', 'combine', 'split', 'other']

export const neutralCategories = ['temporal', 'stepwise', 'combiners', 'functional', 'math', 'generators']

export const getKind = (namespace: Namespace, category: string): Kind => {
    if (category === conceptCategory) {
        return 'neutral'
    }

    if (namespace === 'strudel') {
        return neutralCategories.includes(category) ? 'neutral' : 'sound'
    }

    if (category === 'sound') {
        return 'sound'
    }

    return category === 'text' ? 'text' : 'image'
}

export const getEntryKind = (entry: Entry) => getKind(entry.namespace, entry.categories[0])

export const isConcept = (entry: Entry) => entry.categories[0] === conceptCategory

export const getHref = (namespace: Namespace, name: string) => {
    if (namespace === 'strudel') {
        return `/strudel/${encodeURIComponent(name)}`
    }

    return name === indexName ? '/' : `/${encodeURIComponent(name)}`
}

export const getEntryKey = (entry: Entry) => `${entry.namespace}:${entry.name}`
