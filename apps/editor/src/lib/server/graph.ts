import { dev } from '$app/environment'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force'
import { UndirectedGraph } from 'graphology'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import louvain from 'graphology-communities-louvain'
import { getEntryKey, getEntryKind, type Kind, type Namespace } from '../docs/reference'
import type { MentionKind } from './mentions'
import { entries, mentions } from './reference'

export interface GraphNode {
    key: string
    label: string
    aliases: ReadonlyArray<string>
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
    kind: MentionKind
    isFaint: boolean
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
    aliases: ReadonlyArray<string>
    namespace: Namespace
    kind: Kind
    href: string
}

interface Edge {
    source: string
    target: string
    kind: MentionKind
    isHub: boolean
}

interface LayoutNode extends SimulationNodeDatum {
    item: Item
    width: number
    x: number
    y: number
    isFixed: boolean
}

interface Point {
    x: number
    y: number
}

interface Group extends SimulationNodeDatum {
    id: string
    radius: number
    x: number
    y: number
}

interface GroupLink extends SimulationLinkDatum<Group> {
    weight: number
}

interface Cluster extends SimulationNodeDatum {
    members: ReadonlyArray<LayoutNode>
    radius: number
    x: number
    y: number
    startX: number
    startY: number
}

interface NodeLink extends SimulationLinkDatum<LayoutNode> {
    isInside: boolean
    isCategory: boolean
}

const fontSize = 14
const nodeHeight = fontSize * 2
const nodeGap = 16
const seeds = [1, 2]
const categoryWeight = 3
const groupPadding = 0.95
const groupGravity = 0.3
const groupSpread = 1000
const communityPull = 0.25
const startSpread = 50
const insideDistance = 100
const betweenDistance = 100
const charge = -90
const chargeDistance = 250
const groupTicks = 600
const nodeTicks = 300
const settleCount = 50
const clusterGap = 150
const clusterGravity = 0.02
const clusterTicks = 300
const hubLimit = 20
const outsideGap = 200
const positionPrecision = 10

const layoutPath = join(process.cwd(), 'src', 'lib', 'server', 'graph-layout.json')

const kindStrengths: ReadonlyArray<MentionKind> = ['prose', 'link', 'category']

const routeItems: ReadonlyArray<Item> = [{ key: 'route:examples', label: 'examples', aliases: [], namespace: 'lovechild', kind: 'image', href: '/examples' }]

const listEdges = (): ReadonlyArray<Edge> => {
    const edges = new Map<string, Edge>()

    for (const mention of mentions) {
        const isOrdered = mention.source < mention.target
        const source = isOrdered ? mention.source : mention.target
        const target = isOrdered ? mention.target : mention.source
        const key = `${source}\n${target}`
        const found = edges.get(key)

        if (!found || kindStrengths.indexOf(mention.kind) > kindStrengths.indexOf(found.kind)) {
            edges.set(key, { source, target, kind: mention.kind, isHub: false })
        }
    }

    const proseCounts = new Map<string, number>()

    for (const edge of edges.values()) {
        if (edge.kind === 'prose') {
            proseCounts.set(edge.source, (proseCounts.get(edge.source) ?? 0) + 1)
            proseCounts.set(edge.target, (proseCounts.get(edge.target) ?? 0) + 1)
        }
    }

    const isHubEdge = (edge: Edge) => edge.kind === 'prose' && Math.max(proseCounts.get(edge.source) ?? 0, proseCounts.get(edge.target) ?? 0) > hubLimit
    return Array.from(edges.values(), (edge) => ({ ...edge, isHub: isHubEdge(edge) }))
}

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

const measureRadius = (node: LayoutNode) => Math.max(node.width, nodeHeight) / 2 + 20

const measureBounds = (nodes: ReadonlyArray<LayoutNode>): Bounds => {
    const left = Math.min(...nodes.map((node) => node.x - node.width / 2))
    const right = Math.max(...nodes.map((node) => node.x + node.width / 2))
    const top = Math.min(...nodes.map((node) => node.y - nodeHeight / 2))
    const bottom = Math.max(...nodes.map((node) => node.y + nodeHeight / 2))
    return { x: left, y: top, width: right - left, height: bottom - top }
}

const readFirstShare = (first: LayoutNode, second: LayoutNode) => {
    if (first.isFixed) {
        return 0
    }

    return second.isFixed ? 1 : 0.5
}

const separateNodes = (nodes: ReadonlyArray<LayoutNode>) => () => {
    nodes.forEach((first, index) => {
        nodes.slice(index + 1).forEach((second) => {
            const overlapX = (first.width + second.width) / 2 + nodeGap - Math.abs(first.x - second.x)
            const overlapY = nodeHeight + nodeGap - Math.abs(first.y - second.y)

            if (overlapX <= 0 || overlapY <= 0 || (first.isFixed && second.isFixed)) {
                return
            }

            const firstShare = readFirstShare(first, second)

            if (overlapY < overlapX) {
                const direction = first.y < second.y ? -1 : 1
                first.y += overlapY * firstShare * direction
                second.y -= overlapY * (1 - firstShare) * direction
                return
            }

            const direction = first.x < second.x ? -1 : 1
            first.x += overlapX * firstShare * direction
            second.x -= overlapX * (1 - firstShare) * direction
        })
    })
}

const isCounterClockwise = (first: Point, second: Point, third: Point) => (third.y - first.y) * (second.x - first.x) > (second.y - first.y) * (third.x - first.x)

const isCrossing = (start: Point, end: Point, otherStart: Point, otherEnd: Point) => isCounterClockwise(start, otherStart, otherEnd) !== isCounterClockwise(end, otherStart, otherEnd)
    && isCounterClockwise(start, end, otherStart) !== isCounterClockwise(start, end, otherEnd)

const countCrossings = (nodes: ReadonlyArray<LayoutNode>, edges: ReadonlyArray<Edge>) => {
    const positions = new Map(nodes.map((node) => [node.item.key, node]))
    const segments = edges.flatMap((edge) => {
        const start = positions.get(edge.source)
        const end = positions.get(edge.target)
        return start && end ? [{ edge, start, end }] : []
    })

    let crossings = 0

    for (let index = 0; index < segments.length; index++) {
        for (let otherIndex = index + 1; otherIndex < segments.length; otherIndex++) {
            const first = segments[index]
            const second = segments[otherIndex]
            const isShared = [first.edge.source, first.edge.target].some((key) => key === second.edge.source || key === second.edge.target)

            if (!isShared && isCrossing(first.start, first.end, second.start, second.end)) {
                crossings++
            }
        }
    }

    return crossings
}

const readRadius = (end: string | number | Group) => typeof end === 'object' ? end.radius : 0

const findCommunities = (items: ReadonlyArray<Item>, edges: ReadonlyArray<Edge>, random: () => number) => {
    const graph = new UndirectedGraph()

    for (const item of items) {
        graph.addNode(item.key)
    }

    for (const edge of edges) {
        if (graph.hasNode(edge.source) && graph.hasNode(edge.target) && !graph.hasEdge(edge.source, edge.target)) {
            graph.addEdge(edge.source, edge.target, { weight: edge.kind === 'category' ? categoryWeight : 1 })
        }
    }

    const communities = louvain(graph, { getEdgeWeight: 'weight', rng: random })
    return (key: string) => String(communities[key])
}

const placeGroups = (nodes: ReadonlyArray<LayoutNode>, edges: ReadonlyArray<Edge>, findGroup: (key: string) => string, random: () => number) => {
    const ids = Array.from(new Set(nodes.map((node) => findGroup(node.item.key))))

    const groups = ids.map((id): Group => {
        const members = nodes.filter((node) => findGroup(node.item.key) === id)
        const radius = Math.sqrt(members.reduce((sum, node) => sum + measureRadius(node) ** 2, 0)) * groupPadding
        return { id, radius, x: (random() - 0.5) * groupSpread, y: (random() - 0.5) * groupSpread }
    })

    const weights = new Map<string, number>()

    for (const edge of edges) {
        const pair = [findGroup(edge.source), findGroup(edge.target)].sort()

        if (pair[0] !== pair[1]) {
            weights.set(pair.join('\n'), (weights.get(pair.join('\n')) ?? 0) + 1)
        }
    }

    const links = Array.from(weights, ([key, weight]): GroupLink => {
        const [source, target] = key.split('\n')
        return { source, target, weight }
    })

    forceSimulation(groups)
        .randomSource(random)
        .force('link', forceLink<Group, GroupLink>(links).id((group) => group.id).distance((link) => readRadius(link.source) + readRadius(link.target)).strength((link) => Math.min(1, link.weight / 4)))
        .force('collide', forceCollide<Group>((group) => group.radius).iterations(4))
        .force('x', forceX<Group>(0).strength(groupGravity))
        .force('y', forceY<Group>(0).strength(groupGravity))
        .stop()
        .tick(groupTicks)

    return new Map(groups.map((group) => [group.id, group]))
}

const spreadClusters = (nodes: ReadonlyArray<LayoutNode>, findGroup: (key: string) => string) => {
    const ids = Array.from(new Set(nodes.map((node) => findGroup(node.item.key))))

    const clusters = ids.map((id): Cluster => {
        const members = nodes.filter((node) => findGroup(node.item.key) === id)
        const x = members.reduce((sum, node) => sum + node.x, 0) / members.length
        const y = members.reduce((sum, node) => sum + node.y, 0) / members.length
        const radius = Math.max(...members.map((node) => Math.hypot(node.x - x, node.y - y) + node.width / 2))
        return { members, radius, x, y, startX: x, startY: y }
    })

    forceSimulation(clusters)
        .force('collide', forceCollide<Cluster>((cluster) => cluster.radius + clusterGap / 2).iterations(4))
        .force('x', forceX<Cluster>(0).strength(clusterGravity))
        .force('y', forceY<Cluster>(0).strength(clusterGravity))
        .stop()
        .tick(clusterTicks)

    for (const cluster of clusters) {
        for (const member of cluster.members) {
            member.x += cluster.x - cluster.startX
            member.y += cluster.y - cluster.startY
        }
    }
}

const layoutOnce = (items: ReadonlyArray<Item>, edges: ReadonlyArray<Edge>, seed: number) => {
    const random = createRandom(seed)
    const findGroup = findCommunities(items, edges, random)
    const sized = items.map((item): LayoutNode => ({ item, width: measureWidth(item.label), x: 0, y: 0, isFixed: false }))
    const groups = placeGroups(sized, edges, findGroup, random)
    const findCentre = (node: LayoutNode) => groups.get(findGroup(node.item.key)) ?? { x: 0, y: 0 }

    const nodes = sized.map((node) => ({ ...node, x: findCentre(node).x + (random() - 0.5) * startSpread, y: findCentre(node).y + (random() - 0.5) * startSpread }))

    const links = edges.map((edge): NodeLink => ({
        source: edge.source,
        target: edge.target,
        isInside: findGroup(edge.source) === findGroup(edge.target),
        isCategory: edge.kind === 'category',
    }))

    const separate = separateNodes(nodes)

    forceSimulation(nodes)
        .randomSource(random)
        .force('charge', forceManyBody<LayoutNode>().strength(charge).distanceMax(chargeDistance))
        .force('link', forceLink<LayoutNode, NodeLink>(links).id((node) => node.item.key).distance((link) => link.isInside ? insideDistance : betweenDistance).strength((link) => {
            if (!link.isInside) {
                return 0.02
            }

            return link.isCategory ? 0.6 : 0.3
        }))
        .force('x', forceX<LayoutNode>((node) => findCentre(node).x).strength(communityPull))
        .force('y', forceY<LayoutNode>((node) => findCentre(node).y).strength(communityPull))
        .force('collide', forceCollide<LayoutNode>(measureRadius))
        .stop()
        .tick(nodeTicks)

    Array.from({ length: settleCount }).forEach(separate)
    spreadClusters(nodes, findGroup)

    return nodes
}

const layoutFresh = (items: ReadonlyArray<Item>, edges: ReadonlyArray<Edge>) => seeds
    .map((seed) => {
        const nodes = layoutOnce(items, edges, seed)
        return { nodes, crossings: countCrossings(nodes, edges) }
    })
    .sort((a, b) => a.crossings - b.crossings)[0].nodes

const findAnchor = (node: LayoutNode, edges: ReadonlyArray<Edge>, placed: Map<string, LayoutNode>, bounds: Bounds, random: () => number): Point => {
    const neighbours = edges.flatMap((edge) => {
        const other = edge.source === node.item.key ? edge.target : edge.target === node.item.key ? edge.source : undefined
        const found = other === undefined ? undefined : placed.get(other)
        return found ? [found] : []
    })

    if (neighbours.length === 0) {
        return { x: bounds.x + bounds.width + outsideGap, y: bounds.y + random() * bounds.height }
    }

    return {
        x: neighbours.reduce((sum, neighbour) => sum + neighbour.x, 0) / neighbours.length,
        y: neighbours.reduce((sum, neighbour) => sum + neighbour.y, 0) / neighbours.length,
    }
}

const placeNewNodes = (items: ReadonlyArray<Item>, edges: ReadonlyArray<Edge>, saved: Map<string, Point>) => {
    const nodes = items.map((item): LayoutNode => {
        const point = saved.get(item.key)
        return { item, width: measureWidth(item.label), x: point?.x ?? 0, y: point?.y ?? 0, isFixed: point !== undefined }
    })

    const fixed = nodes.filter((node) => node.isFixed)
    const fresh = nodes.filter((node) => !node.isFixed)

    if (fresh.length === 0) {
        return nodes
    }

    const placed = new Map(fixed.map((node) => [node.item.key, node]))
    const bounds = measureBounds(fixed)

    for (const node of fresh) {
        const random = createRandom(hashText(node.item.key))
        const anchor = findAnchor(node, edges, placed, bounds, random)
        node.x = anchor.x + (random() - 0.5) * startSpread
        node.y = anchor.y + (random() - 0.5) * startSpread
    }

    for (const node of fixed) {
        node.fx = node.x
        node.fy = node.y
    }

    const links = edges.map((edge): NodeLink => ({ source: edge.source, target: edge.target, isInside: true, isCategory: edge.kind === 'category' }))

    forceSimulation(nodes)
        .randomSource(createRandom(seeds[0]))
        .force('charge', forceManyBody<LayoutNode>().strength(charge).distanceMax(chargeDistance))
        .force('link', forceLink<LayoutNode, NodeLink>(links).id((node) => node.item.key).distance(insideDistance).strength((link) => link.isCategory ? 0.6 : 0.3))
        .force('collide', forceCollide<LayoutNode>(measureRadius))
        .stop()
        .tick(nodeTicks)

    Array.from({ length: settleCount }).forEach(separateNodes(nodes))

    return nodes
}

const readLayout = (): Map<string, Point> => {
    if (!existsSync(layoutPath)) {
        return new Map()
    }

    const saved: Record<string, [number, number]> = JSON.parse(readFileSync(layoutPath, 'utf8'))
    return new Map(Object.entries(saved).map(([key, [x, y]]): [string, Point] => [key, { x, y }]))
}

const roundPosition = (value: number) => Math.round(value * positionPrecision) / positionPrecision

const writeLayout = (nodes: ReadonlyArray<LayoutNode>) => {
    const lines = nodes.map((node) => `    ${JSON.stringify(node.item.key)}: [${roundPosition(node.x)}, ${roundPosition(node.y)}]`).sort()
    writeFileSync(layoutPath, `{\n${lines.join(',\n')}\n}\n`)
}

const createGraph = (layoutNodes: ReadonlyArray<LayoutNode>, edges: ReadonlyArray<Edge>): Graph => {
    const nodes = layoutNodes.map(({ item, width, x, y }): GraphNode => ({
        key: item.key,
        label: item.label,
        aliases: item.aliases,
        namespace: item.namespace,
        kind: item.kind,
        href: item.href,
        x,
        y,
        width,
        height: nodeHeight,
    }))

    const positions = new Map(nodes.map((node) => [node.key, node]))

    const graphEdges = edges.flatMap(({ source, target, kind, isHub }): Array<GraphEdge> => {
        const start = positions.get(source)
        const end = positions.get(target)
        return start && end ? [{ key: `${source}\n${target}`, kind, isFaint: isHub, x1: start.x, y1: start.y, x2: end.x, y2: end.y }] : []
    })

    const bounds = measureBounds(layoutNodes)
    const margin = nodeHeight

    return {
        nodes,
        edges: graphEdges,
        bounds: { x: bounds.x - margin, y: bounds.y - margin, width: bounds.width + 2 * margin, height: bounds.height + 2 * margin },
        fontSize,
    }
}

export const getGraph = () => {
    const items: ReadonlyArray<Item> = [
        ...entries.map((entry) => ({ key: getEntryKey(entry), label: entry.label, aliases: entry.synonyms.filter((synonym) => synonym !== entry.label), namespace: entry.namespace, kind: getEntryKind(entry), href: entry.href })),
        ...routeItems,
    ]

    const known = new Set(items.map((item) => item.key))
    const edges = listEdges().filter((edge) => known.has(edge.source) && known.has(edge.target))
    const layoutEdges = edges.filter((edge) => !edge.isHub)
    const saved = readLayout()
    const nodes = saved.size > 0 ? placeNewNodes(items, layoutEdges, saved) : layoutFresh(items, layoutEdges)
    const isChanged = nodes.length !== saved.size || nodes.some((node) => !saved.has(node.item.key))

    if (dev && isChanged) {
        writeLayout(nodes)
    }

    return createGraph(nodes, edges)
}
