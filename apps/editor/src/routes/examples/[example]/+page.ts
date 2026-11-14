import { exampleNames, examples } from "$lib/examples/examples"
import type { PageLoad } from "./$types"

export const entries = () => exampleNames.map((example) => ({ example }))

export const load: PageLoad = ({ params }) => {
    const name = exampleNames.find(name => name === params.example)
    const example = examples.get(name ?? "")

    return {
        example
    }

}
