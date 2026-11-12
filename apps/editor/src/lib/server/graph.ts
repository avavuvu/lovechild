import { forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { getEntryKey, getEntryKind, lovechildCategories, type Kind, type Namespace } from '../docs/reference'
import { entries, listEdges } from './reference'

export interface GraphNode {
    key: string
    label: string
    namespace: Namespace
    kind: Kind
    href: string
    x: number
    y: number
    width: number
    height: number
}

export interface GraphEdge {
    key: string
    x1: number
    y1: number
    x2: number
    y2: number
}

export interface Bounds {
    x: number
    y: number
    width: number
    height: number
}

export interface Graph {
    nodes: ReadonlyArray<GraphNode>
    edges: ReadonlyArray<GraphEdge>
    bounds: Bounds
    fontSize: number
}

interface Item {
    key: string
    label: string
    namespace: Namespace
    kind: Kind
    href: string
    region: string
}

interface LayoutNode extends SimulationNodeDatum {
    item: Item
    width: number
    x: number
    y: number
}

type Pair = readonly [string, string]

const fontSize = 14
const nodeHeight = fontSize * 2
const nodeGap = 8
const regionGap = nodeHeight * 4
const rowWidth = 2400
const spread = 400
const tickCount = 300
const settleCount = 50

const routeItems: ReadonlyArray<Item> = [{ key: 'route:examples', label: 'examples', namespace: 'lovechild', kind: 'image', href: '/examples', region: 'lovechild:other' }]

const hashText = (text: string) => Array.from(text).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0

const createRandom = (seed: number) => {
    let state = seed

    return () => {
        state = (state + 0x6d2b79f5) | 0
        const mixed = Math.imul(state ^ (state >>> 15), 1 | state)
        const scrambled = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
        return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296
    }
}

const measureWidth = (label: string) => label.length * fontSize * 0.6 + fontSize

const measureBounds = (nodes: ReadonlyArray<LayoutNode>): Bounds => {
    const left = Math.min(...nodes.map((node) => node.x - node.width / 2))
    const right = Math.max(...nodes.map((node) => node.x + node.width / 2))
    const top = Math.min(...nodes.map((node) => node.y - nodeHeight / 2))
    const bottom = Math.max(...nodes.map((node) => node.y + nodeHeight / 2))
    return { x: left, y: top, width: right - left, height: bottom - top }
}

const separateNodes = (nodes: ReadonlyArray<LayoutNode>) => () => {
    nodes.forEach((first, index) => {
        nodes.slice(index + 1).forEach((second) => {
            const overlapX = (first.width + second.width) / 2 + nodeGap - Math.abs(first.x - second.x)
            const overlapY = nodeHeight + nodeGap - Math.abs(first.y - second.y)

            if (overlapX <= 0 || overlapY <= 0) {
                return
            }

            if (overlapY < overlapX) {
                const push = overlapY / 2 * (first.y < second.y ? -1 : 1)
                first.y += push
                second.y -= push
                return
            }

            const push = overlapX / 2 * (first.x < second.x ? -1 : 1)
            first.x += push
            second.x -= push
        })
    })
}

const layoutRegion = (region: string, items: ReadonlyArray<Item>, pairs: ReadonlyArray<Pair>) => {
    const nodes = items.map((item): LayoutNode => {
        const random = createRandom(hashText(item.key))
        return { item, width: measureWidth(item.label), x: (random() - 0.5) * spread, y: (random() - 0.5) * spread }
    })

    const members = new Set(items.map((item) => item.key))
    const links = pairs.filter((pair) => pair.every((key) => members.has(key))).map(([source, target]) => ({ source, target }))
    const separate = separateNodes(nodes)

    forceSimulation(nodes)
        .randomSource(createRandom(hashText(region)))
        .force('link', forceLink<LayoutNode, { source: string, target: string }>(links).id((node) => node.item.key).distance(nodeHeight * 3))
        .force('charge', forceManyBody<LayoutNode>().strength(-120).distanceMax(spread))
        .force('x', forceX<LayoutNode>(0).strength(0.05))
        .force('y', forceY<LayoutNode>(0).strength(0.05))
        .force('separate', separate)
        .stop()
        .tick(tickCount)

    Array.from({ length: settleCount }).forEach(separate)

    return nodes
}

const orderRegions = (regions: ReadonlyArray<string>) => {
    const fixed = lovechildCategories.map((category) => `lovechild:${category}`).filter((region) => regions.includes(region))
    const lovechild = regions.filter((region) => region.startsWith('lovechild:') && !fixed.includes(region)).sort()
    const strudel = regions.filter((region) => region.startsWith('strudel:')).sort()
    return [[...fixed, ...lovechild], strudel]
}

const packRows = (rows: ReadonlyArray<ReadonlyArray<ReadonlyArray<LayoutNode>>>) => {
    let y = 0

    rows.forEach((regions) => {
        let x = 0
        let rowHeight = 0

        regions.forEach((nodes) => {
            const bounds = measureBounds(nodes)

            if (x > 0 && x + bounds.width > rowWidth) {
                x = 0
                y += rowHeight + regionGap
                rowHeight = 0
            }

            nodes.forEach((node) => {
                node.x += x - bounds.x
                node.y += y - bounds.y
            })

            x += bounds.width + regionGap
            rowHeight = Math.max(rowHeight, bounds.height)
        })

        y += rowHeight + regionGap
    })
}

export const createGraph = (): Graph => {
    const items: ReadonlyArray<Item> = [
        ...entries.map((entry) => ({ key: getEntryKey(entry), label: entry.label, namespace: entry.namespace, kind: getEntryKind(entry), href: entry.href, region: `${entry.namespace}:${entry.categories[0]}` })),
        ...routeItems,
    ]

    const pairs = listEdges()
    const regions = Array.from(new Set(items.map((item) => item.region)))

    const rows = orderRegions(regions).map((row) => row.map((region) => {
        const members = items.filter((item) => item.region === region).sort((first, second) => first.key.localeCompare(second.key))
        return layoutRegion(region, members, pairs)
    }))

    packRows(rows)

    const layoutNodes = rows.flat(2)

    const nodes = layoutNodes.map(({ item, width, x, y }): GraphNode => ({
        key: item.key,
        label: item.label,
        namespace: item.namespace,
        kind: item.kind,
        href: item.href,
        x,
        y,
        width,
        height: nodeHeight,
    }))

    const positions = new Map(nodes.map((node) => [node.key, node]))

    const edges = pairs.flatMap(([source, target]): Array<GraphEdge> => {
        const start = positions.get(source)
        const end = positions.get(target)
        return start && end ? [{ key: `${source}\n${target}`, x1: start.x, y1: start.y, x2: end.x, y2: end.y }] : []
    })

    const bounds = measureBounds(layoutNodes)
    const margin = nodeHeight

    return {
        nodes,
        edges,
        bounds: { x: bounds.x - margin, y: bounds.y - margin, width: bounds.width + 2 * margin, height: bounds.height + 2 * margin },
        fontSize,
    }
}
