import { getContext, setContext } from 'svelte'
import type { Links } from './reference'

export interface DocsContext {
    readonly links: Links
    readonly isPlayable: boolean
}

const key = Symbol('docs')

export const setDocsContext = (context: DocsContext) => setContext(key, context)

export const getDocsContext = () => getContext<DocsContext | undefined>(key)
