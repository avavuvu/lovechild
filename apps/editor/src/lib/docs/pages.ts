import type { Component } from 'svelte'
import { getFileName } from '../files'
import type { EntryParameter, Namespace } from './reference'

interface PageModule {
    default: Component
    metadata?: {
        title?: string
        aliases?: ReadonlyArray<string>
        category?: string | ReadonlyArray<string>
        parameters?: ReadonlyArray<EntryParameter>
        returns?: string | ReadonlyArray<string>
    }
}

export interface MarkdownPage {
    namespace: Namespace
    name: string
    component: Component
    title: string | undefined
    aliases: ReadonlyArray<string>
    categories: ReadonlyArray<string>
    parameters: ReadonlyArray<EntryParameter> | undefined
    returns: ReadonlyArray<string> | undefined
}

const modules = import.meta.glob<PageModule>('./pages/**/*.md', { eager: true })

const readList = (category: string | ReadonlyArray<string> | undefined): ReadonlyArray<string> => {
    if (category === undefined) {
        return []
    }

    return typeof category === 'string' ? [category] : category
}

export const readNamespace = (path: string): Namespace => path.startsWith('./pages/strudel/') ? 'strudel' : 'lovechild'

export const markdownPages: ReadonlyArray<MarkdownPage> = Object.entries(modules).map(([path, module]) => ({
    namespace: readNamespace(path),
    name: getFileName(path),
    component: module.default,
    title: module.metadata?.title,
    aliases: module.metadata?.aliases ?? [],
    categories: readList(module.metadata?.category),
    parameters: module.metadata?.parameters,
    returns: module.metadata?.returns === undefined ? undefined : readList(module.metadata.returns),
}))

export const findMarkdown = (namespace: Namespace, name: string) => markdownPages.find((page) => page.namespace === namespace && page.name === name)
