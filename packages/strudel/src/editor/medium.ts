import { isTextStyle } from '@lovechild/core'
import * as strudel from '@strudel/core'
import { isImageFunction } from '../language/images'
import { patternFunctions } from '../language/patterns'

export type Medium = 'image' | 'text' | 'sound' | 'neutral'

const textFunction = 'text'

export const readFunctionMedium = (name: string): Medium | undefined => {
    if (name === textFunction) {
        return 'text'
    }

    if (isImageFunction(name)) {
        return 'image'
    }

    if (strudel.isControlName(name)) {
        return 'sound'
    }

    return name in strudel || name in patternFunctions ? 'neutral' : undefined
}

export const readMethodMedium = (receiver: Medium | undefined, name: string): Medium | undefined => {
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
