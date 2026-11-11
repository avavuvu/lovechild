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

const usesPrevious = (operation: Operation): boolean => operation.kind === 'previous' || getChildren(operation).some(usesPrevious)

const canShowImage = (operation: Operation, blocks: ReadonlyMap<string, Chain>, visiting: ReadonlySet<string>): boolean => {
    switch (operation.kind) {
        case 'source': {
            return operation.name !== 'empty'
        }
        case 'media':
        case 'color': {
            return true
        }
        case 'previous': {
            const block = operation.block === undefined || visiting.has(operation.block) ? undefined : blocks.get(operation.block)
            return block !== undefined && canShowImage(block.operation, blocks, new Set([...visiting, operation.block ?? '']))
        }
        case 'combine': {
            return canShowImage(operation.input, blocks, visiting) || canShowImage(operation.other, blocks, visiting)
        }
        case 'select': {
            return operation.options.some((option) => canShowImage(option, blocks, visiting))
        }
        case 'coordinate':
        case 'split':
        case 'swizzle':
        case 'feedback': {
            return canShowImage(operation.input, blocks, visiting)
        }
    }
}

export const isEmptyLoop = (chain: Chain, blocks: ReadonlyMap<string, Chain>, name?: string) => {
    return usesPrevious(chain.operation) && !canShowImage(chain.operation, blocks, new Set(name === undefined ? [] : [name]))
}
