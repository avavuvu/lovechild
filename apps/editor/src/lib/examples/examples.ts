import { getFileName } from '../files'

const files = import.meta.glob<string>('./*.js', { query: '?raw', import: 'default', eager: true })

export const examples = new Map(Object.entries(files).map(([path, code]) => [getFileName(path), code]))

export const exampleNames = Array.from(examples.keys())

export const pickExampleName = () => exampleNames[Math.floor(Math.random() * exampleNames.length)]
