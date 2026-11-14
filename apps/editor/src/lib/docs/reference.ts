export type Namespace = 'lovechild' | 'strudel'

export type Kind = 'image' | 'text' | 'neutral' | 'sound'

export interface EntryParameter {
    name: string
    types: ReadonlyArray<string>
    description?: string
    default?: string
}

export interface EntryReference {
    label: string
    href: string
    kind: Kind
}

export interface Entry {
    namespace: Namespace
    name: string
    label: string
    href: string
    categories: ReadonlyArray<string>
    synonyms: ReadonlyArray<string>
    parameters: ReadonlyArray<EntryParameter>
    returns: ReadonlyArray<string>
    description: string
    examples: ReadonlyArray<string>
    owners: ReadonlyArray<string>
    mentionedIn: ReadonlyArray<EntryReference>
    members: ReadonlyArray<EntryReference>
    methods: ReadonlyArray<EntryReference>
    returnedBy: ReadonlyArray<EntryReference>
    acceptedBy: ReadonlyArray<EntryReference>
    categoryHrefs: Record<string, string>
    typeHrefs: Record<string, string>
}

export interface LinkTarget {
    label: string
    href: string
    namespace: Namespace
    isConcept: boolean
}

export type Links = Record<string, LinkTarget>

export interface DocumentData {
    entry: Entry
    links: Links
}

export interface ReferenceData {
    entries: ReadonlyArray<Entry>
    links: Links
}

export const indexName = 'index'

export const strudelPrefix = 'strudel:'

export const conceptCategory = 'concept'

export const categoryCategory = 'category'

export const typeCategory = 'type'

export const pageCategories = [conceptCategory, typeCategory, categoryCategory]

export const uncategorized = ['other', 'untagged', conceptCategory, categoryCategory]

export const lovechildCategories = ['source', 'media', 'text', 'coordinate', 'color', 'combine', 'split', 'other']

export const neutralCategories = ['temporal', 'stepwise', 'combiners', 'functional', 'math', 'generators']

const isLovechildCategory = (category: string) => pageCategories.includes(category) || lovechildCategories.includes(category)

export const getCategoryKey = (category: string) => `${isLovechildCategory(category) ? 'lovechild' : 'strudel'}:${category}`

export const getKind = (category: string): Kind => {
    if (pageCategories.includes(category)) {
        return 'neutral'
    }

    if (!isLovechildCategory(category)) {
        return neutralCategories.includes(category) ? 'neutral' : 'sound'
    }

    return category === 'text' ? 'text' : 'image'
}

export const getEntryKind = (entry: Entry) => getKind(entry.categories[0])

export const isConcept = (entry: Entry) => pageCategories.includes(entry.categories[0])

export const getPathName = (namespace: Namespace, name: string) => namespace === 'strudel' ? name : `${name.charAt(0).toLowerCase()}${name.slice(1)}`

export const getHref = (namespace: Namespace, name: string) => {
    if (namespace === 'strudel') {
        return `/strudel/${encodeURIComponent(name)}`
    }

    return name === indexName ? '/' : `/${encodeURIComponent(getPathName(namespace, name))}`
}

export const getEntryKey = (entry: Entry) => `${entry.namespace}:${entry.name}`
