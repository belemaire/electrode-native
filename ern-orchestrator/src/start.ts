import {
  createTmpDir,
  android,
  ios,
  PackagePath,
  reactnative,
  ErnBinaryStore,
  log,
  kax,
  AppVersionDescriptor,
} from 'ern-core'
import { getActiveCauldron } from 'ern-cauldron-api'
import { Composite } from 'ern-composite-gen'
import _ from 'lodash'

export default async function start({
  baseComposite,
  compositeDir,
  jsApiImpls,
  miniapps,
  descriptor,
  flavor,
  launchArgs,
  launchEnvVars,
  launchFlags,
  packageName,
  activityName,
  bundleId,
  extraJsDependencies,
  disableBinaryStore,
  host,
  port,
}: {
  baseComposite?: PackagePath
  compositeDir?: string
  jsApiImpls?: PackagePath[]
  miniapps?: PackagePath[]
  descriptor?: AppVersionDescriptor
  flavor?: string
  launchArgs?: string
  launchEnvVars?: string
  launchFlags?: string
  packageName?: string
  activityName?: string
  bundleId?: string
  extraJsDependencies?: PackagePath[]
  disableBinaryStore?: boolean
  host?: string
  port?: string
} = {}) {
  const cauldron = await getActiveCauldron({ throwIfNoActiveCauldron: false })
  if (!cauldron && descriptor) {
    throw new Error(
      'To use a native application descriptor, a Cauldron must be active'
    )
  }

  if (!miniapps && !jsApiImpls && !descriptor) {
    throw new Error(
      'Either miniapps, jsApiImpls or descriptor needs to be provided'
    )
  }

  let resolutions
  if (descriptor) {
    miniapps = await cauldron.getContainerMiniApps(descriptor, {
      favorGitBranches: true,
    })
    const compositeGenConfig = await cauldron.getCompositeGeneratorConfig(
      descriptor
    )
    baseComposite = baseComposite || compositeGenConfig?.baseComposite
    resolutions = compositeGenConfig?.resolutions
  }

  compositeDir = compositeDir || createTmpDir()
  log.trace(`Temporary composite directory is ${compositeDir}`)

  const composite = await kax
    .task(`Generating composite in ${compositeDir}`)
    .run(
      Composite.generateStartComposite({
        baseComposite,
        extraJsDependencies: extraJsDependencies || [],
        jsApiImplDependencies: jsApiImpls,
        miniApps: miniapps!,
        outDir: compositeDir,
        resolutions,
      })
    )

  reactnative.startPackagerInNewWindow({
    cwd: compositeDir,
    host,
    port,
    provideModuleNodeModules: [
      'react-native',
      // ...linkedPackages,
      // ...watchNodeModules,
    ],
    resetCache: true,
  })

  if (descriptor && !disableBinaryStore) {
    const binaryStoreConfig = await cauldron.getBinaryStoreConfig()
    if (binaryStoreConfig) {
      const cauldronStartCommandConfig = await cauldron.getStartCommandConfig(
        descriptor
      )
      const binaryStore = new ErnBinaryStore(binaryStoreConfig)
      if (await binaryStore.hasBinary(descriptor, { flavor })) {
        if (descriptor.platform === 'android') {
          if (cauldronStartCommandConfig?.android) {
            packageName =
              packageName ?? cauldronStartCommandConfig.android.packageName
            activityName =
              activityName ?? cauldronStartCommandConfig.android.activityName
          }
          if (!packageName) {
            throw new Error(
              'You need to provide an Android package name or set it in Cauldron configuration'
            )
          }
          const apkPath = await kax
            .task('Downloading binary from store')
            .run(binaryStore.getBinary(descriptor, { flavor }))
          await android.runAndroidApk({
            activityName,
            apkPath,
            launchFlags,
            packageName,
          })
        } else if (descriptor.platform === 'ios') {
          if (cauldronStartCommandConfig?.ios) {
            bundleId = bundleId ?? cauldronStartCommandConfig.ios.bundleId
          }
          if (!bundleId) {
            throw new Error(
              'You need to provide an iOS bundle ID or set it in Cauldron configuration'
            )
          }
          const appPath = await kax
            .task('Downloading binary from store')
            .run(binaryStore.getBinary(descriptor, { flavor }))
          await ios.runIosApp({ appPath, bundleId, launchArgs, launchEnvVars })
        }
      }
    }
  }
}
