import { Packages } from 'ern-core'
import { CauldronPackages } from './CauldronPackages'
export interface CauldronContainerPackages {
  miniApps?: CauldronPackages
  nativeModules?: CauldronPackages
  apis?: CauldronPackages
  jsApiImpls?: CauldronPackages
  nativeApiImpls?: CauldronPackages
}