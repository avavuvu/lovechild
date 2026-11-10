import type { ColorName, CombineName, CoordinateName, Operation, Parameter, SplitName } from './operation'

export class Chain {
    readonly operation: Operation

    constructor(operation: Operation) {
        this.operation = operation
    }

    rotate(turns: Parameter = 0.125) {
        return this.transformCoordinate('rotate', [turns])
    }

    scale(amount: Parameter = 1.5) {
        return this.transformCoordinate('scale', [amount])
    }

    scaleX(amount: Parameter = 1.5) {
        return this.transformCoordinate('scaleX', [amount])
    }

    scaleY(amount: Parameter = 1.5) {
        return this.transformCoordinate('scaleY', [amount])
    }

    moveX(amount: Parameter = 0.5) {
        return this.transformCoordinate('moveX', [amount])
    }

    moveY(amount: Parameter = 0.5) {
        return this.transformCoordinate('moveY', [amount])
    }

    move(x: Parameter = 0.5, y?: Parameter) {
        if (y === undefined && isChain(x)) {
            return this.transformCoordinate('moveBy', [x])
        }

        return this.transformCoordinate('move', [x, y ?? x])
    }

    kaleid(sides: Parameter = 4) {
        return this.transformCoordinate('kaleid', [sides])
    }

    pixelate(cells: Parameter = 20) {
        return this.transformCoordinate('pixelate', [cells])
    }

    pixelateX(cells: Parameter = 20) {
        return this.transformCoordinate('pixelateX', [cells])
    }

    pixelateY(cells: Parameter = 20) {
        return this.transformCoordinate('pixelateY', [cells])
    }

    repeat(times: Parameter = 3) {
        return this.transformCoordinate('repeat', [times])
    }

    repeatX(times: Parameter = 3) {
        return this.transformCoordinate('repeatX', [times])
    }

    repeatY(times: Parameter = 3) {
        return this.transformCoordinate('repeatY', [times])
    }

    invert(amount: Parameter = 1) {
        return this.transformColor('invert', [amount])
    }

    brightness(amount: Parameter = 0.4) {
        return this.transformColor('brightness', [amount])
    }

    contrast(amount: Parameter = 1.6) {
        return this.transformColor('contrast', [amount])
    }

    saturate(amount: Parameter = 2) {
        return this.transformColor('saturate', [amount])
    }

    hue(turns: Parameter = 0.4) {
        return this.transformColor('hue', [turns])
    }

    colorama(amount: Parameter = 0.005) {
        return this.transformColor('colorama', [amount])
    }

    shift(red: Parameter = 0.5, green?: Parameter, blue?: Parameter) {
        if (green === undefined && blue === undefined && isChain(red)) {
            return this.transformColor('shiftBy', [red])
        }

        return this.transformColor('shift', [red, green ?? 0, blue ?? 0])
    }

    posterize(levels: Parameter = 3) {
        return this.transformColor('posterize', [levels])
    }

    thresh(threshold: Parameter = 0.5) {
        return this.transformColor('thresh', [threshold])
    }

    luma(threshold: Parameter = 0.5) {
        return this.transformColor('luma', [threshold])
    }

    channels(order: Parameter = 'rgba') {
        return this.transformColor('channels', [order])
    }

    range(minimum: Parameter = 0, maximum: Parameter = 1) {
        return this.transformColor('range', [minimum, maximum])
    }

    between(minimum: Parameter = 0, maximum: Parameter = 1) {
        return this.range(minimum, maximum)
    }

    split(amount: Parameter = 0.02) {
        return this.splitChannels('split', amount)
    }

    splitX(amount: Parameter = 0.02) {
        return this.splitChannels('splitX', amount)
    }

    splitY(amount: Parameter = 0.02) {
        return this.splitChannels('splitY', amount)
    }

    add(other: Chain) {
        return this.combineWith('add', other, [])
    }

    sub(other: Chain) {
        return this.combineWith('sub', other, [])
    }

    subtract(other: Chain) {
        return this.sub(other)
    }

    mult(other: Chain) {
        return this.combineWith('mult', other, [])
    }

    multiply(other: Chain) {
        return this.mult(other)
    }

    diff(other: Chain) {
        return this.combineWith('diff', other, [])
    }

    difference(other: Chain) {
        return this.diff(other)
    }

    layer(other: Chain) {
        return this.combineWith('layer', other, [])
    }

    mask(other: Chain) {
        return this.combineWith('mask', other, [])
    }

    screen(other: Chain) {
        return this.combineWith('screen', other, [])
    }

    blend(other: Chain, amount: Parameter = 0.5) {
        return this.combineWith('blend', other, [amount])
    }

    mix(other: Chain, amount: Parameter = 0.5) {
        return this.blend(other, amount)
    }

    hush() {
        return new Chain({ kind: 'source', name: 'empty', parameters: [] })
    }

    private transformCoordinate(name: CoordinateName, parameters: ReadonlyArray<Parameter>) {
        return new Chain({ kind: 'coordinate', name, input: this.operation, parameters })
    }

    private transformColor(name: ColorName, parameters: ReadonlyArray<Parameter>) {
        return new Chain({ kind: 'color', name, input: this.operation, parameters })
    }

    private splitChannels(name: SplitName, amount: Parameter) {
        return new Chain({ kind: 'split', name, input: this.operation, parameters: [amount] })
    }

    private combineWith(name: CombineName, other: Chain, parameters: ReadonlyArray<Parameter>) {
        if (!isChain(other)) {
            throw new Error(`${name} needs an image`)
        }

        return new Chain({ kind: 'combine', name, input: this.operation, other: other.operation, parameters })
    }
}

export const isChain = (value: unknown): value is Chain => value instanceof Chain

export const selectChain = (selector: Parameter, options: ReadonlyArray<Chain>) => {
    return new Chain({ kind: 'select', options: options.map((option) => option.operation), parameters: [selector] })
}

const colorLetters = 'rgba'

const positionLetters = 'xyzw'

const createSwizzleNames = (letters: string, length: number): Array<string> => {
    if (length === 1) {
        return Array.from(letters)
    }

    return createSwizzleNames(letters, length - 1).flatMap((prefix) => Array.from(letters, (letter) => prefix + letter))
}

const toColorLetters = (name: string) => Array.from(name, (letter) => colorLetters[positionLetters.indexOf(letter)] ?? letter).join('')

const swizzleNames = [colorLetters, positionLetters].flatMap((letters) => [1, 2, 3, 4].flatMap((length) => createSwizzleNames(letters, length)))

for (const name of swizzleNames) {
    const channels = toColorLetters(name)

    Object.defineProperty(Chain.prototype, name, {
        value: function (this: Chain) {
            return new Chain({ kind: 'swizzle', input: this.operation, channels })
        },
        configurable: true,
        writable: true,
    })
}
