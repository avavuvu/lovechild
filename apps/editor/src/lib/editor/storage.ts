const codeKey = 'lovechild:code'

const settingsKey = 'lovechild:settings'

const readStored = (key: string) => {
    try {
        return localStorage.getItem(key) ?? undefined
    } catch {
        return undefined
    }
}

const store = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value)
    } catch {
        return
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const readSavedCode = () => readStored(codeKey)

export const saveCode = (code: string) => store(codeKey, code)

export const readSavedSettings = (): Record<string, unknown> => {
    try {
        const saved: unknown = JSON.parse(readStored(settingsKey) ?? '{}')
        return isRecord(saved) ? saved : {}
    } catch {
        return {}
    }
}

export const saveSettings = (settings: object) => store(settingsKey, JSON.stringify(settings))
