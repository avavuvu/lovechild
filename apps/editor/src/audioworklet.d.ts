declare module 'vite-plugin-bundle-audioworklet' {
    import type { Plugin } from 'vite'

    const bundleAudioWorklet: () => Plugin
    export default bundleAudioWorklet
}
