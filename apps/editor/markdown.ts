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
    Try: fileURLToPath(new URL('./src/lib/docs/Try.svelte', import.meta.url)),
    WikiLink: fileURLToPath(new URL('./src/lib/docs/WikiLink.svelte', import.meta.url)),
}

const linkPattern = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/

const escapeText = (text: string) => text.replace(/[&<>{}]/g, (character) => `&#${character.charCodeAt(0)};`)

const createLink = (page: string, label: string): RootContent => ({
    type: 'html',
    value: `<WikiLink page={${JSON.stringify(page)}}>${escapeText(label)}</WikiLink>`,
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
        remarkPlugins: [wikiLinks],
        highlight: { highlighter },
    }),
    {
        name: 'docs',
        markup: ({ content, filename }) => filename?.endsWith('.md') ? { code: addImports(content) } : undefined,
    },
]
