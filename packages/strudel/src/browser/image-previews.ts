import type { ImagePreview } from '../evaluation/evaluate'
import { getOrCreate } from '../maps'

export interface PreviewElement {
    id: string
    element: HTMLElement
}

const createImageElement = () => {
    const element = document.createElement('div')
    element.style.width = '25vw'
    element.style.height = '25vh'
    return element
}

export const createImagePreviews = () => {
    const elements = new Map<string, HTMLElement>()

    const getElement = (id: string) => getOrCreate(elements, id, createImageElement)

    const show = (imagePreviews: ReadonlyArray<ImagePreview>): ReadonlyArray<PreviewElement> => imagePreviews.map(({ id }) => ({ id, element: getElement(id) }))

    return { getElement, show }
}
