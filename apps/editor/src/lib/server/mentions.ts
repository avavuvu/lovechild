import { conceptCategory, getEntryKey, typeCategory, isConcept, strudelPrefix, type Entry, type Namespace } from '../docs/reference'
import { proseLinks } from './prose-links'

export type MentionKind = 'link' | 'prose' | 'category'

export interface Mention {
    source: string
    target: string
    kind: MentionKind
    text: string
}

export interface Vocabulary {
    findEntry: (written: string, namespace: Namespace) => Entry | undefined
    findFunction: (written: string, namespace: Namespace) => Entry | undefined
    findConcept: (word: string) => Entry | undefined
    findType: (word: string) => Entry | undefined
    conceptPattern: RegExp | undefined
}

interface Range {
    start: number
    end: number
    entry: Entry
}

const wikiLinkPattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
const disambiguationPattern = /<Disambig\s+page="([^"]+)"/g
const tagPattern = /(<[^>]*>)/
const codeNamePattern = /^\.?([\w$]+)(?:\(\))?$/
const seeAlsoPattern = /see also:?\s+([^.;:!?]*)/gi
const callTextPattern = /(?<![\w$.&#;])\.?[A-Za-z_$][\w$]*\(\)/g
const bareWordPattern = /(?<![&#;\w$.])[A-Za-z_$][\w$]+/g
const listWordPattern = /(?<![&#])[\w$]+(?:\(\))?/g
const listJoiners = ['and', 'or']
const blockingTags = ['a', 'pre']

const readNames = (entry: Entry) => [entry.name, ...entry.synonyms]

const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const createSingulars = (word: string) => {
    if (word.endsWith('ies')) {
        return [`${word.slice(0, -3)}y`]
    }

    if (word.endsWith('es')) {
        return [word.slice(0, -2), word.slice(0, -1)]
    }

    return word.endsWith('s') ? [word.slice(0, -1)] : []
}

const createPlurals = (word: string) => [`${word}s`, `${word}es`, ...(/[^aeiou]y$/.test(word) ? [`${word.slice(0, -1)}ies`] : [])]

const createVariants = (name: string) => {
    const singulars = [name.toLowerCase(), ...createSingulars(name.toLowerCase())]
    return Array.from(new Set([...singulars, ...singulars.flatMap(createPlurals)]))
}

const createLookups = (entries: ReadonlyArray<Entry>) => {
    const exact = new Map(entries.flatMap((entry) => readNames(entry).map((name): [string, Entry] => [name, entry])))
    const lowerCase = new Map(Array.from(exact).reverse().map(([name, entry]): [string, Entry] => [name.toLowerCase(), entry]))
    const variants = new Map(Array.from(exact).reverse().flatMap(([name, entry]) => createVariants(name).map((variant): [string, Entry] => [variant, entry])))
    return { exact, lowerCase, variants }
}

const createFinder = (entries: ReadonlyArray<Entry>, isLoose: boolean) => {
    const lookups = {
        lovechild: createLookups(entries.filter((entry) => entry.namespace === 'lovechild')),
        strudel: createLookups(entries.filter((entry) => entry.namespace === 'strudel')),
    }

    return (written: string, namespace: Namespace) => {
        const trimmed = written.trim()
        const name = trimmed.replace(/^\./, '').replace(/\(\)$/, '')
        const isCall = trimmed.endsWith('()')

        if (name.startsWith(strudelPrefix)) {
            const unprefixed = name.slice(strudelPrefix.length)
            return lookups.strudel.exact.get(unprefixed) ?? lookups.strudel.lowerCase.get(unprefixed.toLowerCase())
        }

        const order = namespace === 'strudel' ? [lookups.strudel, lookups.lovechild] : [lookups.lovechild, lookups.strudel]
        const found = order.map((lookup) => lookup.exact.get(name)).find(Boolean) ?? order.map((lookup) => lookup.lowerCase.get(name.toLowerCase())).find(Boolean)

        if (found || isCall || !isLoose) {
            return found
        }

        return order.map((lookup) => lookup.variants.get(name.toLowerCase())).find(Boolean)
    }
}

export const createVocabulary = (entries: ReadonlyArray<Entry>): Vocabulary => {
    const createWordMap = (category: string) => new Map(entries.filter((entry) => entry.categories[0] === category).flatMap((entry) => readNames(entry).flatMap(createVariants).map((word): [string, Entry] => [word, entry])))
    const types = createWordMap(typeCategory)
    const concepts = new Map([...createWordMap(conceptCategory), ...types])
    const words = Array.from(concepts.keys()).sort((a, b) => b.length - a.length).map(escapePattern)
    const findFunction = createFinder(entries.filter((entry) => !isConcept(entry)), false)

    for (const name of Object.entries(proseLinks).flatMap(([source, linked]) => [source, ...linked])) {
        if (!findFunction(name, 'strudel')) {
            throw new Error(`${name} in prose-links.ts is not a Strudel function`)
        }
    }

    return {
        findEntry: createFinder(entries, true),
        findFunction,
        findConcept: (word) => concepts.get(word.toLowerCase()),
        findType: (word) => types.get(word.toLowerCase()) ?? concepts.get(word.toLowerCase()),
        conceptPattern: words.length > 0 ? new RegExp(`(?<![&#])\\b(?:${words.join('|')})\\b`, 'gi') : undefined,
    }
}

const createMention = (source: Entry, target: Entry | undefined, kind: MentionKind, text: string): Array<Mention> => {
    if (!target || target === source) {
        return []
    }

    return [{ source: getEntryKey(source), target: getEntryKey(target), kind, text }]
}

export const findCategoryMentions = (source: Entry, findCategoryPage: (category: string) => Entry | undefined): ReadonlyArray<Mention> => source.categories
    .flatMap((category) => createMention(source, findCategoryPage(category), 'category', category))

export const findWrittenMentions = (source: Entry, markdown: string, vocabulary: Vocabulary): ReadonlyArray<Mention> => {
    const links = [wikiLinkPattern, disambiguationPattern].flatMap((pattern) => Array.from(markdown.matchAll(pattern), (match) => match[1].trim()))
    return links.flatMap((text) => createMention(source, vocabulary.findEntry(text, source.namespace), 'link', text))
}

const findSeeAlsoRanges = (text: string, source: Entry, vocabulary: Vocabulary): ReadonlyArray<Range> => Array.from(text.matchAll(seeAlsoPattern)).flatMap((match) => {
    const listStart = match.index + match[0].length - match[1].length

    return Array.from(match[1].matchAll(listWordPattern)).flatMap((word): Array<Range> => {
        const entry = listJoiners.includes(word[0].toLowerCase()) ? undefined : vocabulary.findFunction(word[0], source.namespace)
        const start = listStart + word.index
        return entry && entry !== source ? [{ start, end: start + word[0].length, entry }] : []
    })
})

const isOverlapping = (range: Range, ranges: ReadonlyArray<Range>) => ranges.some((other) => range.start < other.end && other.start < range.end)

const findWordRanges = (text: string, pattern: RegExp | undefined, findWord: (word: string) => Entry | undefined, source: Entry, taken: ReadonlyArray<Range>, linked: Set<Entry>) => {
    const ranges = [...taken]

    if (!pattern) {
        return ranges
    }

    for (const match of text.matchAll(pattern)) {
        const entry = findWord(match[0])
        const range = entry && { start: match.index, end: match.index + match[0].length, entry }

        if (!range || range.entry === source || linked.has(range.entry) || isOverlapping(range, ranges)) {
            continue
        }

        linked.add(range.entry)
        ranges.push(range)
    }

    return ranges
}

const createAnchor = (entry: Entry, content: string) => `<a href="${entry.href}">${content}</a>`

const isCall = (content: string) => content.endsWith('()')

const createProseAnchor = (entry: Entry, content: string) => isCall(content) ? `<code>${createAnchor(entry, content)}</code>` : createAnchor(entry, content)

const wrapCalls = (text: string) => text.replace(callTextPattern, '<code>$&</code>')

const linkText = (text: string, source: Entry, vocabulary: Vocabulary, linked: Set<Entry>) => {
    const listed = findSeeAlsoRanges(text, source, vocabulary)
    const conceptual = findWordRanges(text, vocabulary.conceptPattern, vocabulary.findConcept, source, listed, linked)
    const listedWords = source.namespace === 'strudel' ? proseLinks[source.name] ?? [] : []
    const findListedWord = (word: string) => listedWords.includes(word) ? vocabulary.findFunction(word, source.namespace) : undefined
    const ranges = findWordRanges(text, bareWordPattern, findListedWord, source, conceptual, linked)
        .sort((a, b) => a.start - b.start)
    const html = ranges.reduce((found, range) => ({
        html: `${found.html}${wrapCalls(text.slice(found.end, range.start))}${createProseAnchor(range.entry, text.slice(range.start, range.end))}`,
        end: range.end,
    }), { html: '', end: 0 })

    return {
        html: `${html.html}${wrapCalls(text.slice(html.end))}`,
        mentions: ranges.flatMap((range) => createMention(source, range.entry, 'prose', text.slice(range.start, range.end))),
    }
}

const readTagName = (tag: string) => tag.match(/^<\/?([a-z0-9]+)/i)?.[1].toLowerCase()

export const linkDescription = (source: Entry, vocabulary: Vocabulary) => {
    const parts = source.description.split(tagPattern)
    const mentions: Array<Mention> = []
    const linked = new Set<Entry>()
    let blockingDepth = 0
    let isInCode = false

    const linkedParts = parts.map((part, index) => {
        const isTag = index % 2 === 1

        if (isTag) {
            const name = readTagName(part)
            const isClosing = part.startsWith('</')

            if (name && blockingTags.includes(name)) {
                blockingDepth += isClosing ? -1 : 1
            }

            if (name === 'code') {
                isInCode = !isClosing
            }

            return part
        }

        if (blockingDepth > 0 || part === '') {
            return part
        }

        if (isInCode) {
            const name = part.match(codeNamePattern)?.[1]
            const entry = name === undefined ? undefined : vocabulary.findFunction(name, source.namespace)
            const found = createMention(source, entry, 'prose', part)
            mentions.push(...found)
            return entry && found.length > 0 ? createAnchor(entry, part) : part
        }

        const result = linkText(part, source, vocabulary, linked)
        mentions.push(...result.mentions)
        return result.html
    })

    return { description: linkedParts.join(''), mentions }
}
