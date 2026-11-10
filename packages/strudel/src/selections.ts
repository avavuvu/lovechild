import { Chain, isChain, selectChain } from '@heartbreak/core'
import { pure, stack, type Pattern, type PatternTransform, type SelectionName } from '@strudel/core'

type Transform = (chain: Chain) => Chain

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

const isTransform = (value: SelectionValue): value is Transform => typeof value === 'function'

const markApplied: PatternTransform = (pattern) => pattern.fmap(() => 1)

const applySelection = (name: SelectionName, chain: Chain, values: ReadonlyArray<SelectionValue>) => {
    const transform = values.find(isTransform)

    if (transform === undefined) {
        throw new Error(`${name} needs a function`)
    }

    const transformed = transform(chain)

    if (!isChain(transformed)) {
        throw new Error(`${name} must return an image`)
    }

    const selector = pure(0)[name](...values.map((value) => isTransform(value) ? markApplied : value))
    return selectChain(selector, [chain, transformed])
}

const degradeChain = (chain: Chain, amount: DegradeAmount) => selectChain(stack(pure(1).degradeBy(amount), pure(0)), [chain.hush(), chain])

for (const name of selectionNames) {
    Object.defineProperty(Chain.prototype, name, {
        value: function (this: Chain, ...values: ReadonlyArray<SelectionValue>) {
            return applySelection(name, this, values)
        },
        configurable: true,
        writable: true,
    })
}

Object.defineProperty(Chain.prototype, 'degradeBy', {
    value: function (this: Chain, amount: DegradeAmount) {
        return degradeChain(this, amount)
    },
    configurable: true,
    writable: true,
})

Object.defineProperty(Chain.prototype, 'degrade', {
    value: function (this: Chain) {
        return degradeChain(this, 0.5)
    },
    configurable: true,
    writable: true,
})
