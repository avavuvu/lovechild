import { Image, isImage, selectImage } from '@lovechild/core'
import { isPattern, pure, reify, stack, type Pattern, type PatternTransform, type SelectionName } from '@strudel/core'
import { fillGaps } from './events'

type Transform = (image: Image) => Image

type SelectionValue = number | string | Pattern | Transform

type DegradeAmount = number | string | Pattern

const selectionNames: ReadonlyArray<SelectionName> = [
    'sometimes',
    'sometimesBy',
    'often',
    'rarely',
    'almostNever',
    'almostAlways',
    'always',
    'never',
    'someCycles',
    'someCyclesBy',
    'firstOf',
    'every',
    'lastOf',
    'when',
    'chunk',
    'chunkBack',
]

const conditionNames: ReadonlyArray<SelectionName> = ['when', 'sometimesBy', 'someCyclesBy']

const isTransform = (value: SelectionValue): value is Transform => typeof value === 'function'

const markApplied: PatternTransform = (pattern) => pattern.fmap(() => 1)

const readArgument = (name: SelectionName, value: SelectionValue) => {
    if (isTransform(value)) {
        return markApplied
    }

    const isCondition = conditionNames.includes(name) && (isPattern(value) || typeof value === 'string')
    return isCondition ? fillGaps(reify(value)) : value
}

const applySelection = (name: SelectionName, image: Image, values: ReadonlyArray<SelectionValue>) => {
    const transform = values.find(isTransform)

    if (transform === undefined) {
        throw new Error(`${name} needs a function`)
    }

    const transformed = transform(image)

    if (!isImage(transformed)) {
        throw new Error(`${name} must return an image`)
    }

    const selector = pure(0)[name](...values.map((value) => readArgument(name, value)))
    return selectImage(selector, [image, transformed])
}

const degradeImage = (image: Image, amount: DegradeAmount) => selectImage(stack(pure(1).degradeBy(amount), pure(0)), [image.hush(), image])

for (const name of selectionNames) {
    Object.defineProperty(Image.prototype, name, {
        value: function (this: Image, ...values: ReadonlyArray<SelectionValue>) {
            return applySelection(name, this, values)
        },
        configurable: true,
        writable: true,
    })
}

Object.defineProperty(Image.prototype, 'degradeBy', {
    value: function (this: Image, amount: DegradeAmount) {
        return degradeImage(this, amount)
    },
    configurable: true,
    writable: true,
})

Object.defineProperty(Image.prototype, 'degrade', {
    value: function (this: Image) {
        return degradeImage(this, 0.5)
    },
    configurable: true,
    writable: true,
})
