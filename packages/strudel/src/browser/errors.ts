import { Pattern, type State } from '@strudel/core'
import type { Location } from '../evaluation/warnings'

const logEvent = 'strudel.log'

interface LogDetail {
    message?: unknown
    type?: unknown
}

const isErrorLog = (detail: LogDetail) => detail.type === 'error' || /^\[\w+\] error: /.test(String(detail.message))

export type ErrorReporter = ReturnType<typeof createErrorReporter>

export const createErrorReporter = (onError: ((error: Error, locations: ReadonlyArray<Location>) => void) | undefined) => {
    const reported = new Set<string>()

    const report = (error: unknown, locations?: ReadonlyArray<Location>) => {
        const found = error instanceof Error ? error : new Error(String(error))
        const key = JSON.stringify([found.message, locations])

        if (!reported.has(key)) {
            reported.add(key)
            onError?.(found, locations ?? [])
        }
    }

    const readLog = (event: Event) => {
        if (event instanceof CustomEvent && event.detail && isErrorLog(event.detail)) {
            report(new Error(String(event.detail.message)))
        }
    }

    const attempt = <Result>(run: () => Result, fallback: Result) => {
        try {
            return run()
        } catch (error) {
            report(error)
            return fallback
        }
    }

    document.addEventListener(logEvent, readLog)

    return {
        report,
        attempt,
        guard: (pattern: Pattern) => new Pattern((state: State) => attempt(() => pattern.query(state), [])),
        clear: () => reported.clear(),
        destroy: () => document.removeEventListener(logEvent, readLog),
    }
}
