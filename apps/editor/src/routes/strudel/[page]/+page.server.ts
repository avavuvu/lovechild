import { listNames, loadDocument } from '$lib/server/reference'

export const entries = () => listNames('strudel').map((page) => ({ page }))

export const load = ({ params }) => loadDocument('strudel', params.page)
