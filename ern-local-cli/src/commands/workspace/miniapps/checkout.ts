import { log, gitCli, kax } from 'ern-core'
import { epilog, tryCatchWrap } from '../../../lib'
import _ from 'lodash'
import { Argv } from 'yargs'
import fs from 'fs-extra'
import path from 'path'

export const command = 'checkout [branch]'
export const desc = 'Git checkout a specific branch for all miniapps'

export const builder = (argv: Argv) => {
  return argv.epilog(epilog(exports))
}

export const commandHandler = async ({ branch }: { branch: string }) => {
  const miniappsDirs = []
  const pathToMiniApps = path.join(process.cwd(), 'miniapps')
  for (const file of fs.readdirSync(pathToMiniApps)) {
    const filePath = path.join(pathToMiniApps, file)
    if (fs.statSync(filePath).isDirectory()) {
      miniappsDirs.push(filePath)
    }
  }

  for (const m of miniappsDirs) {
    await gitCli(m).checkout(branch)
  }
}

export const handler = tryCatchWrap(commandHandler)
