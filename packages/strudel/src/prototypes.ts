import { Image, imageMethodNames, TextImage, textStyleNames } from '@lovechild/core'
import { Pattern } from '@strudel/core'
import { registerWidgetType } from '@strudel/transpiler'
import { blockMethod, imagePreviewMethod, nameMethod, patternPreviewMethod } from './evaluation/evaluate'
import { checkMethods } from './evaluation/warnings'
import { previewNames } from './language/previews'
import { selectionMethods } from './language/selections'
import { hitsMethod } from './language/signals'

type Method = (this: never, ...values: Array<never>) => unknown

const install = (prototype: object, methods: Record<string, Method>) => {
    for (const [name, method] of Object.entries(methods)) {
        Object.defineProperty(prototype, name, { value: method, configurable: true, writable: true })
    }
}

let isInstalled = false

export const installPrototypes = () => {
    if (isInstalled) {
        return
    }

    isInstalled = true
    checkMethods(Image.prototype, imageMethodNames)
    checkMethods(TextImage.prototype, textStyleNames)
    install(Image.prototype, selectionMethods)
    install(Pattern.prototype, { hits: hitsMethod })

    for (const prototype of [Pattern.prototype, Image.prototype]) {
        install(prototype, { p: blockMethod, track: nameMethod })
    }

    for (const name of previewNames) {
        registerWidgetType(name)
        install(Image.prototype, { [name]: imagePreviewMethod })
        install(Pattern.prototype, { [name]: patternPreviewMethod })
    }
}
