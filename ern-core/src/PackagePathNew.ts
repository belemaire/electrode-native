import { PackagePath } from './PackagePath'
import { PackageType } from './PackageType'
export interface PackagePathNew {
  name: string
  type: PackageType
  path: PackagePath
}