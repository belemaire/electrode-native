import { addContainerMetadata as _addContainerMetadata } from './addContainerMetadata'
import { bundleMiniApps as _bundleMiniApps } from './bundleMiniApps'
import { copyRnpmAssets as _copyRnpmAssets } from './copyRnpmAssets'
import { generateMiniAppsComposite as _generateMiniAppsComposite } from './generateMiniAppsComposite'
import { generatePluginsMustacheViews as _generatePluginsMustacheViews } from './generatePluginsMustacheViews'
import { getContainerPlatform as _getContainerPlatform } from './getContainerPlatform'
import { injectReactNativeVersionKeysInObject as _injectReactNativeVersionKeysInObject } from './injectReactNativeVersionKeysInObject'
import { populateApiImplMustacheView as _populateApiImplMustacheView } from './populateApiImplMustacheView'
import { sortDependenciesByName as _sortDependenciesByName } from './sortDependenciesByName'
import { generateContainer as _generateContainer } from './generateContainer'
import { getContainerMetadata as _getContainerMetadata } from './getContainerMetadata'

export const addContainerMetadata = _addContainerMetadata
export const bundleMiniApps = _bundleMiniApps
export const copyRnpmAssets = _copyRnpmAssets
export const generateMiniAppsComposite = _generateMiniAppsComposite
export const generatePluginsMustacheViews = _generatePluginsMustacheViews
export const getContainerPlatform = _getContainerPlatform
export const injectReactNativeVersionKeysInObject = _injectReactNativeVersionKeysInObject
export const populateApiImplMustacheView = _populateApiImplMustacheView
export const sortDependenciesByName = _sortDependenciesByName
export const generateContainer = _generateContainer
export const getContainerMetadata = _getContainerMetadata

export default {
  addContainerMetadata: _addContainerMetadata,
  bundleMiniApps: _bundleMiniApps,
  copyRnpmAssets: _copyRnpmAssets,
  generateContainer: _generateContainer,
  generateMiniAppsComposite: _generateMiniAppsComposite,
  generatePluginsMustacheViews: _generatePluginsMustacheViews,
  getContainerMetadata: _getContainerMetadata,
  getContainerPlatform: _getContainerPlatform,
  injectReactNativeVersionKeysInObject: _injectReactNativeVersionKeysInObject,
  populateApiImplMustacheView: _populateApiImplMustacheView,
  sortDependenciesByName: _sortDependenciesByName,
}

export {
  ContainerGenerator,
  ContainerGeneratorConfig,
  ContainerGenResult,
} from './types'
