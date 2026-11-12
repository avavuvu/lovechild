import { indexName } from '$lib/docs/reference'
import { listNames, loadDocument } from '$lib/server/reference'

export const entries = () => listNames('lovechild').filter((name) => name !== indexName).map((page) => ({ page }))

export const load = ({ params }) => loadDocument('lovechild', params.page)
