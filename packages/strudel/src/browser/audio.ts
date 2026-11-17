import type { Hap } from '@strudel/core'
import { aliasBank, getAudioContext, initAudio, registerSynthSounds, samples, webaudioOutput } from '@strudel/webaudio'
import type { ErrorReporter } from './errors'

const sampleHost = 'https://strudel.b-cdn.net'

let audioReady: Promise<void> | undefined

const loadSamples = () => {
    registerSynthSounds()
    samples('github:tidalcycles/dirt-samples')
    samples(sampleHost + '/tidal-drum-machines.json', sampleHost + '/tidal-drum-machines/machines/').then(() => aliasBank(sampleHost + '/tidal-drum-machines-alias.json'))
}

export const createAudio = (errors: ErrorReporter) => {
    const context = getAudioContext()
    let isMuted = true
    let offset = 0

    const getTime = () => isMuted ? performance.now() / 1000 : context.currentTime + offset

    const play = (hap: Hap, time: number, cps: number) => {
        const { onSchedule, dominantSchedule, locations } = hap.context

        if (!isMuted && !(onSchedule && dominantSchedule)) {
            webaudioOutput(hap, time - offset, cps).catch((error) => errors.report(error, locations))
        }

        if (onSchedule) {
            Promise.resolve(onSchedule(hap, time, cps)).catch((error) => errors.report(error, locations))
        }
    }

    const unmute = async () => {
        await context.resume()
        audioReady ??= initAudio()
        await audioReady
        offset = performance.now() / 1000 - context.currentTime
        isMuted = false
    }

    const mute = async () => {
        isMuted = true
        await context.suspend()
    }

    loadSamples()

    return { getTime, play, unmute, mute, getOutputLatency: () => context.outputLatency || 0 }
}
