import { indexName } from '$lib/docs/reference'
import { listPathNames, loadDocument } from '$lib/server/reference'

export const entries = () => listPathNames('lovechild').filter((name) => name !== indexName).map((page) => ({ page }))

export const load = ({ params }) => loadDocument('lovechild', params.page)
