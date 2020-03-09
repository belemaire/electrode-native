import { manifest } from './Manifest'
import { PackagePath } from './PackagePath'
export interface AlignedDependency {
  name: string
  newVersion: string
  oldVersion: string
}

export async function alignPackageJson({
  manifestId,
  packageJson,
}: {
  manifestId: string
  packageJson: any
}): Promise<AlignedDependency[]> {
  const res: AlignedDependency[] = []

  const manifestDependencies = await manifest.getJsAndNativeDependencies({
    manifestId,
  })

  for (const manifestDependency of manifestDependencies) {
    if (packageJson.dependencies[manifestDependency.name!]) {
      const dependencyManifestVersion = manifestDependency.version
      const localDependencyVersion =
        packageJson.dependencies[manifestDependency.name!]
      if (dependencyManifestVersion !== localDependencyVersion) {
        res.push({
          name: manifestDependency.name!,
          newVersion: manifestDependency.version!,
          oldVersion: localDependencyVersion,
        })

        packageJson.dependencies[
          manifestDependency.name!
        ] = dependencyManifestVersion
      }
    }
  }

  return res
}
