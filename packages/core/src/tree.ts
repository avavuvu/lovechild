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
        return operation.track === undefined
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

const canShowImage = (operation: Operation, tracks: ReadonlyMap<string, Image>, visiting: ReadonlySet<string>): boolean => {
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
            const track = operation.track === undefined || visiting.has(operation.track) ? undefined : tracks.get(operation.track)
            return track !== undefined && canShowImage(track.operation, tracks, new Set([...visiting, operation.track ?? '']))
        }
        case 'combine': {
            return canShowImage(operation.input, tracks, visiting) || canShowImage(operation.other, tracks, visiting)
        }
        case 'select': {
            return operation.options.some((option) => canShowImage(option, tracks, visiting))
        }
        case 'coordinate':
        case 'split':
        case 'swizzle':
        case 'feedback':
        case 'capture': {
            return canShowImage(operation.input, tracks, visiting)
        }
    }
}

export const isEmptyLoop = (image: Image, tracks: ReadonlyMap<string, Image>, name?: string) => {
    return usesPrevious(image.operation) && !canShowImage(image.operation, tracks, new Set(name === undefined ? [] : [name]))
}

const transparentColors: ReadonlySet<string> = new Set(['luma', 'opacity', 'channels'])

const transparentSources: ReadonlySet<string> = new Set(['empty', 'paint'])

const eitherOpaqueCombines: ReadonlySet<string> = new Set(['add', 'max', 'diff', 'layer', 'screen'])

const bothOpaqueCombines: ReadonlySet<string> = new Set(['mult', 'min', 'blend'])

const isOpaqueAlpha = (argument: Argument | undefined): boolean => {
    if (argument === undefined || argument === 1) {
        return true
    }

    return isImage(argument) && isOpaque(argument.operation)
}

const isOpaqueSource = (operation: Extract<Operation, { kind: 'source' }>): boolean => {
    if (transparentSources.has(operation.name)) {
        return false
    }

    if (operation.name === 'solid') {
        const [color] = operation.parameters
        return Array.isArray(color) ? color[3] === 1 : typeof color === 'number' || isOpaqueAlpha(color)
    }

    if (operation.name === 'hsv' || operation.name === 'oklch') {
        return operation.parameters[3] === undefined || operation.parameters[3] === 1
    }

    return true
}

export const isOpaque = (operation: Operation): boolean => {
    switch (operation.kind) {
        case 'source': {
            return isOpaqueSource(operation)
        }
        case 'media':
        case 'text': {
            return false
        }
        case 'previous': {
            return true
        }
        case 'coordinate':
        case 'split':
        case 'feedback':
        case 'capture': {
            return isOpaque(operation.input)
        }
        case 'swizzle': {
            return operation.channels.length < 4 || ('aw'.includes(operation.channels[3]) && isOpaque(operation.input))
        }
        case 'color': {
            return !transparentColors.has(operation.name) && isOpaque(operation.input)
        }
        case 'combine': {
            if (eitherOpaqueCombines.has(operation.name)) {
                return isOpaque(operation.input) || isOpaque(operation.other)
            }

            if (bothOpaqueCombines.has(operation.name)) {
                return isOpaque(operation.input) && isOpaque(operation.other)
            }

            return operation.name !== 'mask' && operation.name !== 'key' && isOpaque(operation.input)
        }
        case 'select': {
            return operation.options.every(isOpaque)
        }
    }
}
