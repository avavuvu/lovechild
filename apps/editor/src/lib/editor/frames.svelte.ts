const span = 1000

const updateInterval = 250

export const frameRate = $state({ fps: 0, slowest: 0 })

let times: Array<number> = []

let lastUpdate = 0

export const countFrame = (now: number) => {
    times.push(now)
    times = times.filter((time) => time >= now - span)

    if (now - lastUpdate < updateInterval || times.length < 2) {
        return
    }

    lastUpdate = now
    frameRate.fps = (times.length - 1) * 1000 / (now - times[0])
    frameRate.slowest = Math.max(...times.slice(1).map((time, index) => time - times[index]))
}
