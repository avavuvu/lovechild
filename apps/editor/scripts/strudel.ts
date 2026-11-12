import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const repository = 'https://codeberg.org/uzu/strudel.git'
const commit = '0cb6341299229f739b5090be93528bb4f170d855'
const folder = join(import.meta.dirname, '..', '.strudel')
const marker = join(folder, 'commit')

const isCurrent = () => existsSync(marker) && readFileSync(marker, 'utf8') === commit

const runGit = (...values: Array<string>) => {
    execFileSync('git', values, { cwd: folder, stdio: 'inherit' })
}

if (!isCurrent()) {
    rmSync(folder, { recursive: true, force: true })
    mkdirSync(folder, { recursive: true })
    runGit('init', '--quiet')
    runGit('remote', 'add', 'origin', repository)
    runGit('fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', commit)
    runGit('sparse-checkout', 'set', '--no-cone', '/packages/**/*.mjs')
    runGit('checkout', '--quiet', 'FETCH_HEAD')
    writeFileSync(marker, commit)
}
