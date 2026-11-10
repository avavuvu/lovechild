import type { Operation } from '../operation'

type Layer = Map<Operation, Map<string, string>>

export const createCache = () => {
    const layers: Array<Layer> = [new Map()]

    const findVariable = (operation: Operation, key: string) => {
        for (const layer of [...layers].reverse()) {
            const variable = layer.get(operation)?.get(key)

            if (variable !== undefined) {
                return variable
            }
        }

        return undefined
    }

    const storeVariable = (operation: Operation, key: string, variable: string) => {
        const layer = layers[layers.length - 1]
        const entries = layer.get(operation) ?? new Map<string, string>()
        entries.set(key, variable)
        layer.set(operation, entries)
    }

    const runIsolated = <Result>(run: () => Result) => {
        layers.push(new Map())
        const result = run()
        layers.pop()
        return result
    }

    return { findVariable, storeVariable, runIsolated }
}
