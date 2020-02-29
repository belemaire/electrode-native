import { NativePlatform, kax, Platform, log, gitCli } from 'ern-core'
import { runLocalContainerGen } from 'ern-orchestrator'
import { epilog, tryCatchWrap, askUserToSelectAPlatform } from '../../../lib'
import _ from 'lodash'
import { Argv } from 'yargs'
import fs from 'fs-extra'
import {
  parseJsonFromStringOrFile,
  runContainerPipeline,
} from 'ern-orchestrator'
import { WorkspaceComposite } from 'ern-composite-gen'
import path from 'path'

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

  for (const m of miniappsDirs) {
    const sr = await gitCli(m).status()
    log.info(JSON.stringify(sr, null, 2))
  }
}

export const handler = tryCatchWrap(commandHandler)
