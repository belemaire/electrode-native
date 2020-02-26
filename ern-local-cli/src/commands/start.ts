import {
  epilog,
  askUserToChooseANapDescriptorFromCauldron,
  tryCatchWrap,
} from '../lib'
import { start } from 'ern-orchestrator'
import _ from 'lodash'
import {
  AppVersionDescriptor,
  config,
  readPackageJson,
  PackagePath,
  log,
} from 'ern-core'
import { Argv } from 'yargs'
import untildify from 'untildify'
import { logErrorAndExitIfNotSatisfied } from '../lib'
import { getActiveCauldron } from 'ern-cauldron-api'
import path from 'path'
import gh from 'parse-github-url'
import inquirer from 'inquirer'
import Table from 'cli-table'

export const command = 'start'
export const desc = 'Start a composite MiniApp'

export const builder = (argv: Argv) => {
  return argv
    .option('activityName', {
      alias: 'a',
      describe: 'Android Activity to launch',
      type: 'string',
    })
    .option('baseComposite', {
      describe: 'Base Composite',
      type: 'string',
    })
    .coerce('baseComposite', d => PackagePath.fromString(d))
    .option('bundleId', {
      alias: 'b',
      describe: 'iOS Bundle Identifier',
      type: 'string',
    })
    .option('compositeDir', {
      describe: 'Directory in which to generate the composite',
      type: 'string',
    })
    .coerce('compositeDir', p => untildify(p))
    .option('descriptor', {
      alias: 'd',
      describe: 'Full native application selector',
      type: 'string',
    })
    .coerce('descriptor', d => AppVersionDescriptor.fromString(d))
    .option('extraJsDependencies', {
      alias: 'e',
      describe:
        'Additional JavaScript dependencies to add to the composite JavaScript bundle',
      type: 'array',
    })
    .coerce('extraJsDependencies', d => d.map(PackagePath.fromString))
    .option('jsApiImpls', {
      describe: 'A list of one or more JS API Implementation(s)',
      type: 'array',
    })
    .coerce('jsApiImpls', d => d.map(PackagePath.fromString))
    .option('flavor', {
      describe: 'Custom binary flavor',
    })
    .option('launchArgs', {
      describe: '[iOS] Arguments to pass to the application when launching it',
      type: 'string',
    })
    .option('launchEnvVars', {
      describe:
        '[iOS] Environment variables to pass to the application when launching it (space separated key=value pairs)',
    })
    .option('launchFlags', {
      describe: '[Android] Flags to pass to the application when launching it',
      type: 'string',
    })
    .option('miniapps', {
      alias: 'm',
      describe: 'A list of one or more MiniApp(s)',
      type: 'array',
    })
    .coerce('miniapps', d => d.map(PackagePath.fromString))
    .option('packageName', {
      alias: 'p',
      describe: 'Android application package name',
      type: 'string',
    })
    .option('watchNodeModules', {
      alias: 'w',
      describe:
        'A list of one or more directory name from node_modules that should be watched for changes',
      type: 'array',
    })
    .option('disableBinaryStore', {
      describe:
        'Disable automatic retrieval of the binary from the Binary Store',
      type: 'boolean',
    })
    .option('host', {
      describe: 'Host/IP to use for the local packager',
      type: 'string',
    })
    .option('port', {
      default: '8081',
      describe: 'Port to use for the local package',
      type: 'string',
    })
    .group(
      ['activityName', 'launchFlags', 'packageName'],
      'Android binary launch options:'
    )
    .group(
      ['bundleId', 'launchEnvVars', 'launchArgs'],
      'iOS binary launch options:'
    )
    .group(['disableBinaryStore', 'flavor'], 'Binary store specific options:')
    .epilog(epilog(exports))
}

interface StartMiniApp {
  linkedPkg?: PackagePath
  name?: string
  pkg: PackagePath
}

export const commandHandler = async ({
  activityName,
  baseComposite,
  bundleId,
  compositeDir,
  descriptor,
  extraJsDependencies = [],
  flavor,
  host,
  jsApiImpls,
  launchArgs,
  launchEnvVars,
  launchFlags,
  miniapps,
  packageName,
  port,
  watchNodeModules,
  disableBinaryStore,
}: {
  activityName?: string
  baseComposite?: PackagePath
  bundleId?: string
  compositeDir?: string
  descriptor?: AppVersionDescriptor
  extraJsDependencies?: PackagePath[]
  flavor?: string
  host?: string
  jsApiImpls?: PackagePath[]
  launchArgs?: string
  launchEnvVars?: string
  launchFlags?: string
  miniapps?: PackagePath[]
  packageName?: string
  port?: string
  watchNodeModules?: string[]
  disableBinaryStore?: boolean
} = {}) => {
  await logErrorAndExitIfNotSatisfied({
    metroServerIsNotRunning: {
      extraErrorMessage: `You should kill the current server before running this command.`,
      host: host || 'localhost',
      port: port || '8081',
    },
  })

  if (!miniapps && !descriptor) {
    descriptor = await askUserToChooseANapDescriptorFromCauldron()
  }

  if (descriptor) {
    const cauldron = await getActiveCauldron({ throwIfNoActiveCauldron: false })
    miniapps = await cauldron.getContainerMiniApps(descriptor)
  }

  const localPathMiniApps = miniapps!.filter(m => m.isFilePath)
  const registryMiniApps = miniapps!.filter(m => m.isRegistryPath)
  const gitMiniApps = miniapps!.filter(m => m.isGitPath)

  const miniAppsLinks: { [k: string]: string } = config.get('miniAppsLinks', {})

  const startMiniApps: StartMiniApp[] = localPathMiniApps.map(m => ({
    linkedPkg: m,
    name: m.name,
    pkg: m,
  }))

  //
  // We need to figure out, for each miniapp coming from a git or registry path,
  // if the miniapp has been linked locally. To achieve this, we need to match
  // the package name of the provided miniapp with one that has been linked.

  // Start by matching registry based miniapps with linked miniapps
  for (const miniApp of registryMiniApps) {
    // If the miniapp is a registry path, this is pretty straigtforward,
    // as the package name is part of the registry path.
    // The miniapp is either linked (in which case we use its local path
    // rather than its package name) or unlinked (in which case we just
    // use its package name)
    startMiniApps.push(
      miniAppsLinks[miniApp.name!]
        ? {
            linkedPkg: PackagePath.fromString(miniAppsLinks[miniApp.name!]),
            name: miniApp.name,
            pkg: miniApp,
          }
        : {
            name: miniApp.name,
            pkg: miniApp,
          }
    )
  }

  // Build an array containing the package names of the linked miniapps
  // which have not yet been matched with any miniapps to start
  const unmatchedLinkedMiniApps: string[] = _.difference(
    Object.keys(miniAppsLinks),
    startMiniApps.map(m => m.pkg.name!)
  )

  //
  // Now that all linked miniapps have been matched to registry miniapps,
  // any remaining unmatched linked miniapp might be associated to a
  // git based miniapp. Let's find these ones -if any-.
  // This is less straightforward than for registry based miniapps.
  // We need to look into the package.json of each linked miniapp
  // to see if we can find a matching git repository.
  // If we find a match that's perfect. If we don't find a match and
  // some of the linked miniapps do not define a git repository in
  // their package.json, we will have to ask the user if the git
  // provided miniapp is matching one linked miniapp. We will also
  // log a notice to let the user know that the git repository
  // should be specified in the package.json to avoid such interactive
  // prompt in subsequent runs.

  // Build a tuple of [package name, git parsed url] of unmatched linked miniapps.
  const remaininingLinkedMiniAppsWithGitRepo: Array<[
    string /* host:repo */,
    string /* package namge */
  ]> = []
  const remainingLinkedMiniAppsWithoutGitRepo: string[] = []
  for (const unmatchedLinkedMiniApp of unmatchedLinkedMiniApps) {
    const pJson = await readPackageJson(miniAppsLinks[unmatchedLinkedMiniApp])
    if (pJson.repository?.type === 'git' && pJson.repository?.url) {
      remaininingLinkedMiniAppsWithGitRepo.push([
        `${gh(pJson.repository.url)?.hostname}:${
          gh(pJson.repository.url)?.name
        }`,
        pJson.name,
      ])
    } else {
      remainingLinkedMiniAppsWithoutGitRepo.push(pJson.name)
    }
  }

  // Build a list of tuple of parsed git urls of supplied git miniapps
  const remainingSuppliedGitMiniApps: Array<[
    string /* host:repo */,
    PackagePath /* git packagepath */
  ]> = gitMiniApps.map(m => [
    `${gh(m.fullPath)?.hostname}:${gh(m.fullPath)?.name}`,
    m,
  ])

  // Find matching git miniapps
  const matchedGitMiniApps: Array<[
    string /* host:repo */,
    string /* package namge */
  ]> = _.intersectionWith(
    remaininingLinkedMiniAppsWithGitRepo,
    remainingSuppliedGitMiniApps,
    ([a], [b]) => a === b
  )

  // Add the matched git miniapps to the list of start miniapps
  for (const matchedGitMiniApp of matchedGitMiniApps) {
    const linkedPkg = PackagePath.fromString(
      miniAppsLinks[matchedGitMiniApp[1]]
    )
    startMiniApps.push({
      linkedPkg,
      name: linkedPkg.name,
      pkg: remainingSuppliedGitMiniApps.find(
        ([x]) => x === matchedGitMiniApp[0]
      )![1],
    })
    // Remove the matched git miniapp from the list of remaining
    // supplied git miniapps now that they have been matched
    _.remove(remainingSuppliedGitMiniApps, ([x]) => x === matchedGitMiniApp[0])
    _.remove(unmatchedLinkedMiniApps, x => x === linkedPkg.name)
  }

  // At this point, if we still have unmatched miniapp(s) left with no
  // git repository url set in their package.json, and still have some
  // supplied git miniapp(s) which have not been matched to any linked miniapp
  // we need help from the user to figure out if some git miniapps are
  // matching linked miniapps.
  if (
    remainingSuppliedGitMiniApps.length > 0 &&
    remainingLinkedMiniAppsWithoutGitRepo.length > 0
  ) {
    for (const pkgName of unmatchedLinkedMiniApps) {
      if (remainingLinkedMiniAppsWithoutGitRepo.length === 0) {
        break
      }
      const { userSelectedPackagePath } = await inquirer.prompt([
        <inquirer.Question>{
          choices: [
            { name: 'None', value: undefined },
            ...remainingSuppliedGitMiniApps.map(([hostAndRepo, pp]) => ({
              name: pp.fullPath,
              value: hostAndRepo,
            })),
          ],
          message: `Select the supplied git path corresponding to ${pkgName} package or 'None' if none apply`,
          name: 'userSelectedPackagePath',
          type: 'list',
        },
      ])
      if (userSelectedPackagePath) {
        const linkedPkg = PackagePath.fromString(miniAppsLinks[pkgName])
        startMiniApps.push({
          linkedPkg,
          name: linkedPkg.name,
          pkg: remainingSuppliedGitMiniApps.find(
            ([x]) => x === userSelectedPackagePath
          )![1],
        })
        _.remove(
          remainingSuppliedGitMiniApps,
          ([x]) => x === userSelectedPackagePath
        )
        log.info(`Please consider adding a git repository entry in ${path.join(
          linkedPkg.basePath,
          'package.json'
        )}
Formatted as :
  "repository": {
    "type" : "git",
    "url" : "https://[host]/[owner]/[repo].git"
  }
To avoid such a prompt in next runs.`)
      }
    }
  }

  // Finally, if there is still some git miniapps left, it means that they
  // have not been matched to any linked miniapp, so just add them to start
  // as unlinked
  if (remainingSuppliedGitMiniApps.length > 0) {
    for (const remainingSuppliedGitMiniApp of remainingSuppliedGitMiniApps) {
      startMiniApps.push({
        pkg: remainingSuppliedGitMiniApp[1],
      })
    }
  }

  const table = new Table({
    head: ['Supplied package path', 'Resolved package name', 'Local link path'],
  })
  for (const startMiniApp of startMiniApps) {
    table.push([
      startMiniApp.pkg.fullPath,
      startMiniApp.name || 'UNKNOWN',
      startMiniApp.linkedPkg?.fullPath || 'UNLINKED',
    ])
  }
  log.info(table.toString())

  await start({
    activityName,
    baseComposite,
    bundleId,
    compositeDir,
    descriptor,
    disableBinaryStore,
    extraJsDependencies,
    flavor,
    host,
    jsApiImpls,
    launchArgs,
    launchEnvVars,
    launchFlags,
    miniapps: startMiniApps.map(x => x.linkedPkg || x.pkg),
    packageName,
    port,
  })
}

export const handler = tryCatchWrap(commandHandler)

/*
 log.warn(`Missing git repository declaration in ${
        pJson.name
      } package.json.
path: ${path.join(v, 'package.json')}
Please consider adding a repository entry in the package.json to indicate the url of the git repository of this miniapp.
Such as :
  "repository": {
    "type" : "git",
    "url" : "https://[host]/[owner]/[repo].git"
  }
`)*/
