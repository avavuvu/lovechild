const channelIndexes: Record<string, number> = { r: 0, g: 1, b: 2, a: 3 }

const identityOrder = 'rgba'

export const encodeChannels = (value: unknown) => {
    const order = typeof value === 'string' && /^[rgba]{1,4}$/.test(value) ? value : identityOrder
    const indexes = Array.from(order, (letter) => channelIndexes[letter] ?? 0)
    return indexes.reduce((code, channel, position) => code + channel * 4 ** position, 0) + (order.length - 1) * 256
}
