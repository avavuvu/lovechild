export const getOrCreate = <Key, Value>(map: Map<Key, Value>, key: Key, create: (key: Key) => Value) => {
    if (map.has(key)) {
        return map.get(key) as Value
    }

    const created = create(key)
    map.set(key, created)
    return created
}
