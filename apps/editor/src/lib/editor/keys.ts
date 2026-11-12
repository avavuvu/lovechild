export const createKeyHandler = (onEvaluate: () => void, onStop: () => void) => (event: KeyboardEvent) => {
    if (!event.altKey) {
        return false
    }

    if (event.code === 'Enter') {
        event.preventDefault()
        onEvaluate()
        return true
    }

    if (event.code === 'Period') {
        event.preventDefault()
        onStop()
        return true
    }

    return false
}
