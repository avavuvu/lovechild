import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const repository = 'https://codeberg.org/uzu/strudel.git'
const commit = '0cb6341299229f739b5090be93528bb4f170d855'
const folder = join(import.meta.dirname, '..', '.strudel')
const marker = join(folder, 'commit')
const catalogPrefix = 'catalog:'

const linkedPackages = ['core', 'mini', 'tonal', 'transpiler', 'webaudio', 'draw', 'codemirror', 'superdough', 'vite-plugin-bundle-audioworklet']

const sparsePatterns = ['/packages/**/*.mjs', '/pnpm-workspace.yaml', ...linkedPackages.map((name) => `/packages/${name}/`)]

const isCurrent = () => existsSync(marker) && readFileSync(marker, 'utf8') === commit

const runGit = (...values: Array<string>) => {
    execFileSync('git', values, { cwd: folder, stdio: 'inherit' })
}

const readCatalog = () => {
    const lines = readFileSync(join(folder, 'pnpm-workspace.yaml'), 'utf8').split('\n')
    const start = lines.indexOf('catalog:')
    const end = lines.findIndex((line, index) => index > start && !line.startsWith(' '))
    const entries = lines.slice(start + 1, end === -1 ? undefined : end).flatMap((line): Array<[string, string]> => {
        const match = line.match(/^\s+'?([^':]+)'?:\s*(\S+)/)
        return match ? [[match[1], match[2]]] : []
    })

    return new Map(entries)
}

const resolveCatalogVersions = (dependencies: Record<string, string>, catalog: ReadonlyMap<string, string>) => Object.fromEntries(Object.entries(dependencies).map(([name, version]) => {
    if (version !== catalogPrefix) {
        return [name, version]
    }

    const found = catalog.get(name)

    if (!found) {
        throw new Error(`${name} has no version in the Strudel catalog`)
    }

    return [name, found]
}))

const resolveCatalogs = () => {
    const catalog = readCatalog()

    for (const name of linkedPackages) {
        const path = join(folder, 'packages', name, 'package.json')
        const manifest = JSON.parse(readFileSync(path, 'utf8'))

        for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
            if (manifest[field]) {
                manifest[field] = resolveCatalogVersions(manifest[field], catalog)
            }
        }

        writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`)
    }
}

if (!isCurrent()) {
    rmSync(folder, { recursive: true, force: true })
    mkdirSync(folder, { recursive: true })
    runGit('init', '--quiet')
    runGit('remote', 'add', 'origin', repository)
    runGit('fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', commit)
    runGit('sparse-checkout', 'set', '--no-cone', ...sparsePatterns)
    runGit('checkout', '--quiet', 'FETCH_HEAD')
    resolveCatalogs()
    writeFileSync(marker, commit)
}
