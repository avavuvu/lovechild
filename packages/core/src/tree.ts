import { Chain, isChain } from './chain'
import type { Operation, Parameter } from './operation'

export const getParameterOperations = (parameters: ReadonlyArray<Parameter>) => parameters.filter(isChain).map((chain) => chain.operation)

export const getChildren = (operation: Operation): ReadonlyArray<Operation> => {
    switch (operation.kind) {
        case 'previous':
        case 'media': {
            return []
        }
        case 'feedback':
        case 'swizzle': {
            return [operation.input]
        }
        case 'source': {
            return getParameterOperations(operation.parameters)
        }
        case 'coordinate':
        case 'color':
        case 'split': {
            return [operation.input, ...getParameterOperations(operation.parameters)]
        }
        case 'combine': {
            return [operation.input, operation.other, ...getParameterOperations(operation.parameters)]
        }
        case 'select': {
            return [...operation.options, ...getParameterOperations(operation.parameters)]
        }
    }
}

export const hasFreePrevious = (operation: Operation): boolean => {
    if (operation.kind === 'previous') {
        return operation.block === undefined
    }

    if (operation.kind === 'feedback') {
        return false
    }

    return getChildren(operation).some(hasFreePrevious)
}

export const closeLoop = (chain: Chain) => {
    return hasFreePrevious(chain.operation) ? new Chain({ kind: 'feedback', input: chain.operation }) : chain
}
