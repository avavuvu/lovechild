import type { DocumentData } from './reference'
import { findMarkdown } from './pages'

export const attachMarkdown = ({ data }: { data: DocumentData }) => ({ ...data, markdown: findMarkdown(data.entry.namespace, data.entry.name)?.component })
