import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import bundleAudioWorklet from 'vite-plugin-bundle-audioworklet'

export default defineConfig({
    plugins: [sveltekit(), bundleAudioWorklet()],
    server: {
        fs: {
            allow: ['../../.strudel'],
        },
    },
})
