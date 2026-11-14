import { error } from '@sveltejs/kit'
import { getFileName } from '../files'
import { findMarkdown, markdownPages, readNamespace } from '../docs/pages'
import { categoryCategory, getEntryKey, pageCategories, getEntryKind, getHref, getPathName, indexName, isConcept, typeCategory, uncategorized, type DocumentData, type Entry, type EntryReference, type Namespace, type ReferenceData } from '../docs/reference'
import { createVocabulary, findCategoryMentions, findWrittenMentions, linkDescription, type Mention, type MentionKind } from './mentions'
import { readExtensions, type Extension } from './extensions'
import { readLovechildDocs } from './lovechild'
import { readStrudelDocs } from './strudel'

const reservedNames = ['code', 'explore', 'examples']

const markdownFiles = import.meta.glob<string>('../docs/pages/**/*.md', { query: '?raw', import: 'default', eager: true })

const strudelDocs = readStrudelDocs()
const strudelNames = new Set(strudelDocs.flatMap((doc) => [doc.name, ...doc.synonyms]))
const extensions = readExtensions()

const findExtensionOwners = (names: ReadonlyArray<string>) => extensions
    .filter((extension) => names.includes(extension.name))
    .flatMap((extension) => extension.owners)

const createExtensionDoc = (extension: Extension) => {
    const names = [extension.name, ...extension.synonyms]
    const name = names.find((found) => findMarkdown('lovechild', found)) ?? extension.name

    return {
        name,
        synonyms: names.filter((found) => found !== name),
        categories: ['other'],
        owners: extension.owners,
        parameters: extension.parameters,
        returns: extension.returns,
        namespace: 'lovechild' as const,
        description: '',
        examples: [],
    }
}

const lovechild = [
    ...readLovechildDocs().map(({ category, ...doc }) => ({ ...doc, categories: [category], namespace: 'lovechild' as const, description: '', examples: [] })),
    ...extensions.filter((extension) => !strudelNames.has(extension.name)).map(createExtensionDoc),
]
const strudel = strudelDocs.map((doc) => ({ ...doc, owners: findExtensionOwners([doc.name, ...doc.synonyms]), namespace: 'strudel' as const }))
const generated = [...lovechild, ...strudel]

const isGenerated = (namespace: Namespace, name: string) => generated.some((doc) => doc.namespace === namespace && doc.name === name)

const readAliases = (doc: { namespace: Namespace, name: string }) => markdownPages.find((page) => page.namespace === doc.namespace && page.name === doc.name)?.aliases ?? []

const canHeadCategory = (doc: { name: string, categories: ReadonlyArray<string> }) => pageCategories.includes(doc.categories[0]) || doc.categories.includes(doc.name)

const createEntries = (): ReadonlyArray<Entry> => {
    const written = markdownPages
        .filter((page) => !isGenerated(page.namespace, page.name))
        .map((page) => ({
            namespace: page.namespace,
            name: page.name,
            categories: page.categories.length > 0 ? page.categories : ['other'],
            synonyms: [],
            owners: [],
            parameters: page.parameters ?? [],
            returns: page.returns ?? [],
            description: '',
            examples: [],
        }))

    const pages = [...generated, ...written].map((doc) => {
        const markdown = findMarkdown(doc.namespace, doc.name)
        const categories = markdown?.categories ?? []

        return {
            ...doc,
            categories: categories.length > 0 ? categories : doc.categories,
            parameters: markdown?.parameters ?? doc.parameters,
            returns: markdown?.returns ?? doc.returns,
        }
    })
    const headNames = new Set(pages.filter(canHeadCategory).flatMap((doc) => [doc.name, ...readAliases(doc)]).map((name) => name.toLowerCase()))
    const categoryNames = Array.from(new Set(pages.flatMap((doc) => doc.categories))).filter((category) => !uncategorized.includes(category) && !headNames.has(category.toLowerCase()))
    const categoryPages = categoryNames.map((name) => ({ namespace: 'lovechild' as const, name, categories: [categoryCategory], synonyms: [], owners: [], parameters: [], returns: [], description: '', examples: [] }))

    return [...pages, ...categoryPages].map((doc) => {
        const title = findMarkdown(doc.namespace, doc.name)?.title
        const aliases = [...readAliases(doc), ...(title === undefined ? [] : [title])]

        return {
            ...doc,
            synonyms: Array.from(new Set([...doc.synonyms, ...aliases])).filter((synonym) => synonym !== doc.name),
            label: title ?? doc.name,
            href: getHref(doc.namespace, doc.name),
            mentionedIn: [],
            members: [],
            methods: [],
            returnedBy: [],
            acceptedBy: [],
            categoryHrefs: {},
            typeHrefs: {},
        }
    })
}

const readMarkdown = (entry: Entry) => Object.entries(markdownFiles)
    .filter(([path]) => readNamespace(path.replace('../docs', '.')) === entry.namespace && getFileName(path) === entry.name)
    .map(([, text]) => text)
    .join('\n')

const findUnique = (mentions: ReadonlyArray<Mention>) => Array.from(new Map(mentions.map((mention) => [`${mention.source}\n${mention.target}\n${mention.kind}\n${mention.text}`, mention])).values())

const linkEntries = () => {
    const unlinked = createEntries()
    const vocabulary = createVocabulary(unlinked)

    const described = unlinked.map((entry) => ({ entry, ...linkDescription(entry, vocabulary) }))
    const written = unlinked.flatMap((entry) => findWrittenMentions(entry, readMarkdown(entry), vocabulary))

    const heads = [...unlinked.filter((entry) => entry.namespace === 'strudel'), ...unlinked.filter((entry) => entry.namespace === 'lovechild')].filter(canHeadCategory)
    const categoryPages = new Map(heads.flatMap((entry) => [entry.name, ...entry.synonyms].map((name): [string, Entry] => [name.toLowerCase(), entry])))
    const findCategoryPage = (category: string) => uncategorized.includes(category) ? undefined : categoryPages.get(category.toLowerCase())
    const categorized = unlinked.flatMap((entry) => findCategoryMentions(entry, findCategoryPage))

    const found = findUnique([...written, ...categorized, ...described.flatMap((linked) => linked.mentions)])

    const references = new Map(unlinked.map((entry): [string, EntryReference] => [getEntryKey(entry), { label: entry.label, href: entry.href, kind: getEntryKind(entry) }]))

    const listSources = (entry: Entry, kinds: ReadonlyArray<MentionKind>) => {
        const keys = new Set(found.filter((mention) => mention.target === getEntryKey(entry) && kinds.includes(mention.kind)).map((mention) => mention.source))
        return Array.from(keys, (key) => references.get(key)).filter((reference): reference is EntryReference => reference !== undefined).sort((a, b) => a.label.localeCompare(b.label))
    }

    const readCategoryHrefs = (entry: Entry) => Object.fromEntries(entry.categories.flatMap((category) => {
        const page = findCategoryPage(category)
        return page && page !== entry ? [[category, page.href]] : []
    }))

    const findTypePage = (type: string) => {
        const page = vocabulary.findType(type)
        return page?.categories[0] === typeCategory ? page : undefined
    }

    const listReferences = (found: ReadonlyArray<Entry>) => found
        .map((entry) => references.get(getEntryKey(entry)))
        .filter((reference): reference is EntryReference => reference !== undefined)
        .sort((a, b) => a.label.localeCompare(b.label))

    const listTypeUsers = (entry: Entry, readTypes: (other: Entry) => ReadonlyArray<string>) => {
        if (entry.categories[0] !== typeCategory) {
            return []
        }

        return listReferences(unlinked.filter((other) => other !== entry && readTypes(other).some((type) => findTypePage(type) === entry)))
    }

    const listMethods = (entry: Entry) => {
        if (entry.categories[0] !== typeCategory) {
            return []
        }

        const names = [entry.name, ...entry.synonyms]
        return listReferences(unlinked.filter((other) => other.owners.some((owner) => names.includes(owner))))
    }

    const readTypeHrefs = (entry: Entry) => Object.fromEntries([...entry.parameters.flatMap((parameter) => parameter.types), ...entry.returns].flatMap((type) => {
        const page = vocabulary.findType(type)
        return page && page !== entry ? [[type, page.href]] : []
    }))

    const linked = described.map(({ entry, description }) => ({
        ...entry,
        description,
        mentionedIn: listSources(entry, ['link', 'prose']),
        members: listSources(entry, ['category']),
        methods: listMethods(entry),
        returnedBy: listTypeUsers(entry, (other) => other.returns),
        acceptedBy: listTypeUsers(entry, (other) => other.parameters.flatMap((parameter) => parameter.types)),
        categoryHrefs: readCategoryHrefs(entry),
        typeHrefs: readTypeHrefs(entry),
    }))

    return { entries: linked, mentions: found }
}

const linkedEntries = linkEntries()

export const entries = linkedEntries.entries

export const mentions = linkedEntries.mentions

export const functionEntries = entries.filter((entry) => !isConcept(entry) && entry.href !== getHref('lovechild', indexName))

const reservedEntry = entries.find((entry) => entry.namespace === 'lovechild' && reservedNames.includes(entry.name))

if (reservedEntry) {
    throw new Error(`${reservedEntry.name} is a reserved page name`)
}

const entriesByKey = new Map(entries.map((entry) => [getEntryKey(entry), entry]))

const readWrittenLinks = (sources: ReadonlyArray<Entry>) => {
    const keys = new Set(sources.map(getEntryKey))

    return Object.fromEntries(mentions
        .filter((mention) => mention.kind === 'link' && keys.has(mention.source))
        .flatMap((mention) => {
            const target = entriesByKey.get(mention.target)
            return target ? [[mention.text, { label: target.label, href: target.href, namespace: target.namespace, isConcept: isConcept(target) }]] : []
        }))
}

const clashingEntry = entries.find((entry, index) => entries.findIndex((other) => other.href === entry.href) !== index)

if (clashingEntry) {
    throw new Error(`${clashingEntry.name} has the same URL as another page: ${clashingEntry.href}`)
}

export const findEntry = (namespace: Namespace, pathName: string) => entries.find((entry) => entry.href === getHref(namespace, pathName))

export const listPathNames = (namespace: Namespace) => entries.filter((entry) => entry.namespace === namespace).map((entry) => getPathName(namespace, entry.name))

export const loadDocument = (namespace: Namespace, name: string): DocumentData => {
    const entry = findEntry(namespace, name)

    if (!entry) {
        error(404)
    }

    return {
        entry,
        links: readWrittenLinks([entry]),
    }
}

export const loadReference = (): ReferenceData => ({
    entries: functionEntries,
    links: readWrittenLinks(functionEntries),
})
