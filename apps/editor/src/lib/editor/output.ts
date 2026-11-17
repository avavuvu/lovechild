import type { Graph, Pass, Uniform } from '@lovechild/strudel'
import type { OutputDisplay } from './displays'

export interface Output {
    transpiled: string
    graph: Graph | undefined
}

const describeTarget = (pass: Pass) => pass.target.kind === 'screen' ? 'screen' : `${pass.target.kind} ${pass.target.index}`

const describeValue = (value: Uniform['value']) => {
    if (typeof value === 'number') {
        return String(value)
    }

    if (typeof value === 'string') {
        return JSON.stringify(value)
    }

    return JSON.stringify(value.queryArc(0, 1).map((hap) => hap.value))
}

const formatShaders = (graph: Graph | undefined) => {
    if (!graph) {
        return ''
    }

    const uniforms = graph.uniforms.map((uniform) => `// ${uniform.name} = ${describeValue(uniform.value)}`)
    const passes = graph.passes.map((pass) => `// ${describeTarget(pass)}\n${pass.source}`)
    return [uniforms.join('\n'), ...passes].join('\n\n')
}

const formatCode = async (code: string) => {
    const [{ format }, babel, estree] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
    ])

    try {
        return await format(code, { parser: 'babel', plugins: [babel, estree], semi: false, singleQuote: true, tabWidth: 4 })
    } catch {
        return code
    }
}

export const formatOutput = async (display: OutputDisplay, { transpiled, graph }: Output) => {
    if (display === 'javascript') {
        return formatCode(transpiled)
    }

    return formatShaders(graph)
}
