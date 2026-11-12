import adapter from '@sveltejs/adapter-static'
import { markdown } from './markdown.ts'

export default {
    extensions: ['.svelte', '.md'],
    preprocess: markdown(),
    kit: {
        adapter: adapter({ pages: 'dist', assets: 'dist' }),
        typescript: {
            config: (config) => {
                config.include.push('../markdown.ts', '../../../packages/strudel/src/strudel.d.ts')
            },
        },
    },
}
