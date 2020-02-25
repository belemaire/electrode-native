import {
  gitCli,
  log,
  PackagePath,
  shell,
  yarn,
  readPackageJson,
  writePackageJson,
  kax,
  YarnLockParser,
  findNativeDependencies,
} from 'ern-core'
import { cleanupCompositeDir } from './cleanupCompositeDir'
import {
  MiniAppsDeltas,
  getMiniAppsDeltas,
  getPackageJsonDependenciesUsingMiniAppDeltas,
  runYarnUsingMiniAppDeltas,
} from './miniAppsDeltasUtils'
import fs from 'fs-extra'
import path from 'path'
import semver from 'semver'
import _ from 'lodash'
import { CompositeGeneratorConfig } from './types'
import uuidv4 from 'uuid/v4'
import os from 'os'
import beautify from 'js-beautify'

export async function generateComposite(config: CompositeGeneratorConfig) {
  log.debug(`generateComposite config : ${JSON.stringify(config, null, 2)}`)

  // Set env var ERN_BUGSNAG_CODE_BUNDLE_ID as a unique code bundle id for bugsnag
  process.env.ERN_BUGSNAG_CODE_BUNDLE_ID =
    process.env.ERN_BUGSNAG_CODE_BUNDLE_ID ?? uuidv4()

  if (
    config.miniApps.length === 0 &&
    (config.jsApiImplDependencies || []).length === 0
  ) {
    throw new Error(
      `At least one MiniApp or JS API implementation is needed to generate a composite`
    )
  }

  return config.baseComposite
    ? generateCompositeFromBase(
        config.miniApps,
        config.outDir,
        config.baseComposite,
        {
          extraJsDependencies: config.extraJsDependencies,
          jsApiImplDependencies: config.jsApiImplDependencies,
        }
      )
    : generateFullComposite(config.miniApps, config.outDir, {
        extraJsDependencies: config.extraJsDependencies,
        jsApiImplDependencies: config.jsApiImplDependencies,
        pathToYarnLock: config.pathToYarnLock,
        resolutions: config.resolutions,
      })
}

async function generateCompositeFromBase(
  miniApps: PackagePath[],
  outDir: string,
  baseComposite: PackagePath,
  {
    extraJsDependencies = [],
    jsApiImplDependencies,
  }: {
    extraJsDependencies?: PackagePath[]
    jsApiImplDependencies?: PackagePath[]
  } = {}
) {
  if (baseComposite.isRegistryPath) {
    throw new Error(
      `baseComposite can only be a file or git path (${baseComposite})`
    )
  }

  if ((await fs.pathExists(outDir)) && (await fs.readdir(outDir)).length > 0) {
    throw new Error(
      `${outDir} directory exists and is not empty.
Composite output directory should either not exist (it will be created) or should be empty.`
    )
  } else {
    shell.mkdir('-p', outDir)
  }

  if (baseComposite.isGitPath) {
    await gitCli().clone(baseComposite.basePath, outDir)
    if (baseComposite.version) {
      await gitCli(outDir).checkout(baseComposite.version)
    }
  } else {
    shell.cp('-Rf', path.join(baseComposite.basePath, '{.*,*}'), outDir)
  }

  const jsPackages = jsApiImplDependencies
    ? [...miniApps, ...jsApiImplDependencies]
    : miniApps

  shell.pushd(outDir)
  try {
    await installJsPackagesWithoutYarnLock({ jsPackages, outDir })
    await createCompositeImportsJsBasedOnPackageJson({ outDir })
    if (extraJsDependencies) {
      await installExtraJsDependencies({ outDir, extraJsDependencies })
    }
  } finally {
    shell.popd()
  }
}

async function generateFullComposite(
  miniApps: PackagePath[],
  outDir: string,
  {
    extraJsDependencies = [],
    jsApiImplDependencies,
    pathToYarnLock,
    resolutions,
  }: {
    extraJsDependencies?: PackagePath[]
    jsApiImplDependencies?: PackagePath[]
    pathToYarnLock?: string
    resolutions?: { [pkg: string]: string }
  } = {}
) {
  if (await fs.pathExists(outDir)) {
    await kax
      .task('Cleaning up existing composite directory')
      .run(cleanupCompositeDir(outDir))
  } else {
    shell.mkdir('-p', outDir)
  }

  shell.pushd(outDir)

  try {
    await installJsPackages({
      jsApiImplDependencies,
      miniApps,
      outDir,
      pathToYarnLock,
    })
    await addStartScriptToPackageJson({ outDir })
    await createIndexJsBasedOnPackageJson({ outDir })
    if (extraJsDependencies) {
      await installExtraJsDependencies({
        extraJsDependencies: [
          PackagePath.fromString('ern-bundle-store-metro-asset-plugin'),
          ...extraJsDependencies,
        ],
        outDir,
      })
    }
    if (resolutions) {
      // This function should be be called prior to applying
      // any file patches in node_modules, as it will run
      // `yarn install`, thus potentially clearing any previously
      // applied patches
      await applyYarnResolutions({ outDir, resolutions })
    }
    await addBabelrcRoots({ outDir })
    await createCompositeBabelRc({ outDir })
    await createMetroConfigJs({ outDir })
    await createRnCliConfig({ outDir })
    const rnVersion = await getCompositeReactNativeVersion({ outDir })
    await addReactNativeDependencyToPackageJson(outDir, rnVersion)
    if (semver.lt(rnVersion, '0.60.0')) {
      await patchMetro51({ outDir })
    }
    await patchMetroBabelEnv({ outDir })
  } finally {
    shell.popd()
  }
}

export async function generateStartComposite(config: CompositeGeneratorConfig) {
  const {
    outDir,
    extraJsDependencies = [],
    jsApiImplDependencies = [],
    miniApps,
  } = config

  const reuseCompositeDir = await fs.pathExists(outDir)

  if (!(await fs.pathExists(outDir))) {
    shell.mkdir('-p', outDir)
  }

  shell.pushd(outDir)

  try {
    const linkedMiniApps = miniApps.filter(m => m.isFilePath)
    const unlinkedMiniApps = miniApps.filter(m => !m.isFilePath)

    // Install all JS API Implementations and unlinked MiniApps
    if (unlinkedMiniApps.length > 0 || jsApiImplDependencies.length > 0) {
      await installJsPackages({
        jsApiImplDependencies,
        miniApps: unlinkedMiniApps,
        outDir,
      })
    } else if (!reuseCompositeDir) {
      await yarn.init()
    }

    const compositePJson = await readPackageJson(outDir)
    const unlinkedPackages = Object.keys(compositePJson.dependencies || {})

    // List current top level native modules that have been installed
    // alongside with JS APIs implementations / unlinked MiniApps
    const tlNativeDependencies = await findNativeDependencies(
      path.join(outDir, 'node_modules')
    )
    let allNativeModules: PackagePath[] = [
      ...tlNativeDependencies.thirdPartyInManifest.map(t => t.packagePath),
      ...tlNativeDependencies.thirdPartyNotInManifest.map(t => t.packagePath),
    ]

    // List all native modules used by linked MiniApps
    for (const linkedMiniApp of linkedMiniApps) {
      const nativeDependencies = await findNativeDependencies(
        path.join(linkedMiniApp.basePath, 'node_modules')
      )
      const nativeModules = [
        ...nativeDependencies.thirdPartyInManifest.map(t => t.packagePath),
        ...nativeDependencies.thirdPartyNotInManifest.map(t => t.packagePath),
      ]
      allNativeModules.push(...nativeModules)
    }

    // Dedupe native modules array (based on name)
    allNativeModules = _.uniqWith(
      allNativeModules,
      (a, b) => a.basePath === b.basePath
    )
    log.trace(`allNativeModules: ${allNativeModules}`)
    extraJsDependencies.push(...allNativeModules)

    const miniAppPathByPackageName: Array<[string, string]> = []
    const linkedMiniAppsPackages: string[] = []
    for (const linkedMiniApp of linkedMiniApps) {
      const pjson: any = await readPackageJson(linkedMiniApp.basePath)
      linkedMiniAppsPackages.push(pjson.name)
      miniAppPathByPackageName.push([pjson.name, linkedMiniApp.basePath])
    }

    const miniAppsAndJsApiImplsPackages = [
      ...unlinkedPackages,
      ...linkedMiniAppsPackages,
    ]

    await addStartScriptToPackageJson({ outDir })
    await createIndexJsWithImports({
      dependencies: miniAppsAndJsApiImplsPackages,
      outDir,
    })

    let depsToInstall
    if (reuseCompositeDir) {
      const existingDependencies = Object.keys(
        compositePJson.dependencies
      ).map(k =>
        PackagePath.fromString(`${k}@${compositePJson.dependencies[k]}`)
      )
      depsToInstall = _.difference(
        extraJsDependencies.map(p => p.fullPath),
        existingDependencies.map(p => p.fullPath)
      )
    } else {
      depsToInstall = [
        PackagePath.fromString('ern-bundle-store-metro-asset-plugin'),
        PackagePath.fromString('react@16.8.6'),
        ...extraJsDependencies,
      ]
    }

    await installExtraJsDependencies({
      extraJsDependencies: depsToInstall,
      outDir,
    })

    await addBabelrcRoots({
      dependencies: miniAppsAndJsApiImplsPackages,
      outDir,
    })
    await createCompositeBabelRc({
      dependencies: miniAppsAndJsApiImplsPackages,
      outDir,
    })

    // also add react (even though if it's not a native module we need
    // to add it to exlusions because of haste)
    allNativeModules.push(PackagePath.fromString('react'))

    const blacklistRe: RegExp[] = []
    linkedMiniApps.forEach(m => {
      blacklistRe.push(
        ...allNativeModules.map(
          n =>
            new RegExp(
              `.*${path.normalize(m.basePath)}/node_modules/${n.basePath}/.*`
            )
        )
      )
    })

    const extraNodeModules = {}
    allNativeModules.forEach(m => {
      extraNodeModules[m.basePath] = `${outDir}/node_modules/${m.basePath}`
    })

    const watchFolders = linkedMiniApps.map(m => m.basePath)

    await createMetroConfigJs({
      blacklistRe,
      extraNodeModules,
      outDir,
      projectRoot: outDir,
      watchFolders,
    })
    await createRnCliConfig({ outDir })

    if (!reuseCompositeDir) {
      const rnVersion = await getCompositeReactNativeVersion({ outDir })
      if (semver.lt(rnVersion, '0.60.0')) {
        await patchMetro51({ outDir })
      }
      await patchMetroBabelEnv({ outDir })
    }
    // create linked miniapps symlinks
    for (const [name, p] of miniAppPathByPackageName) {
      if (!(await fs.pathExists(`${outDir}/node_modules/${name}`))) {
        await fs.symlink(p, `${outDir}/node_modules/${name}`)
      }
    }
  } finally {
    shell.popd()
  }
}

async function addReactNativeDependencyToPackageJson(
  dir: string,
  version: string
) {
  const compositePackageJson = await readPackageJson(dir)
  compositePackageJson.dependencies['react-native'] = version
  await writePackageJson(dir, compositePackageJson)
}

async function installJsPackagesUsingYarnLock({
  outDir,
  pathToYarnLock,
  jsPackages,
}: {
  outDir: string
  pathToYarnLock: string
  jsPackages: PackagePath[]
}) {
  const compositePackageJson: any = {}

  if (_.some(jsPackages, m => !m.version)) {
    throw new Error(
      '[generateComposite] When providing a yarn lock you cannot pass MiniApps without an explicit version'
    )
  }

  if (!(await fs.pathExists(pathToYarnLock))) {
    throw new Error(
      `[generateComposite] Path to yarn.lock does not exist (${pathToYarnLock})`
    )
  }

  log.debug(`Copying yarn.lock to ${outDir}`)
  shell.cp(pathToYarnLock, path.join(outDir, 'yarn.lock'))

  const yarnLock = await fs.readFile(pathToYarnLock, 'utf8')
  const miniAppsDeltas: MiniAppsDeltas = getMiniAppsDeltas(jsPackages, yarnLock)

  log.debug(
    `[generateComposite] miniAppsDeltas: ${JSON.stringify(miniAppsDeltas)}`
  )

  compositePackageJson.dependencies = getPackageJsonDependenciesUsingMiniAppDeltas(
    miniAppsDeltas,
    yarnLock
  )

  await writePackageJson(outDir, compositePackageJson)

  // Now that the composite package.json is similar to the one used to generated yarn.lock
  // we can run yarn install to get back to the exact same dependency graph as the previously
  // generated composite
  await kax.task('Running yarn install').run(yarn.install())
  await runYarnUsingMiniAppDeltas(miniAppsDeltas)
}

async function installJsPackagesWithoutYarnLock({
  outDir,
  jsPackages,
}: {
  outDir: string
  jsPackages: PackagePath[]
}) {
  // No yarn.lock path was provided, just add miniapps one by one
  log.debug('[generateComposite] no yarn lock provided')
  await yarn.init()
  const nbJsPackages = jsPackages.length
  for (let i = 0; i < nbJsPackages; i++) {
    await kax
      .task(`[${i + 1}/${nbJsPackages}] Adding ${jsPackages[i]}`)
      .run(yarn.add(jsPackages[i]))
  }
}

async function createIndexJsBasedOnPackageJson({ outDir }: { outDir: string }) {
  let entryIndexJsContent = ''

  const dependencies: string[] = []
  const compositePackageJson = await readPackageJson(outDir)
  for (const dependency of Object.keys(compositePackageJson.dependencies)) {
    entryIndexJsContent += `import '${dependency}'\n`
    dependencies.push(dependency)
  }

  await fs.writeFile(path.join(outDir, 'index.js'), entryIndexJsContent)
  // Still also generate index.android.js and index.ios.js for backward compatibility with
  // Container generated with Electrode Native < 0.33.0, as these Containers are still
  // looking for these files.
  // TO BE REMOVED IN 0.40.0
  await fs.writeFile(path.join(outDir, 'index.ios.js'), entryIndexJsContent)
  await fs.writeFile(path.join(outDir, 'index.android.js'), entryIndexJsContent)
}

async function createIndexJsWithImports({
  outDir,
  dependencies,
}: {
  outDir: string
  dependencies: string[]
}) {
  let entryIndexJsContent = ''

  for (const dependency of dependencies) {
    entryIndexJsContent += `import '${dependency}'\n`
  }

  await fs.writeFile(path.join(outDir, 'index.js'), entryIndexJsContent)
}

async function createCompositeImportsJsBasedOnPackageJson({
  outDir,
}: {
  outDir: string
}) {
  let content = ''

  const dependencies: string[] = []
  const compositePackageJson = await readPackageJson(outDir)
  for (const dependency of Object.keys(compositePackageJson.dependencies)) {
    content += `import '${dependency}'\n`
    dependencies.push(dependency)
  }

  await fs.writeFile(path.join(outDir, 'composite-imports.js'), content)
}

async function addStartScriptToPackageJson({ outDir }: { outDir: string }) {
  const packageJson = await readPackageJson(outDir)
  packageJson.scripts = {
    start: 'node node_modules/react-native/local-cli/cli.js start',
  }
  await writePackageJson(outDir, packageJson)
}

async function addBabelrcRoots({
  outDir,
  dependencies,
}: {
  outDir: string
  dependencies?: string[]
}) {
  const compositePackageJson = await readPackageJson(outDir)
  const compositeNodeModulesPath = path.join(outDir, 'node_modules')
  const compositeReactNativeVersion = await getCompositeReactNativeVersion({
    outDir,
  })
  const compositeMetroVersion = await getCompositeMetroVersion({ outDir })
  dependencies = dependencies || Object.keys(compositePackageJson.dependencies)

  // Any dependency that has the useBabelRc set in their package.json
  // as follow ...
  //
  // "ern": {
  //   "useBabelRc": true
  // }
  //
  // ... is added to the babelRcRoots array, so that we can properly
  // configure Babel to process the .babelrc of these dependencies.
  const babelRcRootsRe: RegExp[] = []
  const babelRcRootsPaths: string[] = []
  for (const dependency of dependencies) {
    if (await fs.pathExists(path.join(compositeNodeModulesPath, dependency))) {
      const depPackageJson = await readPackageJson(
        path.join(compositeNodeModulesPath, dependency)
      )
      if (depPackageJson.ern?.useBabelRc === true) {
        babelRcRootsRe.push(new RegExp(`node_modules\/${dependency}(?!.+\/)`))
        babelRcRootsPaths.push(`./node_modules/${dependency}`)
      }
    }
  }

  // If React Native version is greater or equal than 0.56.0
  // it is using Babel 7
  // In that case, because we still want to process .babelrc
  // of some MiniApps that need their .babelrc to be processed
  // during bundling, we need to use the babelrcRoots option of
  // Babel 7 (https://babeljs.io/docs/en/options#babelrcroots)
  // Unfortunately, there is no way -as of metro latest version-
  // to provide this option to the metro bundler.
  // A pull request will be opened to metro to properly support
  // this option, but meanwhile, we are just directly patching the
  // metro transformer source file to make use of this option.
  // This code will be kept even when a new version of metro supporting
  // this option will be released, to keep backward compatibility.
  // It will be deprecated at some point.
  if (
    semver.gte(compositeReactNativeVersion, '0.56.0') &&
    babelRcRootsRe.length > 0
  ) {
    let pathToFileToPatch
    if (semver.lt(compositeMetroVersion, '0.51.0')) {
      // For versions of metro < 0.51.0, we are patching the reactNativeTransformer.js file
      // https://github.com/facebook/metro/blob/v0.50.0/packages/metro/src/reactNativeTransformer.js#L120
      pathToFileToPatch = path.join(
        compositeNodeModulesPath,
        'metro/src/reactNativeTransformer.js'
      )
    } else {
      // For versions of metro >= 0.51.0, we are patching the index.js file
      // https://github.com/facebook/metro/blob/v0.51.0/packages/metro-react-native-babel-transformer/src/index.js#L120
      const pathInCommunityCli = path.join(
        compositeNodeModulesPath,
        '@react-native-community/cli/node_modules/metro-react-native-babel-transformer/src/index.js'
      )
      if (await fs.pathExists(pathInCommunityCli)) {
        pathToFileToPatch = pathInCommunityCli
      } else {
        pathToFileToPatch = path.join(
          compositeNodeModulesPath,
          'metro-react-native-babel-transformer/src/index.js'
        )
      }
    }

    const fileToPatch = await fs.readFile(pathToFileToPatch)
    const lineToPatch = `let config = Object.assign({}, babelRC, extraConfig);`
    // Just add extra code line to inject babelrcRoots option

    const patch = `extraConfig.babelrcRoots = [
${babelRcRootsRe.map(b => b.toString()).join(',')} ]
${lineToPatch}`
    const patchedFile = fileToPatch.toString().replace(lineToPatch, patch)
    await fs.writeFile(pathToFileToPatch, patchedFile)
  }

  // If React Native version is less than 0.56 it is still using Babel 6.
  // In that case .babelrc files will be processed in any node_modules
  // which is not a desired behavior.
  // Therefore we just remove all .babelrc from all node_modules.
  // We only keep .babelrc of node_modules that are "whitelisted",
  // as we want them to be processed.
  if (semver.lt(compositeReactNativeVersion, '0.56.0')) {
    log.debug('Removing .babelrc files from all modules')
    if (babelRcRootsPaths.length > 0) {
      log.debug(
        `Preserving .babelrc of whitelisted node_modules : ${JSON.stringify(
          babelRcRootsPaths,
          null,
          2
        )}`
      )
      for (const babelRcRoot of babelRcRootsPaths) {
        shell.cp(
          path.join(babelRcRoot, '.babelrc'),
          path.join(babelRcRoot, '.babelrcback')
        )
      }
    }
    shell.rm('-rf', path.join('node_modules', '**', '.babelrc'))
    if (babelRcRootsPaths.length > 0) {
      for (const babelRcRoot of babelRcRootsPaths) {
        shell.cp(
          path.join(babelRcRoot, '.babelrcback'),
          path.join(babelRcRoot, '.babelrc')
        )
      }
    }
  }
}

async function getCompositeReactNativeVersion({
  outDir,
}: {
  outDir: string
}): Promise<string> {
  const compositeNodeModulesPath = path.join(outDir, 'node_modules')
  const pathToReactNativeNodeModuleDir = path.join(
    compositeNodeModulesPath,
    'react-native'
  )

  const reactNativePackageJson = await readPackageJson(
    pathToReactNativeNodeModuleDir
  )
  return reactNativePackageJson.version
}

async function getCompositeMetroVersion({
  outDir,
}: {
  outDir: string
}): Promise<string> {
  const compositeNodeModulesPath = path.join(outDir, 'node_modules')
  const pathToMetroNodeModuleDir = path.join(compositeNodeModulesPath, 'metro')
  let metroPackageJson
  if (await fs.pathExists(pathToMetroNodeModuleDir)) {
    metroPackageJson = await readPackageJson(pathToMetroNodeModuleDir)
  }
  return metroPackageJson?.version ?? '0.0.0'
}

async function patchMetro51({ outDir }: { outDir: string }) {
  const metroVersion = await getCompositeMetroVersion({ outDir })
  const compositeNodeModulesPath = path.join(outDir, 'node_modules')
  // Only of use for RN < 0.60.0
  if (metroVersion === '0.51.1') {
    const pathToFileToPatch = path.join(
      compositeNodeModulesPath,
      'metro-resolver/src/resolve.js'
    )
    const stringToReplace = `const assetNames = resolveAsset(dirPath, fileNameHint, platform);`
    const replacementString = `let assetNames;
    try { assetNames = resolveAsset(dirPath, fileNameHint, platform); } catch (e) {}`
    const fileToPatch = await fs.readFile(pathToFileToPatch)
    const patchedFile = fileToPatch
      .toString()
      .replace(stringToReplace, replacementString)
    return fs.writeFile(pathToFileToPatch, patchedFile)
  }
}

//
// Patch a metro bug related to BABEL_ENV resolution
// This bug was fixed in metro through:
// https://github.com/facebook/metro/commit/c509a89af9015b6d6b34c07a26ea59b73d87cd53
// It has not been released yet and will anyway not be available for older
// versions of React Native.
// Patching is therefore done here, independently of the version of RN used.
// We can keep this patch potentially forever as the replacement it is doing can
// also be safely applied in any case, even on top of a metro release that contain the fix.
async function patchMetroBabelEnv({ outDir }: { outDir: string }) {
  const filesToPach = [
    path.join(
      outDir,
      'node_modules/metro-react-native-babel-transformer/src/index.js'
    ),
    path.join(outDir, 'node_modules/metro-babel-transformer/src/index.js'),
  ]
  const stringToReplace = 'process.env.BABEL_ENV = OLD_BABEL_ENV;'
  const replacementString =
    'if (OLD_BABEL_ENV) { process.env.BABEL_ENV = OLD_BABEL_ENV; }'
  for (const fileToPatch of filesToPach) {
    if (await fs.pathExists(fileToPatch)) {
      const file = await fs.readFile(fileToPatch)
      const patchedFile = file
        .toString()
        .replace(stringToReplace, replacementString)
      await fs.writeFile(fileToPatch, patchedFile)
    }
  }
}

export async function applyYarnResolutions({
  outDir,
  resolutions,
}: {
  outDir: string
  resolutions: { [pkg: string]: string }
}) {
  log.debug('Adding yarn resolutions to package.json')
  log.trace(`resolutions : ${JSON.stringify(resolutions, null, 2)}`)
  const compositePackageJson = await readPackageJson(outDir)
  compositePackageJson.resolutions = resolutions
  await writePackageJson(outDir, compositePackageJson)
  try {
    shell.pushd(outDir)
    await yarn.install()
  } finally {
    shell.popd()
  }
}

async function createCompositeBabelRc({
  outDir,
  dependencies,
}: {
  outDir: string
  dependencies?: string[]
}) {
  log.debug('Creating top level composite .babelrc')
  const compositePackageJson = await readPackageJson(outDir)
  const compositeNodeModulesPath = path.join(outDir, 'node_modules')
  const compositeReactNativeVersion = await getCompositeReactNativeVersion({
    outDir,
  })

  const compositeBabelRc: { plugins: any[]; presets?: string[] } = {
    plugins: [],
  }

  // Ugly hacky way of handling module-resolver babel plugin
  // At least it has some guarantees to make it safer but its just a temporary
  // solution until we figure out a more proper way of handling this plugin
  log.debug(
    'Taking care of potential Babel module-resolver plugins used by MiniApps'
  )

  let moduleResolverAliases: { [k: string]: any } = {}
  dependencies = dependencies || Object.keys(compositePackageJson.dependencies)
  for (const dependency of dependencies) {
    const miniAppPackagePath = path.join(compositeNodeModulesPath, dependency)
    let miniAppPackageJson
    try {
      miniAppPackageJson = await readPackageJson(miniAppPackagePath)
    } catch (e) {
      // swallow (for test. to be fixed)
      continue
    }
    const miniAppName = miniAppPackageJson.name
    if (miniAppPackageJson.babel) {
      if (miniAppPackageJson.babel.plugins) {
        for (const babelPlugin of miniAppPackageJson.babel.plugins) {
          if (Array.isArray(babelPlugin)) {
            if (babelPlugin.includes('module-resolver')) {
              // Add unique name to this composite top level module-resolver to avoid
              // it messing with other module-resolver plugin configurations that could
              // be defined in the .babelrc config of individual MiniApps
              // https://babeljs.io/docs/en/options#plugin-preset-merging
              babelPlugin.push(uuidv4())
              // Copy over module-resolver plugin & config to top level composite .babelrc
              log.debug(
                `Taking care of module-resolver Babel plugin for ${miniAppName} MiniApp`
              )
              if (compositeBabelRc.plugins.length === 0) {
                // First MiniApp to add module-resolver plugin & config
                // easy enough, we just copy over the plugin & config
                compositeBabelRc.plugins.push(<any>babelPlugin)
                for (const x of babelPlugin) {
                  if (x instanceof Object && x.alias) {
                    moduleResolverAliases = x.alias
                    break
                  }
                }
              } else {
                // Another MiniApp  has already declared module-resolver
                // plugin & config. If we have conflicts for aliases, we'll just abort
                // bundling as of now to avoid generating a potentially unstable bundle
                for (const item of babelPlugin) {
                  if (item instanceof Object && item.alias) {
                    for (const aliasKey of Object.keys(item.alias)) {
                      if (
                        moduleResolverAliases[aliasKey] &&
                        moduleResolverAliases[aliasKey] !== item.alias[aliasKey]
                      ) {
                        throw new Error('Babel module-resolver alias conflict')
                      } else if (!moduleResolverAliases[aliasKey]) {
                        moduleResolverAliases[aliasKey] = item.alias[aliasKey]
                      }
                    }
                  }
                }
              }
            } else {
              log.warn(
                `Unsupported Babel plugin type ${babelPlugin.toString()} in ${miniAppName} MiniApp`
              )
            }
          } else {
            log.warn(
              `Unsupported Babel plugin type ${babelPlugin.toString()} in ${miniAppName} MiniApp`
            )
          }
        }
      }
      log.debug(
        `Removing babel object from ${miniAppName} MiniApp package.json`
      )
      delete miniAppPackageJson.babel
      await writePackageJson(miniAppPackagePath, miniAppPackageJson)
    }
  }

  if (semver.gte(compositeReactNativeVersion, '0.57.0')) {
    compositeBabelRc.presets = ['module:metro-react-native-babel-preset']
  } else {
    compositeBabelRc.presets = ['react-native']
  }

  return fs.writeFile(
    path.join(outDir, '.babelrc'),
    JSON.stringify(compositeBabelRc, null, 2)
  )
}

async function createMetroConfigJs({
  outDir,
  projectRoot,
  blacklistRe,
  extraNodeModules,
  watchFolders,
}: {
  outDir: string
  projectRoot?: string
  blacklistRe?: RegExp[]
  extraNodeModules?: { [pkg: string]: string }
  watchFolders?: string[]
}) {
  return fs.writeFile(
    path.join(outDir, 'metro.config.js'),
    beautify.js(`const blacklist = require('metro-config/src/defaults/blacklist');
module.exports = {
  ${projectRoot ? `projectRoot: "${projectRoot}",` : ''}
  ${
    watchFolders
      ? `watchFolders: [ 
        ${watchFolders.map(x => `"${x}"`).join(`,${os.EOL}`)} 
      ],`
      : ''
  }
  resolver: {
    blacklistRE: blacklist([
      // Ignore IntelliJ directories
      /.*\\.idea\\/.*/,
      // ignore git directories
      /.*\\.git\\/.*/,
      // Ignore android directories
      /.*\\/app\\/build\\/.*/,
      ${blacklistRe ? blacklistRe.join(`,${os.EOL}`) : ''}
    ]),
    ${
      extraNodeModules
        ? `extraNodeModules: ${JSON.stringify(extraNodeModules, null, 2)},`
        : ''
    }
    assetExts: [
      // Image formats
      "bmp",
      "gif",
      "jpg",
      "jpeg",
      "png",
      "psd",
      "svg",
      "webp", 
      // Video formats
      "m4v",
      "mov",
      "mp4",
      "mpeg",
      "mpg",
      "webm", 
      // Audio formats
      "aac",
      "aiff",
      "caf",
      "m4a",
      "mp3",
      "wav", 
      // Document formats
      "html",
      "pdf",
      // Font formats
      "otf",
      "ttf", 
      // Archives (virtual files)
      "zip"
    ]
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
    assetPlugins: ['ern-bundle-store-metro-asset-plugin'],
  },
};
`)
  )
}

async function createRnCliConfig({ outDir }: { outDir: string }) {
  const compositeReactNativeVersion = await getCompositeReactNativeVersion({
    outDir,
  })
  let sourceExts
  if (semver.gte(compositeReactNativeVersion, '0.57.0')) {
    sourceExts =
      "module.exports = { resolver: { sourceExts: ['jsx', 'js', 'ts', 'tsx', 'mjs'] } };"
  } else {
    sourceExts =
      "module.exports = { getSourceExts: () => ['jsx', 'js', 'ts', 'tsx', 'mjs'] }"
  }
  await fs.writeFile(path.join(outDir, 'rn-cli.config.js'), sourceExts)
}

async function installJsPackages({
  jsApiImplDependencies,
  miniApps,
  outDir,
  pathToYarnLock,
}: {
  jsApiImplDependencies?: PackagePath[]
  miniApps: PackagePath[]
  outDir: string
  pathToYarnLock?: string
}) {
  const jsPackages = jsApiImplDependencies
    ? [...miniApps, ...jsApiImplDependencies]
    : miniApps

  if (pathToYarnLock && _.some(jsPackages, p => p.isFilePath)) {
    log.warn(
      'Yarn lock will not be used as some of the MiniApp paths are file based'
    )
    pathToYarnLock = undefined
  }

  if (pathToYarnLock) {
    await installJsPackagesUsingYarnLock({
      jsPackages,
      outDir,
      pathToYarnLock,
    })
  } else {
    await installJsPackagesWithoutYarnLock({ jsPackages, outDir })
  }
}

async function installExtraJsDependencies({
  outDir,
  extraJsDependencies,
}: {
  outDir: string
  extraJsDependencies: PackagePath[]
}) {
  shell.pushd(outDir)
  try {
    for (const extraJsDependency of extraJsDependencies || []) {
      await yarn.add(extraJsDependency)
    }
  } finally {
    shell.popd()
  }
}
