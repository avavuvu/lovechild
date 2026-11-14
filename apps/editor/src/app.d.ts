import type { Links } from '$lib/docs/reference'

declare global {
    namespace App {
        interface PageData {
            links?: Links
        }
    }
}

export {}
