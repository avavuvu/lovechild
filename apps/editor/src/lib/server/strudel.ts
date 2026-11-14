import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { marked } from 'marked'
import type { EntryParameter } from '../docs/reference'

export interface StrudelDoc {
    name: string
    categories: ReadonlyArray<string>
    synonyms: ReadonlyArray<string>
    parameters: ReadonlyArray<EntryParameter>
    returns: ReadonlyArray<string>
    description: string
    examples: ReadonlyArray<string>
}

interface Tag {
    name: string
    value: string
}

const commentPattern = /\/\*\*([\s\S]*?)\*\/\s*([^\n]*)/g
const tagPattern = /^@(\w+)\s?([\s\S]*)$/
const returnPattern = /^\{((?:[^{}]|\{[^{}]*\})*)\}/
const parameterPattern = /^(?:\{((?:[^{}]|\{[^{}]*\})*)\}\s+)?(\S+)\s*-?\s*([\s\S]*)$/
const hiddenTags = ['private', 'ignore', 'noAutocomplete']
const untagged = 'untagged'
const ignoredTags = ['superdough']
const excludedFolders = /(^|\/)(node_modules|dist|shift-parser|shift-reducer|shift-traverser)\//

const namePatterns = [
    /^(?:export\s+)?(?:const|let|var)\s+(\w+)/,
    /^(?:export\s+)?(?:async\s+)?function\*?\s+(\w+)/,
    /^\w+\.prototype\.(\w+)\s*=/,
    /^(?:async\s+)?(\w+)\s*\(/,
]

const strudelFolder = dirname(dirname(createRequire(import.meta.url).resolve('@strudel/core/package.json')))

const readSources = () => {
    if (!existsSync(strudelFolder)) {
        throw new Error('Strudel sources are missing, run bun run setup')
    }

    return readdirSync(strudelFolder, { recursive: true, encoding: 'utf8' })
        .filter((file) => file.endsWith('.mjs') && !excludedFolders.test(file))
        .sort()
        .map((file) => readFileSync(join(strudelFolder, file), 'utf8'))
}

const cleanComment = (body: string) => body.split('\n').map((line) => line.replace(/^\s*\* ?/, '')).join('\n')

const readTags = (parts: ReadonlyArray<string>): ReadonlyArray<Tag> => parts.flatMap((part) => {
    const match = part.match(tagPattern)
    return match ? [{ name: match[1], value: match[2].trim() }] : []
})

const typeSpellings: Record<string, string> = {
    Number: 'number',
    String: 'string',
    Boolean: 'boolean',
    Function: 'function',
    Object: 'object',
    '*': 'any',
}

const normalizeType = (type: string) => {
    const bare = type.replace(/^[!?]/, '')
    return typeSpellings[bare] ?? bare
}

const splitTypes = (text: string) => {
    const parts = Array.from(text.replace(/^\((.*)\)$/, '$1')).reduce((found, character) => {
        const depth = found.depth + ('<([{'.includes(character) ? 1 : 0) - ('>)]}'.includes(character) ? 1 : 0)

        if (character === '|' && found.depth === 0) {
            return { depth, parts: [...found.parts, ''] }
        }

        return { depth, parts: [...found.parts.slice(0, -1), `${found.parts.at(-1)}${character}`] }
    }, { depth: 0, parts: [''] }).parts

    return parts.map((part) => normalizeType(part.trim())).filter(Boolean)
}

const readParameter = (value: string): EntryParameter => {
    const [, type = '', written = '', description] = value.match(parameterPattern) ?? []
    const [name, fallback] = written.replace(/^\[|\]$/g, '').split('=')
    return { name, types: splitTypes(type), description: description || undefined, default: fallback }
}

const inferName = (code: string) => namePatterns.map((pattern) => code.trim().match(pattern)?.[1]).find((name) => name !== undefined)

const splitList = (values: ReadonlyArray<string>) => values.flatMap((value) => value.split(/[\s,]+/)).filter(Boolean)

const readDoc = (body: string, code: string): StrudelDoc | undefined => {
    const [description, ...parts] = `\n${cleanComment(body)}`.split(/\n(?=@)/)
    const tags = readTags(parts)
    const findValues = (name: string) => tags.filter((tag) => tag.name === name).map((tag) => tag.value)
    const name = findValues('name')[0] ?? inferName(code)

    if (!name || name.startsWith('_') || !description.trim() || tags.some((tag) => hiddenTags.includes(tag.name))) {
        return undefined
    }

    const categories = Array.from(new Set(splitList(findValues('tags')))).filter((category) => !ignoredTags.includes(category))

    return {
        name,
        categories: categories.length > 0 ? categories : [untagged],
        synonyms: splitList(findValues('synonyms')),
        parameters: findValues('param').map(readParameter),
        returns: splitTypes([...findValues('returns'), ...findValues('return')][0]?.match(returnPattern)?.[1] ?? ''),
        description: marked.parse(description.trim(), { async: false }),
        examples: findValues('example'),
    }
}

export const readStrudelDocs = (): ReadonlyArray<StrudelDoc> => {
    const docs = readSources().flatMap((text) => Array.from(text.matchAll(commentPattern), (match) => readDoc(match[1], match[2])))
    const seen = new Set<string>()

    return docs.filter((doc): doc is StrudelDoc => {
        if (!doc || seen.has(doc.name)) {
            return false
        }

        const names = [doc.name, ...doc.synonyms]
        names.forEach((name) => seen.add(name))
        return true
    })
}
