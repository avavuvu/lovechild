import { execFileSync } from 'node:child_process'

export const onPreInstall = async () => {
    execFileSync('bun', ['run', 'strudel'], {
        stdio: 'inherit'
    })
}
