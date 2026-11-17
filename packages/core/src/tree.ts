import { Image, isImage } from './image'
import type { Argument, Operation } from './operation'

export const getParameterOperations = (parameters: ReadonlyArray<Argument>) => parameters.flat().filter(isImage).map((image) => image.operation)

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
        case 'text': {
            return [operation.fill, operation.stroke]
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
        case 'capture': {
            return [operation.input, operation.gate]
        }
        case 'select': {
            return [...operation.options, ...getParameterOperations(operation.parameters)]
        }
    }
}

export const hasFreePrevious = (operation: Operation): boolean => {
    if (operation.kind === 'previous') {
        return operation.imageName === undefined
    }

    if (operation.kind === 'feedback') {
        return false
    }

    return getChildren(operation).some(hasFreePrevious)
}

export const closeLoop = (image: Image) => {
    return hasFreePrevious(image.operation) ? new Image({ kind: 'feedback', input: image.operation }) : image
}

const usesPrevious = (operation: Operation): boolean => operation.kind === 'previous' || getChildren(operation).some(usesPrevious)

const canShowImage = (operation: Operation, imagesByName: ReadonlyMap<string, Image>, visiting: ReadonlySet<string>): boolean => {
    switch (operation.kind) {
        case 'source': {
            return operation.name !== 'empty'
        }
        case 'media':
        case 'text':
        case 'color': {
            return true
        }
        case 'previous': {
            const named = operation.imageName === undefined || visiting.has(operation.imageName) ? undefined : imagesByName.get(operation.imageName)
            return named !== undefined && canShowImage(named.operation, imagesByName, new Set([...visiting, operation.imageName ?? '']))
        }
        case 'combine': {
            return canShowImage(operation.input, imagesByName, visiting) || canShowImage(operation.other, imagesByName, visiting)
        }
        case 'select': {
            return operation.options.some((option) => canShowImage(option, imagesByName, visiting))
        }
        case 'coordinate':
        case 'split':
        case 'swizzle':
        case 'feedback':
        case 'capture': {
            return canShowImage(operation.input, imagesByName, visiting)
        }
    }
}

export const isEmptyLoop = (image: Image, imagesByName: ReadonlyMap<string, Image>, name?: string) => {
    return usesPrevious(image.operation) && !canShowImage(image.operation, imagesByName, new Set(name === undefined ? [] : [name]))
}
