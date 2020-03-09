import { log, gitCli, kax } from 'ern-core'
import { epilog, tryCatchWrap } from '../../../lib'
import _ from 'lodash'
import { Argv } from 'yargs'
import fs from 'fs-extra'
import path from 'path'
import Table from 'cli-table'
import logSymbols from 'log-symbols'

export const command = 'status'
export const desc = 'Git status of miniapps'

export const builder = (argv: Argv) => {
  return argv.epilog(epilog(exports))
}

export const commandHandler = async () => {
  const miniappsDirs = []
  const pathToMiniApps = path.join(process.cwd(), 'miniapps')
  for (const file of fs.readdirSync(pathToMiniApps)) {
    const filePath = path.join(pathToMiniApps, file)
    if (fs.statSync(filePath).isDirectory()) {
      miniappsDirs.push(filePath)
    }
  }

  const table = new Table({
    head: ['MiniApp', 'Branch', 'Ahead?', 'Behind?', 'Dirty?'],
  })

  for (const m of miniappsDirs) {
    const sr = await gitCli(m).status()
    table.push([
      path.basename(m),
      sr.current,
      sr.ahead > 0 ? logSymbols.success : '',
      sr.behind > 0 ? logSymbols.success : '',
      sr.files.length > 0 ? logSymbols.success : '',
    ])
  }
  kax.raw(table.toString())
}

export const handler = tryCatchWrap(commandHandler)
