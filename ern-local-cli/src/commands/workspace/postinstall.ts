import {
  patchMetro51AssetsBug,
  patchMetroBabelEnv,
  patchWorkspaceBabelRcRoots,
} from 'ern-composite-gen'
import { kax } from 'ern-core'
import { epilog, tryCatchWrap } from '../../lib'
import { Argv } from 'yargs'

export const command = 'postinstall'
export const desc = 'Apply postinstall transformations'

export const builder = (argv: Argv) => {
  return argv.epilog(epilog(exports))
}

export const commandHandler = async () => {
  await kax
    .task('Applying post install transformations')
    .run(applyPatches({ cwd: process.cwd() }))
}

async function applyPatches({ cwd }: { cwd: string }) {
  await patchMetro51AssetsBug({ cwd })
  await patchMetroBabelEnv({ cwd })
  await patchWorkspaceBabelRcRoots({ cwd })
}

export const handler = tryCatchWrap(commandHandler)
