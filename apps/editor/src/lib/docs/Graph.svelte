<script lang="ts">
    import { select } from 'd3-selection'
    import 'd3-transition'
    import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from 'd3-zoom'
    import type { Graph, GraphEdge, GraphNode } from '$lib/server/graph'
    import { isSearchMatch, loadGraph } from './graph-data'

    let { current, isVisible, isInteractive, search = '', focus }: {
        current: string
        isVisible: boolean
        isInteractive: boolean
        search?: string
        focus?: string
    } = $props()

    const readableZoom = 1
    const cameraDuration = 700

    let svg: SVGSVGElement
    let graph: Graph | undefined = $state.raw()
    let transform = $state('')
    let behavior: ZoomBehavior<SVGSVGElement, unknown> | undefined = $state.raw()
    let isRequested = false
    let lastFocus: string | undefined

    const focusHref = $derived(focus ?? current)

    const createPath = (edges: ReadonlyArray<GraphEdge>, isFaint: boolean) => edges
        .filter((edge) => edge.isFaint === isFaint)
        .map((edge) => `M${edge.x1} ${edge.y1}L${edge.x2} ${edge.y2}`)
        .join('')

    const paths = $derived(graph && { strong: createPath(graph.edges, false), faint: createPath(graph.edges, true) })

    const findCentre = (nodes: ReadonlyArray<GraphNode>) => ({
        x: (Math.min(...nodes.map((node) => node.x)) + Math.max(...nodes.map((node) => node.x))) / 2,
        y: (Math.min(...nodes.map((node) => node.y)) + Math.max(...nodes.map((node) => node.y))) / 2,
    })

    const findFocus = (nodes: ReadonlyArray<GraphNode>) => nodes.find((node) => node.href === focusHref) ?? findCentre(nodes.filter((node) => node.namespace === 'lovechild'))

    const createView = (point: { x: number, y: number }, scale: number) => zoomIdentity
        .translate(svg.clientWidth / 2 - scale * point.x, svg.clientHeight / 2 - scale * point.y)
        .scale(scale)

    const readDuration = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : cameraDuration

    const isSearching = $derived(search.trim() !== '')

    const showGraph = async () => {
        const found = await loadGraph()
        const created = zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.05, 8])
            .clickDistance(4)
            .on('zoom', (event) => {
                transform = event.transform.toString()
            })

        select(svg).call(created).call(created.transform, createView(findFocus(found.nodes), readableZoom))
        lastFocus = focusHref
        behavior = created
        graph = found
    }

    $effect(() => {
        const href = focusHref
        const node = graph?.nodes.find((found) => found.href === href)

        if (!behavior || href === lastFocus) {
            return
        }

        lastFocus = href

        if (node) {
            select(svg)
                .transition()
                .duration(readDuration())
                .call(behavior.transform, createView(node, zoomTransform(svg).k))
        }
    })

    $effect(() => {
        if (isVisible && !isRequested) {
            isRequested = true
            showGraph()
        }
    })
</script>

<svg class:interactive={isInteractive} class:hidden={!isVisible} bind:this={svg}>
    {#if graph}
        <g {transform} font-size={graph.fontSize}>
            {#if paths}
                <path class="edges faint" d={paths.faint} />
                <path class="edges" d={paths.strong} />
            {/if}
            {#each graph.nodes as node (node.key)}
                <a href={node.href} class={node.kind} class:current={node.href === focusHref} class:dimmed={isSearching && !isSearchMatch(node, search)}>
                    <rect x={node.x - node.width / 2} y={node.y - node.height / 2} width={node.width} height={node.height} />
                    <text x={node.x} y={node.y}>{node.label}</text>
                </a>
            {/each}
        </g>
    {/if}
</svg>

<style>
    svg {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        contain: strict;
        pointer-events: none;
        user-select: none;
    }

    svg.hidden {
        display: none;
    }

    svg.interactive {
        pointer-events: auto;
        touch-action: none;
        cursor: grab;
    }

    .edges {
        fill: none;
        stroke: var(--color-background);
        vector-effect: non-scaling-stroke;
    }

    .faint {
        stroke-opacity: 0.25;
    }

    rect {
        fill: var(--color-background);
        stroke: var(--color-border);
        vector-effect: non-scaling-stroke;
    }

    text {
        fill: var(--kind-color);
        text-anchor: middle;
        dominant-baseline: central;
    }

    .dimmed {
        opacity: 0.2;
    }

    a:hover rect,
    a:focus-visible rect,
    .current rect {
        fill: var(--color-foreground);
    }
</style>
