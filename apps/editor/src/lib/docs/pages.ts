import type { Component } from 'svelte'
import { getFileName } from '../files'
import type { EntryParameter, Namespace } from './reference'

interface PageModule {
    default: Component
    metadata?: {
        aliases?: ReadonlyArray<string>
        category?: string
        parameters?: ReadonlyArray<EntryParameter>
    }
}

export interface MarkdownPage {
    namespace: Namespace
    name: string
    component: Component
    aliases: ReadonlyArray<string>
    category: string | undefined
    parameters: ReadonlyArray<EntryParameter>
}

const modules = import.meta.glob<PageModule>('./pages/**/*.md', { eager: true })

export const readNamespace = (path: string): Namespace => path.startsWith('./pages/strudel/') ? 'strudel' : 'lovechild'

export const markdownPages: ReadonlyArray<MarkdownPage> = Object.entries(modules).map(([path, module]) => ({
    namespace: readNamespace(path),
    name: getFileName(path),
    component: module.default,
    aliases: module.metadata?.aliases ?? [],
    category: module.metadata?.category,
    parameters: module.metadata?.parameters ?? [],
}))

export const findMarkdown = (namespace: Namespace, name: string) => markdownPages.find((page) => page.namespace === namespace && page.name === name)
