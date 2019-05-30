import * as schemas from './schemas'
import { NativeApplicationDescriptor, PackagePath } from 'ern-core'
import { exists, joiValidate, normalizeCauldronFilePath } from './util'
import _ from 'lodash'
import {
  Cauldron,
  CauldronCodePushEntry,
  CauldronNativeApp,
  CauldronNativeAppPlatform,
  CauldronNativeAppVersion,
  ICauldronDocumentStore,
  ICauldronFileStore,
  CauldronConfigLevel,
  CauldronObject,
  ITransactional,
} from './types'
import upgradeScripts from './upgrade-scripts/scripts'
import path from 'path'
import uuidv4 from 'uuid/v4'
import semver from 'semver'

const yarnLocksStoreDirectory = 'yarnlocks'
const bundlesStoreDirectory = 'bundles'

export type ContainerJsPackagesBranchesArrayKey =
  | 'jsApiImplsBranches'
  | 'miniAppsBranches'

export type ContainerJsPackagesVersionsArrayKey = 'jsApiImpls' | 'miniApps'

export type ContainerJsPackagesArrayKey =
  | ContainerJsPackagesBranchesArrayKey
  | ContainerJsPackagesVersionsArrayKey

export type ContainerPackagesArrayKey =
  | ContainerJsPackagesArrayKey
  | 'nativeDeps'

export default class CauldronApi implements ITransactional {
  public readonly documentStore: ICauldronDocumentStore
  public readonly fileStore: ICauldronFileStore

  constructor(
    documentStore: ICauldronDocumentStore,
    fileStore: ICauldronFileStore
  ) {
    this.documentStore = documentStore
    this.fileStore = fileStore
  }

  public async commit(message: string): Promise<void> {
    return this.documentStore.commit(message)
  }

  public async getCauldron(): Promise<Cauldron> {
    return this.documentStore.getCauldron()
  }

  // =====================================================================================
  // CAULDRON SCHEMA UPGRADE
  // =====================================================================================

  public async upgradeCauldronSchema(): Promise<void> {
    let currentSchemaVersion = await this.getCauldronSchemaVersion()
    if (currentSchemaVersion === schemas.schemaVersion) {
      throw new Error(
        `The Cauldron is already using the proper schema version ${currentSchemaVersion}`
      )
    }
    let isUpgradeStarted = false
    // We apply all upgrade scripts, one by one, starting from the current schema version
    for (const upgradeScript of upgradeScripts) {
      if (upgradeScript.from === currentSchemaVersion) {
        isUpgradeStarted = true
      }
      if (isUpgradeStarted) {
        await upgradeScript.upgrade(this)
        currentSchemaVersion = upgradeScript.to
      }
    }
  }

  // =====================================================================================
  // TRANSACTION MANAGEMENT (ITransactional)
  // =====================================================================================

  public async beginTransaction(): Promise<void> {
    await this.documentStore.beginTransaction()
    await this.fileStore.beginTransaction()
  }

  public async discardTransaction(): Promise<void> {
    await this.documentStore.discardTransaction()
    await this.fileStore.discardTransaction()
  }

  public async commitTransaction(message: string | string[]): Promise<void> {
    await this.documentStore.commitTransaction(message)
    await this.fileStore.commitTransaction(message)
  }

  // =====================================================================================
  // READ OPERATIONS
  // =====================================================================================

  public async getCauldronSchemaVersion(): Promise<string> {
    const cauldron = await this.getCauldron()
    return cauldron.schemaVersion || '0.0.0'
  }

  public async hasDescriptor(
    descriptor: NativeApplicationDescriptor
  ): Promise<boolean> {
    return descriptor.version
      ? this.hasVersion(descriptor)
      : descriptor.platform
      ? this.hasPlatform(descriptor)
      : this.hasNativeApplication(descriptor)
  }

  public async getDescriptor(
    descriptor: NativeApplicationDescriptor
  ): Promise<
    CauldronNativeApp | CauldronNativeAppPlatform | CauldronNativeAppVersion
  > {
    return descriptor.version
      ? this.getVersion(descriptor)
      : descriptor.platform
      ? this.getPlatform(descriptor)
      : this.getNativeApplication(descriptor)
  }

  public async hasNativeApplication(
    descriptor: NativeApplicationDescriptor
  ): Promise<boolean> {
    const cauldron = await this.getCauldron()
    const result = _.find(cauldron.nativeApps, n => n.name === descriptor.name)
    return result != null
  }

  public async hasPlatform(
    descriptor: NativeApplicationDescriptor
  ): Promise<boolean> {
    if (!(await this.hasNativeApplication(descriptor))) {
      return false
    }
    const platforms = await this.getPlatforms(descriptor)
    const result = _.find(platforms, p => p.name === descriptor.platform)
    return result != null
  }

  public async hasVersion(
    descriptor: NativeApplicationDescriptor
  ): Promise<boolean> {
    if (!(await this.hasPlatform(descriptor))) {
      return false
    }
    const versions = await this.getVersions(descriptor)
    const result = _.find(versions, v => v.name === descriptor.version)
    return result != null
  }

  public async getNativeApplications(): Promise<CauldronNativeApp[]> {
    const cauldron = await this.getCauldron()
    return cauldron.nativeApps
  }

  public async getNativeApplication(
    descriptor: NativeApplicationDescriptor
  ): Promise<CauldronNativeApp> {
    const cauldron = await this.getCauldron()
    const result = _.find(cauldron.nativeApps, n => n.name === descriptor.name)
    if (!result) {
      throw new Error(`Cannot find ${descriptor.toString()} in Cauldron`)
    }
    return result
  }

  public async getPlatforms(
    descriptor: NativeApplicationDescriptor
  ): Promise<CauldronNativeAppPlatform[]> {
    const app = await this.getNativeApplication(descriptor)
    return app.platforms
  }

  public async getPlatform(
    descriptor: NativeApplicationDescriptor
  ): Promise<CauldronNativeAppPlatform> {
    const platforms = await this.getPlatforms(descriptor)
    const result = _.find(platforms, p => p.name === descriptor.platform)
    if (!result) {
      throw new Error(`Cannot find ${descriptor.toString()} in Cauldron`)
    }
    return result
  }

  public async getVersions(
    descriptor: NativeApplicationDescriptor
  ): Promise<CauldronNativeAppVersion[]> {
    const platform = await this.getPlatform(descriptor)
    return platform.versions
  }

  public async getVersion(
    descriptor: NativeApplicationDescriptor
  ): Promise<CauldronNativeAppVersion> {
    const versions = await this.getVersions(descriptor)
    const result = _.find(versions, v => v.name === descriptor.version)
    if (!result) {
      throw new Error(`Cannot find ${descriptor.toString()} in Cauldron`)
    }
    return result
  }

  public async getCodePushEntries(
    descriptor: NativeApplicationDescriptor
  ): Promise<{ [key: string]: CauldronCodePushEntry[] }>
  public async getCodePushEntries(
    descriptor: NativeApplicationDescriptor,
    deploymentName: string
  ): Promise<CauldronCodePushEntry[]>
  public async getCodePushEntries(
    descriptor: NativeApplicationDescriptor,
    deploymentName?: string
  ): Promise<any> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    if (!deploymentName) {
      return version.codePush || {}
    } else {
      return version.codePush[deploymentName] || []
    }
  }

  public async getContainerMiniApps(
    descriptor: NativeApplicationDescriptor
  ): Promise<PackagePath[]> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    return version.container.miniApps.map(p => PackagePath.fromString(p))
  }

  public async getContainerMiniAppsBranches(
    descriptor: NativeApplicationDescriptor
  ): Promise<PackagePath[]> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    return (version.container.miniAppsBranches || []).map(b =>
      PackagePath.fromString(b)
    )
  }

  public async getContainerJsApiImplsBranches(
    descriptor: NativeApplicationDescriptor
  ): Promise<string[]> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    return version.container.jsApiImplsBranches || []
  }

  public async getContainerJsApiImpls(
    descriptor: NativeApplicationDescriptor
  ): Promise<string[]> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    return version.container.jsApiImpls
  }

  public async getContainerJsApiImpl(
    descriptor: NativeApplicationDescriptor,
    jsApiImplName: string
  ): Promise<string> {
    const jsApiImpls = await this.getContainerJsApiImpls(descriptor)
    const result = _.find(
      jsApiImpls,
      x => x === jsApiImplName || x.startsWith(`${jsApiImplName}@`)
    )
    if (!result) {
      throw new Error(
        `Cannot find ${jsApiImplName} JS API implementation in ${descriptor.toString()} Container`
      )
    }
    return result
  }

  public async isMiniAppInContainer(
    descriptor: NativeApplicationDescriptor,
    miniApp: PackagePath
  ): Promise<boolean> {
    this.throwIfPartialNapDescriptor(descriptor)
    const miniApps = await this.getContainerMiniApps(descriptor)
    const result = _.find(miniApps, m => m.basePath === miniApp.basePath)
    if (!result) {
      return false
    } else {
      return true
    }
  }

  public async getContainerMiniApp(
    descriptor: NativeApplicationDescriptor,
    miniApp: PackagePath
  ): Promise<PackagePath> {
    this.throwIfPartialNapDescriptor(descriptor)
    const miniApps = await this.getContainerMiniApps(descriptor)
    const result = _.find(miniApps, m => m.basePath === miniApp.basePath)
    if (!result) {
      throw new Error(
        `Cannot find ${
          miniApp.basePath
        } MiniApp in ${descriptor.toString()} Container`
      )
    }
    return result
  }

  public async getNativeDependencies(
    descriptor: NativeApplicationDescriptor
  ): Promise<PackagePath[]> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    return _.map(version.container.nativeDeps, d => PackagePath.fromString(d))
  }

  public async isNativeDependencyInContainer(
    descriptor: NativeApplicationDescriptor,
    nativeDep: PackagePath
  ): Promise<boolean> {
    this.throwIfPartialNapDescriptor(descriptor)
    const nativeDeps = await this.getNativeDependencies(descriptor)
    return !!_.find(nativeDeps, x => x.basePath === nativeDep.basePath)
  }

  public async getContainerNativeDependency(
    descriptor: NativeApplicationDescriptor,
    nativeDep: PackagePath
  ): Promise<PackagePath> {
    this.throwIfPartialNapDescriptor(descriptor)
    const nativeDeps = await this.getNativeDependencies(descriptor)
    const result = _.find(nativeDeps, x => x.basePath === nativeDep.basePath)
    if (!result) {
      throw new Error(
        `Cannot find ${
          nativeDep.basePath
        } native dependency in ${descriptor.toString()} Container`
      )
    }
    return result
  }

  public async getConfig(
    descriptor?: NativeApplicationDescriptor
  ): Promise<any | void> {
    if (descriptor && !(await this.hasDescriptor(descriptor))) {
      throw new Error(`${descriptor} does not exist in Cauldron`)
    }
    const configByLevel = await this.getConfigByLevel(descriptor)
    return (
      configByLevel.get(CauldronConfigLevel.NativeAppVersion) ||
      configByLevel.get(CauldronConfigLevel.NativeAppPlatform) ||
      configByLevel.get(CauldronConfigLevel.NativeApp) ||
      configByLevel.get(CauldronConfigLevel.Top)
    )
  }

  public async delConfig(descriptor?: NativeApplicationDescriptor) {
    if (descriptor && !(await this.hasDescriptor(descriptor))) {
      throw new Error(`${descriptor} does not exist in Cauldron`)
    }
    const configFilePath = this.getConfigFilePath(descriptor)
    if (await this.fileStore.hasFile(configFilePath)) {
      await this.fileStore.removeFile(configFilePath)
    }
  }

  public async setConfig({
    descriptor,
    config,
  }: {
    descriptor?: NativeApplicationDescriptor
    config: any
  }) {
    if (descriptor && !(await this.hasDescriptor(descriptor))) {
      throw new Error(`${descriptor} does not exist in Cauldron`)
    }
    const configFilePath = this.getConfigFilePath(descriptor)
    return this.fileStore.storeFile(
      configFilePath,
      JSON.stringify(config, null, 2)
    )
  }

  public async updateConfig({
    descriptor,
    config,
  }: {
    descriptor?: NativeApplicationDescriptor
    config: any
  }) {
    if (descriptor && !(await this.hasDescriptor(descriptor))) {
      throw new Error(`${descriptor} does not exist in Cauldron`)
    }
    let newConfig = config
    const configFilePath = this.getConfigFilePath(descriptor)
    if (await this.fileStore.hasFile(configFilePath)) {
      const currentConf = await this.fileStore.getFile(configFilePath)
      const currentConfObj = JSON.parse((currentConf as Buffer).toString())
      newConfig = Object.assign(currentConfObj, config)
    }
    await this.fileStore.storeFile(
      configFilePath,
      JSON.stringify(newConfig, null, 2)
    )
  }

  public getConfigFilePath(descriptor?: NativeApplicationDescriptor) {
    return descriptor
      ? `config/${descriptor.name ? descriptor.name : ''}${
          descriptor.platform ? '-' + descriptor.platform : ''
        }${descriptor.version ? '-' + descriptor.version : ''}.json`
      : 'config/default.json'
  }

  public async getConfigByLevel(
    descriptor?: NativeApplicationDescriptor
  ): Promise<Map<CauldronConfigLevel, any>> {
    const result = new Map()
    let cauldronFilePath
    let config
    if (descriptor) {
      if (descriptor.platform) {
        if (descriptor.version) {
          cauldronFilePath = this.getConfigFilePath(descriptor)
          if (
            await this.hasFile({
              cauldronFilePath,
            })
          ) {
            config = await this.getFile({ cauldronFilePath })
            result.set(
              CauldronConfigLevel.NativeAppVersion,
              JSON.parse(config.toString())
            )
          }
        }

        cauldronFilePath = this.getConfigFilePath(descriptor.withoutVersion())
        if (
          await this.hasFile({
            cauldronFilePath,
          })
        ) {
          config = await this.getFile({ cauldronFilePath })
          result.set(
            CauldronConfigLevel.NativeAppPlatform,
            JSON.parse(config.toString())
          )
        }
      }
      cauldronFilePath = this.getConfigFilePath(
        NativeApplicationDescriptor.fromString(descriptor.name)
      )
      if (
        await this.hasFile({
          cauldronFilePath,
        })
      ) {
        config = await this.getFile({ cauldronFilePath })
        result.set(CauldronConfigLevel.NativeApp, JSON.parse(config.toString()))
      }
    }
    cauldronFilePath = this.getConfigFilePath()
    if (
      await this.hasFile({
        cauldronFilePath,
      })
    ) {
      config = await this.getFile({ cauldronFilePath })
      result.set(CauldronConfigLevel.Top, JSON.parse(config.toString()))
    }
    return result
  }

  public async getObjectMatchingDescriptor(
    descriptor?: NativeApplicationDescriptor
  ): Promise<CauldronObject> {
    if (!descriptor) {
      return this.getCauldron()
    } else {
      if (descriptor.version) {
        return this.getVersion(descriptor)
      } else if (descriptor.platform) {
        return this.getPlatform(descriptor)
      } else {
        return this.getNativeApplication(descriptor)
      }
    }
  }

  // =====================================================================================
  // WRITE OPERATIONS
  // =====================================================================================

  public async clearCauldron(): Promise<void> {
    const cauldron = await this.getCauldron()
    cauldron.nativeApps = []
    return this.commit('Clear Cauldron')
  }

  public async addDescriptor(
    descriptor: NativeApplicationDescriptor
  ): Promise<void> {
    if (!(await this.hasNativeApplication(descriptor))) {
      await this.createNativeApplication({ name: descriptor.name })
    }
    if (descriptor.platform && !(await this.hasPlatform(descriptor))) {
      await this.createPlatform(descriptor, { name: descriptor.platform })
    }
    if (descriptor.version && !(await this.hasVersion(descriptor))) {
      await this.createVersion(descriptor, { name: descriptor.version })
    }
  }

  public async removeDescriptor(
    descriptor: NativeApplicationDescriptor
  ): Promise<void> {
    if (descriptor.version) {
      return this.removeVersion(descriptor)
    } else if (descriptor.platform) {
      return this.removePlatform(descriptor)
    } else {
      return this.removeNativeApplication(descriptor)
    }
  }

  public async createNativeApplication(nativeApplication: any): Promise<void> {
    const cauldron = await this.getCauldron()
    if (exists(cauldron.nativeApps, nativeApplication.name)) {
      throw new Error(`${nativeApplication.name} already exists`)
    }
    const validatedNativeApplication = await joiValidate(
      nativeApplication,
      schemas.nativeApplication
    )
    cauldron.nativeApps.push(validatedNativeApplication)
    cauldron.nativeApps.sort((a, b) => a.name.localeCompare(b.name))
    return this.commit(`Create ${nativeApplication.name} native application`)
  }

  public async removeNativeApplication(
    descriptor: NativeApplicationDescriptor
  ): Promise<void> {
    const cauldron = await this.getCauldron()
    if (!exists(cauldron.nativeApps, descriptor.name)) {
      throw new Error(`${descriptor.name} was not found in Cauldron`)
    }
    _.remove(cauldron.nativeApps, x => x.name === descriptor.name)
    return this.commit(`Remove ${descriptor.toString()}`)
  }

  public async createPlatform(
    descriptor: NativeApplicationDescriptor,
    platform: any
  ): Promise<void> {
    const nativeApplication = await this.getNativeApplication(descriptor)
    const platformName = platform.name
    if (exists(nativeApplication.platforms, platform.name)) {
      throw new Error(
        `${platformName} platform already exists for ${descriptor.toString()}`
      )
    }
    const validatedPlatform = await joiValidate(
      platform,
      schemas.nativeApplicationPlatform
    )
    nativeApplication.platforms.push(validatedPlatform)
    nativeApplication.platforms.sort((a, b) => a.name.localeCompare(b.name))
    return this.commit(
      `Create ${platformName} platform for ${descriptor.toString()}`
    )
  }

  public async removePlatform(descriptor: NativeApplicationDescriptor) {
    const platform = descriptor.platform
    if (!platform) {
      throw new Error(
        'removePlatform: descriptor should include the platform to be removed'
      )
    }
    const nativeApplication = await this.getNativeApplication(descriptor)
    if (!exists(nativeApplication.platforms, platform)) {
      throw new Error(
        `${platform} platform does not exist for ${
          descriptor.name
        } native application`
      )
    }
    _.remove(nativeApplication.platforms, x => x.name === platform)
    return this.commit(`Remove ${descriptor.toString()}`)
  }

  public async createVersion(
    descriptor: NativeApplicationDescriptor,
    version: any
  ): Promise<void> {
    const platform = await this.getPlatform(descriptor)
    const versionName = version.name
    if (exists(platform.versions, versionName)) {
      throw new Error(
        `${versionName} version already exists for ${descriptor.toString()}`
      )
    }
    const validatedVersion = await joiValidate(
      version,
      schemas.nativeApplicationVersion
    )
    platform.versions.push(validatedVersion)
    const semverCompliantVersions = platform.versions.filter(
      v => semver.valid(v.name) !== null
    )
    const semverNonCompliantVersions = platform.versions.filter(
      v => semver.valid(v.name) === null
    )
    semverCompliantVersions.sort((a, b) => semver.compare(a.name, b.name))
    semverNonCompliantVersions.sort()
    platform.versions = [
      ...semverCompliantVersions,
      ...semverNonCompliantVersions,
    ]
    return this.commit(
      `Create version ${versionName} for ${descriptor.toString()}`
    )
  }

  public async removeVersion(
    descriptor: NativeApplicationDescriptor
  ): Promise<void> {
    const versionName = descriptor.version
    if (!versionName) {
      throw new Error(
        'removeVersion: descriptor should include the version to be removed'
      )
    }
    const platform = await this.getPlatform(descriptor)
    if (!exists(platform.versions, versionName)) {
      throw new Error(
        `${versionName} version does not exist for ${descriptor.toString()}`
      )
    }
    _.remove(platform.versions, x => x.name === versionName)
    return this.commit(`Remove ${descriptor.toString()}`)
  }

  public async updateVersion(
    descriptor: NativeApplicationDescriptor,
    newVersion: any
  ): Promise<void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const validatedVersion = await joiValidate(
      newVersion,
      schemas.nativeAplicationVersionPatch
    )
    const version = await this.getVersion(descriptor)
    if (validatedVersion.isReleased != null) {
      version.isReleased = validatedVersion.isReleased
      await this.commit(`Update release status of ${descriptor.toString()}`)
    }
  }

  public async addOrUpdateDescription(
    descriptor: NativeApplicationDescriptor,
    description: string
  ): Promise<void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    version.description = description
    await this.commit(`Update description of ${descriptor.toString()}`)
  }

  // ------------------------------------------------------------------------------
  // Container versioning
  // ------------------------------------------------------------------------------

  public async updateTopLevelContainerVersion(
    descriptor: NativeApplicationDescriptor,
    newContainerVersion: string
  ): Promise<void> {
    const platform = await this.getPlatform(descriptor)
    platform.containerVersion = newContainerVersion
    return this.commit(
      `Update top level Container version of ${descriptor.toString()} to ${newContainerVersion}`
    )
  }

  public async updateContainerVersion(
    descriptor: NativeApplicationDescriptor,
    newContainerVersion: string
  ): Promise<void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    version.containerVersion = newContainerVersion
    return this.commit(
      `Update container version of ${descriptor.toString()} to ${newContainerVersion}`
    )
  }

  public async getTopLevelContainerVersion(
    descriptor: NativeApplicationDescriptor
  ): Promise<string | void> {
    const platform = await this.getPlatform(descriptor)
    return platform.containerVersion
  }

  public async getContainerVersion(
    descriptor: NativeApplicationDescriptor
  ): Promise<string> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    return version.containerVersion
  }

  // ------------------------------------------------------------------------------
  // Ern version used for Container generation
  // ------------------------------------------------------------------------------

  public async updateContainerErnVersion(
    descriptor: NativeApplicationDescriptor,
    ernVersion: string
  ) {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    version.container.ernVersion = ernVersion
    return this.commit(
      `Update version of ern used to generate Container of ${descriptor.toString()}`
    )
  }

  public async getContainerErnVersion(
    descriptor: NativeApplicationDescriptor
  ): Promise<string | void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    return version.container.ernVersion
  }

  public async hasCodePushEntries(
    descriptor: NativeApplicationDescriptor,
    deploymentName: string
  ): Promise<boolean> {
    const version = await this.getVersion(descriptor)
    return version.codePush[deploymentName] != null
  }

  public async addCodePushEntry(
    descriptor: NativeApplicationDescriptor,
    codePushEntry: CauldronCodePushEntry
  ): Promise<void> {
    const version = await this.getVersion(descriptor)
    const deploymentName = codePushEntry.metadata.deploymentName
    version.codePush[deploymentName]
      ? version.codePush[deploymentName].push(codePushEntry)
      : (version.codePush[deploymentName] = [codePushEntry])
    return this.commit(`New CodePush OTA update for ${descriptor.toString()}`)
  }

  public async setCodePushEntries(
    descriptor: NativeApplicationDescriptor,
    deploymentName: string,
    codePushEntries: CauldronCodePushEntry[]
  ): Promise<void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    version.codePush[deploymentName] = codePushEntries
    return this.commit(`Set codePush entries in ${descriptor.toString()}`)
  }

  // =====================================================================================
  // FILE OPERATIONS
  // =====================================================================================

  // -------------------------------------------------------------------------------------
  // ARBITRARY FILE ACCESS
  // -------------------------------------------------------------------------------------

  public async addFile({
    cauldronFilePath,
    fileContent,
    fileMode,
  }: {
    cauldronFilePath: string
    fileContent: string | Buffer
    fileMode?: string
  }) {
    if (!cauldronFilePath) {
      throw new Error('[addFile] cauldronFilePath is required')
    }
    if (!fileContent) {
      throw new Error('[addFile] fileContent is required')
    }
    cauldronFilePath = normalizeCauldronFilePath(cauldronFilePath)
    if (await this.hasFile({ cauldronFilePath })) {
      throw new Error(
        `[addFile] ${cauldronFilePath} already exists. Use updateFile instead.`
      )
    }
    return this.fileStore.storeFile(cauldronFilePath, fileContent, fileMode)
  }

  public async updateFile({
    cauldronFilePath,
    fileContent,
    fileMode,
  }: {
    cauldronFilePath: string
    fileContent: string | Buffer
    fileMode?: string
  }) {
    if (!cauldronFilePath) {
      throw new Error('[updateFile] cauldronFilePath is required')
    }
    if (!fileContent) {
      throw new Error('[updateFile] fileContent is required')
    }
    cauldronFilePath = normalizeCauldronFilePath(cauldronFilePath)
    if (!(await this.hasFile({ cauldronFilePath }))) {
      throw new Error(
        `[updateFile] ${cauldronFilePath} does not exist. Use addFile first.`
      )
    }
    return this.fileStore.storeFile(cauldronFilePath, fileContent, fileMode)
  }

  public async removeFile({ cauldronFilePath }: { cauldronFilePath: string }) {
    if (!cauldronFilePath) {
      throw new Error('[removeFile] cauldronFilePath is required')
    }
    cauldronFilePath = normalizeCauldronFilePath(cauldronFilePath)
    if (!(await this.hasFile({ cauldronFilePath }))) {
      throw new Error(`[removeFile] ${cauldronFilePath} does not exist`)
    }
    return this.fileStore.removeFile(cauldronFilePath)
  }

  public async hasFile({ cauldronFilePath }: { cauldronFilePath: string }) {
    cauldronFilePath = normalizeCauldronFilePath(cauldronFilePath)
    return this.fileStore.hasFile(cauldronFilePath)
  }

  public async getFile({
    cauldronFilePath,
  }: {
    cauldronFilePath: string
  }): Promise<Buffer> {
    if (!cauldronFilePath) {
      throw new Error('[removeFile] cauldronFilePath is required')
    }
    cauldronFilePath = normalizeCauldronFilePath(cauldronFilePath)
    if (!(await this.hasFile({ cauldronFilePath }))) {
      throw new Error(`[getFile] ${cauldronFilePath} does not exist.`)
    }
    const result = await this.fileStore.getFile(cauldronFilePath)
    return result as Buffer
  }

  // -------------------------------------------------------------------------------------
  // YARN LOCKS STORE ACCESS
  // -------------------------------------------------------------------------------------

  /**
   * Gets the relative path (from the root of the Cauldron repo) to
   * a given yarn lock file
   * @param yarnLockFileName Yarn lock file name
   */
  public getRelativePathToYarnLock(yarnLockFileName: string): string {
    return path.join(yarnLocksStoreDirectory, yarnLockFileName)
  }

  public async hasYarnLock(
    descriptor: NativeApplicationDescriptor,
    key: string
  ): Promise<boolean> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    if (version.yarnLocks[key]) {
      return true
    } else {
      return false
    }
  }

  public async addYarnLock(
    descriptor: NativeApplicationDescriptor,
    key: string,
    yarnlock: string | Buffer
  ): Promise<string> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    const fileName = uuidv4()
    const pathToYarnLock = this.getRelativePathToYarnLock(fileName)
    await this.fileStore.storeFile(pathToYarnLock, yarnlock)
    version.yarnLocks[key] = fileName
    await this.commit(`Add yarn.lock for ${descriptor.toString()} ${key}`)
    return fileName
  }

  public async copyYarnLock(
    sourceDescriptor: NativeApplicationDescriptor,
    targetDescriptor: NativeApplicationDescriptor,
    key: string
  ): Promise<string | void> {
    this.throwIfPartialNapDescriptor(sourceDescriptor)
    this.throwIfPartialNapDescriptor(targetDescriptor)
    const sourceYarnLock = await this.getYarnLock(sourceDescriptor, key)
    if (sourceYarnLock) {
      return this.addYarnLock(targetDescriptor, key, sourceYarnLock)
    }
  }

  public async getYarnLockId(
    descriptor: NativeApplicationDescriptor,
    key: string
  ): Promise<string | void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    return version.yarnLocks[key]
  }

  public async setYarnLockId(
    descriptor: NativeApplicationDescriptor,
    key: string,
    id: string
  ): Promise<void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    version.yarnLocks[key] = id
    return this.commit(`Add yarn.lock for ${descriptor.toString()} ${key}`)
  }

  public async getYarnLock(
    descriptor: NativeApplicationDescriptor,
    key: string
  ): Promise<Buffer | void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    const fileName = version.yarnLocks[key]
    if (fileName) {
      const pathToYarnLock = this.getRelativePathToYarnLock(fileName)
      return this.fileStore.getFile(pathToYarnLock)
    }
  }

  public async getPathToYarnLock(
    descriptor: NativeApplicationDescriptor,
    key: string
  ): Promise<string | void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    const fileName = version.yarnLocks[key]
    if (fileName) {
      const pathToYarnLock = this.getRelativePathToYarnLock(fileName)
      return this.fileStore.getPathToFile(pathToYarnLock)
    }
  }

  public async removeYarnLock(
    descriptor: NativeApplicationDescriptor,
    key: string
  ): Promise<boolean> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    const fileName = version.yarnLocks[key]
    if (fileName) {
      const pathToYarnLock = this.getRelativePathToYarnLock(fileName)
      if (await this.fileStore.removeFile(pathToYarnLock)) {
        delete version.yarnLocks[key]
        await this.commit(
          `Remove yarn.lock for ${descriptor.toString()} ${key}`
        )
        return true
      }
    }
    return false
  }

  public async updateYarnLock(
    descriptor: NativeApplicationDescriptor,
    key: string,
    yarnlock: string | Buffer
  ): Promise<boolean> {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    const fileName = version.yarnLocks[key]
    if (fileName) {
      const pathToOldYarnLock = this.getRelativePathToYarnLock(fileName)
      await this.fileStore.removeFile(pathToOldYarnLock)
      const newYarnLockFileName = uuidv4()
      const pathToNewYarnLock = this.getRelativePathToYarnLock(
        newYarnLockFileName
      )
      await this.fileStore.storeFile(pathToNewYarnLock, yarnlock)
      version.yarnLocks[key] = newYarnLockFileName
      await this.commit(`Updated yarn.lock for ${descriptor.toString()} ${key}`)
      return true
    }
    return false
  }

  public async updateYarnLockId(
    descriptor: NativeApplicationDescriptor,
    key: string,
    id: string
  ) {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    const fileName = version.yarnLocks[key]
    if (fileName) {
      const pathToYarnLock = this.getRelativePathToYarnLock(fileName)
      await this.fileStore.removeFile(pathToYarnLock)
    }
    version.yarnLocks[key] = id
    await this.commit(
      `Updated yarn.lock id for ${descriptor.toString()} ${key}`
    )
  }

  public async setYarnLocks(
    descriptor: NativeApplicationDescriptor,
    yarnLocks: any
  ) {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    version.yarnLocks = yarnLocks
    await this.commit(`Set yarn locks for ${descriptor.toString()}`)
  }

  // -------------------------------------------------------------------------------------
  // BUNDLES STORE ACCESS
  // -------------------------------------------------------------------------------------

  /**
   * Gets the relative path (from the root of the Cauldron repo) to
   * a given bundle file
   * @param bundleFileName Bundle file name
   */
  public getRelativePathToBundle(bundleFileName: string): string {
    return path.join(bundlesStoreDirectory, bundleFileName)
  }

  public async addBundle(
    descriptor: NativeApplicationDescriptor,
    bundle: string | Buffer
  ) {
    this.throwIfPartialNapDescriptor(descriptor)
    const filename = this.getBundleZipFileName(descriptor)
    const pathToBundle = this.getRelativePathToBundle(filename)
    await this.fileStore.storeFile(pathToBundle, bundle)
    return this.commit(`Add bundle for ${descriptor.toString()}`)
  }

  public async hasBundle(
    descriptor: NativeApplicationDescriptor
  ): Promise<boolean> {
    this.throwIfPartialNapDescriptor(descriptor)
    const filename = this.getBundleZipFileName(descriptor)
    const pathToBundle = this.getRelativePathToBundle(filename)
    return this.fileStore.hasFile(pathToBundle)
  }

  public async getBundle(
    descriptor: NativeApplicationDescriptor
  ): Promise<Buffer> {
    this.throwIfPartialNapDescriptor(descriptor)
    const filename = this.getBundleZipFileName(descriptor)
    const pathToBundle = this.getRelativePathToBundle(filename)
    const zippedBundle = await this.fileStore.getFile(pathToBundle)
    if (!zippedBundle) {
      throw new Error(
        `No zipped bundle stored in Cauldron for ${descriptor.toString()}`
      )
    }
    return zippedBundle
  }

  public getBundleZipFileName(descriptor: NativeApplicationDescriptor): string {
    this.throwIfPartialNapDescriptor(descriptor)
    return `${descriptor.toString().replace(/:/g, '-')}.zip`
  }

  /**
   * Empty the Container of a given native application version
   * Removes all MiniApps/JsApiImpls and native dependencies from
   * the target Container and Container yarn lock
   * @param descriptor Target native application version descriptor
   */
  public async emptyContainer(descriptor: NativeApplicationDescriptor) {
    this.throwIfPartialNapDescriptor(descriptor)
    const version = await this.getVersion(descriptor)
    version.container.jsApiImpls = []
    version.container.miniApps = []
    version.container.nativeDeps = []
    delete version.yarnLocks.container
    await this.commit(`Empty Container of ${descriptor}`)
  }

  public throwIfPartialNapDescriptor(
    napDescriptor: NativeApplicationDescriptor
  ) {
    if (napDescriptor.isPartial) {
      throw new Error(
        `Cannot work with a partial native application descriptor`
      )
    }
  }

  public throwIfNoVersionInPackagePath(packagePath: PackagePath) {
    if (!packagePath.version) {
      throw new Error(`No version/branch/tag specified in ${packagePath}`)
    }
  }

  public async hasJsPackageBranchInContainer(
    descriptor: NativeApplicationDescriptor,
    jsPackage: PackagePath,
    key: ContainerJsPackagesBranchesArrayKey
  ) {
    this.throwIfPartialNapDescriptor(descriptor)
    const container = (await this.getVersion(descriptor)).container
    return (
      _.find(container[key] || [], p =>
        jsPackage.same(PackagePath.fromString(p), { ignoreVersion: true })
      ) !== undefined
    )
  }

  public async updatePackageInContainer(
    descriptor: NativeApplicationDescriptor,
    pkg: PackagePath,
    key: ContainerPackagesArrayKey
  ): Promise<void> {
    this.throwIfPartialNapDescriptor(descriptor)
    this.throwIfNoVersionInPackagePath(pkg)
    const container = (await this.getVersion(descriptor)).container
    const existingPkg = _.find(container[key], p =>
      pkg.same(PackagePath.fromString(p), { ignoreVersion: true })
    )
    if (!existingPkg) {
      throw new Error(
        `${pkg.basePath} does not exist in ${descriptor} Container`
      )
    }
    container[key] = _.map(container[key], e =>
      e === existingPkg ? pkg.fullPath : e
    )
    return this.commit(
      `Update ${pkg.basePath} to version ${
        pkg.version
      } in ${descriptor} Container`
    )
  }

  public async addPackageToContainer(
    descriptor: NativeApplicationDescriptor,
    pkg: PackagePath,
    key: ContainerPackagesArrayKey
  ): Promise<void> {
    this.throwIfPartialNapDescriptor(descriptor)
    if (!pkg.isFilePath) {
      this.throwIfNoVersionInPackagePath(pkg)
    }
    const container = (await this.getVersion(descriptor)).container
    if (!container[key]) {
      container[key] = []
    } else if (
      container[key]!.map(m => PackagePath.fromString(m).basePath).includes(
        pkg.basePath
      )
    ) {
      throw new Error(
        `${
          pkg.basePath
        } is already in ${descriptor} Container. Use update instead.`
      )
    }
    container[key]!.push(pkg.fullPath)
    return this.commit(
      `Add ${pkg.basePath} with version ${
        pkg.version
      } in ${descriptor} Container`
    )
  }

  public async removePackageFromContainer(
    descriptor: NativeApplicationDescriptor,
    pkg: PackagePath,
    key: ContainerPackagesArrayKey
  ): Promise<void> {
    this.throwIfPartialNapDescriptor(descriptor)
    const container = (await this.getVersion(descriptor)).container
    const existingPkg = _.find(container[key], p =>
      pkg.same(PackagePath.fromString(p), { ignoreVersion: true })
    )
    if (!existingPkg) {
      throw new Error(
        `${pkg.basePath} does not exist in ${descriptor} Container`
      )
    }
    _.remove(container[key]!, p => p === existingPkg)
    return this.commit(`Remove ${pkg} branch from ${descriptor} Container`)
  }
}
