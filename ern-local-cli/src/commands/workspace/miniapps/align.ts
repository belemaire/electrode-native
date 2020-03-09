import {
  log,
  gitCli,
  kax,
  alignPackageJson,
  readPackageJson,
  writePackageJson,
} from 'ern-core'
import { epilog, tryCatchWrap } from '../../../lib'
import _ from 'lodash'
import { Argv } from 'yargs'
import fs from 'fs-extra'
import path from 'path'
import Table from 'cli-table'
import os from 'os'
import logSymbols from 'log-symbols'

export const command = 'align [branch]'
export const desc = 'Git checkout a specific branch for all miniapps'

export const builder = (argv: Argv) => {
  return argv
    .option('manifestId', {
      default: 'default',
      describe: 'Id of the Manifest entry to use',
      type: 'string',
    })
    .epilog(epilog(exports))
}

export const commandHandler = async ({
  manifestId,
}: {
  manifestId: string
}) => {
  const miniappsDirs = []
  const pathToMiniApps = path.join(process.cwd(), 'miniapps')
  for (const file of fs.readdirSync(pathToMiniApps)) {
    const filePath = path.join(pathToMiniApps, file)
    if (fs.statSync(filePath).isDirectory()) {
      miniappsDirs.push(filePath)
    }
  }

  for (const m of miniappsDirs) {
    const packageJson = await readPackageJson(m)
    log.info(`Aligning dependencies of ${packageJson.name} miniapp`)
    const alignedDeps = await alignPackageJson({ manifestId, packageJson })
    if (alignedDeps.length === 0) {
      log.raw(
        `${logSymbols.success} All dependencies are already aligned on ${manifestId} manifest id`
      )
    } else {
      const table = new Table({
        head: ['name', 'old', 'new'],
      })
      for (const a of alignedDeps) {
        table.push([a.name, a.oldVersion, a.newVersion])
        await writePackageJson(m, packageJson)
      }
      log.raw(table.toString())
    }
    log.raw(os.EOL)
  }

  log.info(`Aligned all miniapps dependencies on ${manifestId} manifest id !`)
}

export const handler = tryCatchWrap(commandHandler)
