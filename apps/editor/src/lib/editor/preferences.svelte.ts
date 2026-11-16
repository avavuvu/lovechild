import { displays } from './displays'
import { readSavedSettings, saveSettings } from './storage'

export const settingOptions = {
    theme: ['light', 'dark'],
    format: ['on', 'off'],
    resolution: ['full', 'half'],
    display: displays,
} as const

export type SettingName = keyof typeof settingOptions

export type Settings = { [Name in SettingName]: typeof settingOptions[Name][number] }

export const settingNames = Object.keys(settingOptions) as Array<SettingName>

export const settings: Settings = $state({ theme: 'light', format: 'on', resolution: 'full', display: 'code' })

export const resolutionScales: Record<Settings['resolution'], number> = { full: 1, half: 0.5 }

const isOption = <Name extends SettingName>(name: Name, value: unknown): value is Settings[Name] => (settingOptions[name] as ReadonlyArray<unknown>).includes(value)

const assignSetting = <Name extends SettingName>(name: Name, value: Settings[Name]) => {
    settings[name] = value
}

const applyTheme = () => {
    document.documentElement.dataset.theme = settings.theme
}

export const loadSettings = () => {
    const saved = readSavedSettings()

    for (const name of settingNames) {
        const value = saved[name]

        if (isOption(name, value)) {
            assignSetting(name, value)
        }
    }

    applyTheme()
}

export const changeSetting = <Name extends SettingName>(name: Name, value: Settings[Name]) => {
    assignSetting(name, value)
    saveSettings($state.snapshot(settings))
    applyTheme()
}
