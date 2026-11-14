import type { RootContent } from 'mdast'
import { mdsvex } from 'mdsvex'
import { fileURLToPath } from 'node:url'
import type { PreprocessorGroup } from 'svelte/compiler'

type Eat = (text: string) => (node: RootContent) => RootContent

interface Tokenizer {
    (eat: Eat, value: string, silent?: boolean): RootContent | boolean | undefined
    locator?: (value: string, from: number) => number
}

interface Parser {
    prototype: {
        inlineTokenizers: Record<string, Tokenizer>
        inlineMethods: Array<string>
    }
}

const components = {
    Try: fileURLToPath(new URL('./src/lib/docs/markdown/Try.svelte', import.meta.url)),
    WikiLink: fileURLToPath(new URL('./src/lib/docs/markdown/WikiLink.svelte', import.meta.url)),
    Disambig: fileURLToPath(new URL('./src/lib/docs/markdown/Disambig.svelte', import.meta.url)),
    Hydra: fileURLToPath(new URL('./src/lib/docs/markdown/Hydra.svelte', import.meta.url)),
    Wikipedia: fileURLToPath(new URL('./src/lib/docs/markdown/Wikipedia.svelte', import.meta.url)),
}

const linkPattern = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/
const callPattern = /^\.?[A-Za-z_$][\w$]*\(\)/
const callSearch = /\.?[A-Za-z_$][\w$]*\(\)/

const escapeText = (text: string) => text.replace(/[&<>{}]/g, (character) => `&#${character.charCodeAt(0)};`)

const createLink = (page: string, label: string): RootContent => ({
    type: 'html',
    value: `<WikiLink page={${JSON.stringify(page)}} label={${JSON.stringify(label)}} />`,
})

const wikiLinks = function (this: { Parser: Parser }) {
    const { inlineTokenizers, inlineMethods } = this.Parser.prototype

    const tokenize: Tokenizer = (eat, value, silent) => {
        const match = linkPattern.exec(value)

        if (!match) {
            return undefined
        }

        if (silent) {
            return true
        }

        const [whole, page, label] = match
        return eat(whole)(createLink(page.trim(), (label ?? page).trim()))
    }

    tokenize.locator = (value, from) => value.indexOf('[[', from)
    inlineTokenizers.wikiLink = tokenize
    inlineMethods.splice(inlineMethods.indexOf('link'), 0, 'wikiLink')
}

const callNames = function (this: { Parser: Parser }) {
    const { inlineTokenizers, inlineMethods } = this.Parser.prototype

    const tokenize: Tokenizer = (eat, value, silent) => {
        const match = callPattern.exec(value)

        if (!match) {
            return undefined
        }

        if (silent) {
            return true
        }

        return eat(match[0])({ type: 'inlineCode', value: match[0] })
    }

    tokenize.locator = (value, from) => {
        const index = value.slice(from).search(callSearch)
        return index === -1 ? -1 : from + index
    }

    inlineTokenizers.callName = tokenize
    inlineMethods.splice(inlineMethods.indexOf('text'), 0, 'callName')
}

const highlighter = (code: string, language: string | null | undefined) => {
    if (language === 'lovechild') {
        return `<Try code={${JSON.stringify(code)}} />`
    }

    return `<pre><code>${escapeText(code)}</code></pre>`
}

const addImports = (content: string) => {
    const modern = content.replaceAll('<script context="module">', '<script module>')
    const imports = Object.entries(components)
        .filter(([name]) => modern.includes(`<${name} `))
        .map(([name, path]) => `import ${name} from ${JSON.stringify(path)}`)

    if (imports.length === 0) {
        return modern
    }

    const instance = /<script(?![^>]*\bmodule\b)[^>]*>/.exec(modern)

    if (!instance) {
        return `<script>\n${imports.join('\n')}\n</script>\n${modern}`
    }

    const end = instance.index + instance[0].length
    return `${modern.slice(0, end)}\n${imports.join('\n')}${modern.slice(end)}`
}

export const markdown = (): Array<PreprocessorGroup> => [
    mdsvex({
        extensions: ['.md'],
        smartypants: false,
        remarkPlugins: [wikiLinks, callNames],
        highlight: { highlighter },
    }),
    {
        name: 'docs',
        markup: ({ content, filename }) => filename?.endsWith('.md') ? { code: addImports(content) } : undefined,
    },
]
