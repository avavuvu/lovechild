import type { Amount, ColorName, CombineName, CoordinateName, Keyword, Operation, Parameter } from './operation'
import { colorNames, combineNames, coordinateNames, createArguments, splitNames } from './steps'

type Values = ReadonlyArray<Parameter | undefined>

export class Image {
    readonly operation: Operation

    constructor(operation: Operation) {
        this.operation = operation
    }

    rotate(turns?: Amount) {
        return this.#transformCoordinate('rotate', [turns])
    }

    scale(x?: Amount, y?: Amount) {
        return this.#transformCoordinate('scale', [x, y])
    }

    scaleX(amount?: Amount) {
        return this.scale(amount, 1)
    }

    scaleY(amount?: Amount) {
        return this.scale(1, amount)
    }

    move(x?: Amount, y?: Amount) {
        return this.#transformCoordinate('move', [x, y])
    }

    moveX(amount?: Amount) {
        return this.move(amount, 0)
    }

    moveY(amount?: Amount) {
        return this.move(0, amount)
    }

    scroll(x?: Amount, y?: Amount) {
        return this.#transformCoordinate('scroll', [x, y])
    }

    scrollX(speed?: Amount) {
        return this.scroll(speed, 0)
    }

    scrollY(speed?: Amount) {
        return this.scroll(0, speed)
    }

    spin(speed?: Amount) {
        return this.#transformCoordinate('spin', [speed])
    }

    kaleid(sides?: Amount) {
        return this.#transformCoordinate('kaleid', [sides])
    }

    pixelate(x?: Amount, y?: Amount) {
        return this.#transformCoordinate('pixelate', [x, y])
    }

    pixelateX(cells?: Amount) {
        return this.pixelate(cells, 0)
    }

    pixelateY(cells?: Amount) {
        return this.pixelate(0, cells)
    }

    repeat(x?: Amount, y?: Amount) {
        return this.#transformCoordinate('repeat', [x, y])
    }

    repeatX(times?: Amount) {
        return this.repeat(times, 0)
    }

    repeatY(times?: Amount) {
        return this.repeat(0, times)
    }

    invert(amount?: Amount) {
        return this.#transformColor('invert', [amount])
    }

    brightness(amount?: Amount) {
        return this.#transformColor('brightness', [amount])
    }

    contrast(amount?: Amount) {
        return this.#transformColor('contrast', [amount])
    }

    saturate(amount?: Amount) {
        return this.#transformColor('saturate', [amount])
    }

    hue(turns?: Amount) {
        return this.#transformColor('hue', [turns])
    }

    colorama(amount?: Amount) {
        return this.#transformColor('colorama', [amount])
    }

    shift(red?: Amount, green?: Amount, blue?: Amount) {
        return this.#transformColor('shift', [red, green, blue])
    }

    grey() {
        return this.#transformColor('grey', [])
    }

    gray() {
        return this.grey()
    }

    posterize(levels?: Amount) {
        return this.#transformColor('posterize', [levels])
    }

    thresh(threshold?: Amount) {
        return this.#transformColor('thresh', [threshold])
    }

    luma(threshold?: Amount) {
        return this.#transformColor('luma', [threshold])
    }

    channels(order?: Keyword) {
        return this.#transformColor('channels', [order])
    }

    range(minimum?: Amount, maximum?: Amount) {
        return this.#transformColor('range', [minimum, maximum])
    }

    between(minimum?: Amount, maximum?: Amount) {
        return this.range(minimum, maximum)
    }

    split(x?: Amount, y?: Amount) {
        return new Image({ kind: 'split', name: 'split', input: this.operation, parameters: createArguments('split', [x, y]) })
    }

    splitX(amount?: Amount) {
        return this.split(amount, 0)
    }

    splitY(amount?: Amount) {
        return this.split(0, amount)
    }

    add(other: Image) {
        return this.#combineWith('add', other, [])
    }

    sub(other: Image) {
        return this.#combineWith('sub', other, [])
    }

    subtract(other: Image) {
        return this.sub(other)
    }

    mult(other: Image) {
        return this.#combineWith('mult', other, [])
    }

    multiply(other: Image) {
        return this.mult(other)
    }

    diff(other: Image) {
        return this.#combineWith('diff', other, [])
    }

    difference(other: Image) {
        return this.diff(other)
    }

    layer(other: Image) {
        return this.#combineWith('layer', other, [])
    }

    mask(other: Image) {
        return this.#combineWith('mask', other, [])
    }

    screen(other: Image) {
        return this.#combineWith('screen', other, [])
    }

    blend(other: Image, amount?: Amount) {
        return this.#combineWith('blend', other, [amount])
    }

    mix(other: Image, amount?: Amount) {
        return this.blend(other, amount)
    }

    chromaMove(other: Image, amount?: Amount) {
        if (!isImage(other)) {
            throw new Error('chromaMove needs an image')
        }

        const pixel = new Image({ kind: 'source', name: 'pixels', parameters: createArguments('pixels', [amount]) })
        const red = new Image({ kind: 'swizzle', input: other.operation, channels: 'r' })
        const green = new Image({ kind: 'swizzle', input: other.operation, channels: 'g' })
        const blue = new Image({ kind: 'swizzle', input: other.operation, channels: 'b' })

        return this.move(red.sub(green).mult(pixel), green.sub(blue).mult(pixel))
    }

    hush() {
        return new Image({ kind: 'source', name: 'empty', parameters: [] })
    }

    #transformCoordinate(name: CoordinateName, values: Values) {
        return new Image({ kind: 'coordinate', name, input: this.operation, parameters: createArguments(name, values) })
    }

    #transformColor(name: ColorName, values: Values) {
        return new Image({ kind: 'color', name, input: this.operation, parameters: createArguments(name, values) })
    }

    #combineWith(name: CombineName, other: Image, values: Values) {
        if (!isImage(other)) {
            throw new Error(`${name} needs an image`)
        }

        return new Image({ kind: 'combine', name, input: this.operation, other: other.operation, parameters: createArguments(name, values) })
    }
}

export const isImage = (value: unknown): value is Image => value instanceof Image

export const selectImage = (selector: Parameter, options: ReadonlyArray<Image>) => {
    return new Image({ kind: 'select', options: options.map((option) => option.operation), parameters: [selector] })
}

for (const name of [...coordinateNames, ...colorNames, ...combineNames, ...splitNames]) {
    if (!(name in Image.prototype)) {
        throw new Error(`${name} has a definition but no method`)
    }
}

const createSwizzleNames = (letters: string) => {
    const lengths = [Array.from(letters)]

    while (lengths.length < letters.length) {
        lengths.push(lengths[lengths.length - 1].flatMap((prefix) => Array.from(letters, (letter) => prefix + letter)))
    }

    return lengths.flat()
}

for (const channels of ['rgba', 'xyzw'].flatMap(createSwizzleNames)) {
    Object.defineProperty(Image.prototype, channels, {
        value: function (this: Image) {
            return new Image({ kind: 'swizzle', input: this.operation, channels })
        },
        configurable: true,
        writable: true,
    })
}

export const imageMethodNames: ReadonlyArray<string> = Object.getOwnPropertyNames(Image.prototype).filter((name) => name !== 'constructor')
