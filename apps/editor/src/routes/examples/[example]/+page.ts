import { error } from '@sveltejs/kit'
import { exampleNames, examples } from '$lib/examples/examples'
import type { PageLoad } from './$types'

export const entries = () => exampleNames.map((example) => ({ example }))

export const load: PageLoad = ({ params }) => {
    const code = examples.get(params.example)

    if (code === undefined) {
        error(404)
    }

    return { name: params.example, code }
}
