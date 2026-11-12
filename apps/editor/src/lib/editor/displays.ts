export const displays = ['code', 'functions', 'javascript', 'shader'] as const

export type Display = typeof displays[number]

export type OutputDisplay = Exclude<Display, 'code'>
