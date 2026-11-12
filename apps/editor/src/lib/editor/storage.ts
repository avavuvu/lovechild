const codeKey = 'lovechild:code'

export const readSavedCode = () => {
    try {
        return localStorage.getItem(codeKey) ?? undefined
    } catch {
        return undefined
    }
}

export const saveCode = (code: string) => {
    try {
        localStorage.setItem(codeKey, code)
    } catch {
        return
    }
}
