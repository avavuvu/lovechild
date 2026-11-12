<script lang="ts">
    import { select } from 'd3-selection'
    import { zoom, zoomIdentity } from 'd3-zoom'
    import type { Graph, GraphNode } from '$lib/server/graph'

    let { current, isVisible, isInteractive }: { current: string, isVisible: boolean, isInteractive: boolean } = $props()

    const readableZoom = 1

    let svg: SVGSVGElement
    let graph: Graph | undefined = $state.raw()
    let transform = $state('')
    let isRequested = false

    const findCentre = (nodes: ReadonlyArray<GraphNode>) => ({
        x: (Math.min(...nodes.map((node) => node.x)) + Math.max(...nodes.map((node) => node.x))) / 2,
        y: (Math.min(...nodes.map((node) => node.y)) + Math.max(...nodes.map((node) => node.y))) / 2,
    })

    const findFocus = (nodes: ReadonlyArray<GraphNode>) => nodes.find((node) => node.href === current) ?? findCentre(nodes.filter((node) => node.namespace === 'lovechild'))

    const loadGraph = async () => {
        const response = await fetch('/graph.json')
        const found: Graph = await response.json()
        const behavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.05, 8])
            .clickDistance(4)
            .on('zoom', (event) => {
                transform = event.transform.toString()
            })

        const focus = findFocus(found.nodes)
        const start = zoomIdentity.translate(svg.clientWidth / 2 - readableZoom * focus.x, svg.clientHeight / 2 - readableZoom * focus.y).scale(readableZoom)

        select(svg).call(behavior).call(behavior.transform, start)
        graph = found
    }

    $effect(() => {
        if (isVisible && !isRequested) {
            isRequested = true
            loadGraph()
        }
    })
</script>

<svg class:interactive={isInteractive} class:hidden={!isVisible} bind:this={svg}>
    {#if graph}
        <g {transform} font-size={graph.fontSize}>
            {#each graph.edges as edge (edge.key)}
                <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} />
            {/each}
            {#each graph.nodes as node (node.key)}
                <a href={node.href} class={node.kind} class:current={node.href === current}>
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

    line {
        stroke: var(--color-background);
        vector-effect: non-scaling-stroke;
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

    a:hover rect,
    a:focus-visible rect,
    .current rect {
        fill: var(--color-foreground);
    }
</style>
