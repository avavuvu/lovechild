import { getContext, setContext } from 'svelte'

export interface DocsContext {
    readonly links: Record<string, string>
    readonly isPlayable: boolean
}

const key = Symbol('docs')

export const setDocsContext = (context: DocsContext) => setContext(key, context)

export const getDocsContext = () => getContext<DocsContext | undefined>(key)
