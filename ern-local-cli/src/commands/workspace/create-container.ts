import { NativePlatform, kax, Platform, log } from 'ern-core'
import { runLocalContainerGen } from 'ern-orchestrator'
import { epilog, tryCatchWrap, askUserToSelectAPlatform } from '../../lib'
import _ from 'lodash'
import { Argv } from 'yargs'
import fs from 'fs-extra'
import {
  parseJsonFromStringOrFile,
  runContainerPipeline,
} from 'ern-orchestrator'
import { WorkspaceComposite } from 'ern-composite-gen'
import untildify from 'untildify'

export const command = 'create-container'
export const desc = 'Create a Container from a workspace'

export const builder = (argv: Argv) => {
  return argv
    .option('containerVersion', {
      alias: 'v',
      describe:
        'Container version. Only used if a pipeline with publishers is configured.',
      type: 'string',
    })
    .option('extra', {
      alias: 'e',
      describe:
        'Optional extra run configuration (json string or local/cauldron path to config file)',
      type: 'string',
    })
    .option('devJsBundle', {
      describe:
        'Generate a development JavaScript bundle rather than a production one',
      type: 'boolean',
    })
    .option('ignoreRnpmAssets', {
      describe: 'Ignore rnpm assets from the MiniApps',
      type: 'boolean',
    })
    .option('platform', {
      alias: 'p',
      choices: ['android', 'ios', undefined],
      describe: 'The platform for which to generate the container',
      type: 'string',
    })
    .option('outDir', {
      alias: 'out',
      describe: 'Directory to output the generated container to',
      type: 'string',
    })
    .coerce('outDir', p => untildify(p))
    .option('sourceMapOutput', {
      describe: 'Path to source map file to generate for this container bundle',
      type: 'string',
    })
    .option('workspaceDir', {
      alias: 'w',
      describe: 'Worskpace directory',
      type: 'string',
    })
    .coerce('workspaceDir', p => untildify(p))
    .coerce('sourceMapOutput', p => untildify(p))
    .epilog(epilog(exports))
}

export const commandHandler = async ({
  containerVersion,
  devJsBundle,
  extra,
  ignoreRnpmAssets,
  outDir,
  platform,
  sourceMapOutput,
  workspaceDir,
}: {
  containerVersion?: string
  devJsBundle?: boolean
  extra?: string
  ignoreRnpmAssets?: boolean
  outDir?: string
  platform?: NativePlatform
  sourceMapOutput?: string
  workspaceDir?: string
} = {}) => {
  if (outDir && (await fs.pathExists(outDir))) {
    if ((await fs.readdir(outDir)).length > 0) {
      throw new Error(
        `${outDir} directory exists and is not empty.
Output directory should either not exist (it will be created) or should be empty.`
      )
    }
  }

  const extraObj = (extra && (await parseJsonFromStringOrFile(extra))) || {}
  platform = platform ?? (await askUserToSelectAPlatform())
  outDir = outDir ?? Platform.getContainerGenOutDirectory(platform)
  workspaceDir = workspaceDir ?? process.cwd()

  await kax.task('Generating Container locally').run(
    runLocalContainerGen(platform, new WorkspaceComposite(workspaceDir), {
      devJsBundle,
      extra: extraObj,
      ignoreRnpmAssets,
      outDir,
      sourceMapOutput,
    })
  )

  log.info(`Container successfully generated in ${outDir}`)

  if (extraObj?.pipeline) {
    await kax.task('Running Container Pipeline').run(
      runContainerPipeline({
        containerPath: outDir,
        containerVersion: containerVersion!,
        pipeline: extraObj.pipeline,
        platform,
      })
    )
  }
}

export const handler = tryCatchWrap(commandHandler)
