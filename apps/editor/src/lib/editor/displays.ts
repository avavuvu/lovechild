export const displays = ['code', 'javascript', 'shader'] as const

export type Display = typeof displays[number]

export type OutputDisplay = Exclude<Display, 'code'>
