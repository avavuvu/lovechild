import type { Graph, GraphNode } from '$lib/server/graph'

export interface SearchMatch {
    node: GraphNode
    alias: string | undefined
}

let request: Promise<Graph> | undefined

export const loadGraph = () => {
    request ??= fetch('/graph.json').then((response) => response.json())
    return request
}

const isPartOf = (text: string, search: string) => text.toLowerCase().includes(search.trim().toLowerCase())

export const findSearchMatch = (node: GraphNode, search: string): SearchMatch | undefined => {
    if (isPartOf(node.label, search)) {
        return { node, alias: undefined }
    }

    const alias = node.aliases.find((found) => isPartOf(found, search))
    return alias === undefined ? undefined : { node, alias }
}

export const isSearchMatch = (node: GraphNode, search: string) => findSearchMatch(node, search) !== undefined
