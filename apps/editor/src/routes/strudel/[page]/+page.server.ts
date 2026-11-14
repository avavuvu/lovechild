import { listPathNames, loadDocument } from '$lib/server/reference'

export const entries = () => listPathNames('strudel').map((page) => ({ page }))

export const load = ({ params }) => loadDocument('strudel', params.page)
