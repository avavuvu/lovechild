import type { Warning } from '@lovechild/strudel'

export interface Notice {
    kind: 'error' | 'warning' | 'info'
    text: string
    onSelect?: () => void
}

export const describeWarning = ({ locations, ...details }: Warning) => JSON.stringify(details)

export const describeError = (error: unknown) => error instanceof Error ? error.message : String(error)
