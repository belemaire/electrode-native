import { log, gitCli, kax, childProcess } from 'ern-core'
import { epilog, tryCatchWrap } from '../../../lib'
import _ from 'lodash'
import { Argv } from 'yargs'
import fs from 'fs-extra'
import path from 'path'

export const command = 'foreach [cmd]'
export const desc =
  'Executes an arbitrary command in the working directory of all miniapps'

export const builder = (argv: Argv) => {
  return argv
    .option('noBail', {
      default: false,
      describe: 'Ignore non-zero (error) exit codes',
      type: 'boolean',
    })
    .option('parallel', {
      default: false,
      describe: 'Parallelize command execution',
      type: 'boolean',
    })
    .epilog(epilog(exports))
}

export const commandHandler = async ({
  cmd,
  noBail,
  parallel,
}: {
  cmd: string
  noBail: boolean
  parallel: boolean
}) => {
  const miniappsDirs = []
  const pathToMiniApps = path.join(process.cwd(), 'miniapps')
  for (const file of fs.readdirSync(pathToMiniApps)) {
    const filePath = path.join(pathToMiniApps, file)
    if (fs.statSync(filePath).isDirectory()) {
      miniappsDirs.push(filePath)
    }
  }

  const cmdArr = cmd.split(' ')
  const c: string = cmdArr.shift()!

  for (const m of miniappsDirs) {
    log.info(`[Running '${cmd}' from ${path.basename(m)}]`)
    try {
      await childProcess.spawnp(
        c,
        cmdArr,
        { cwd: m },
        { stdout: log.raw.bind(log), stderr: log.raw.bind(log) }
      )
    } catch (e) {
      if (!noBail) {
        throw e
      }
    }
  }
}

export const handler = tryCatchWrap(commandHandler)
