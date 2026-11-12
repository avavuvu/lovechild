import { indexName } from '$lib/docs/reference'
import { loadDocument } from '$lib/server/reference'

export const load = () => loadDocument('lovechild', indexName)
