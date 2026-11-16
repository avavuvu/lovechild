import { isTextStyle } from '@lovechild/core'
import * as strudel from '@strudel/core'
import { isImageFunction } from './images'

export type Kind = 'image' | 'text' | 'sound' | 'neutral'

const textFunction = 'text'

export const readFunctionKind = (name: string): Kind | undefined => {
    if (name === textFunction) {
        return 'text'
    }

    if (isImageFunction(name)) {
        return 'image'
    }

    if (strudel.isControlName(name)) {
        return 'sound'
    }

    return name in strudel ? 'neutral' : undefined
}

export const readMethodKind = (receiver: Kind | undefined, name: string): Kind | undefined => {
    switch (receiver) {
        case 'text': {
            return isTextStyle(name) ? 'text' : 'image'
        }
        case 'image':
        case 'sound': {
            return receiver
        }
        case 'neutral': {
            return strudel.isControlName(name) ? 'sound' : 'neutral'
        }
        case undefined: {
            return strudel.isControlName(name) ? 'sound' : undefined
        }
    }
}
