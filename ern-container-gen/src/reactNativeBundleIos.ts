import { BundlingResult, reactnative, shell } from 'ern-core'
import fs from 'fs'
import path from 'path'

export async function reactNativeBundleIos({
  dev,
  outDir,
  sourceMapOutput,
  cwd,
}: {
  dev?: boolean
  outDir: string
  sourceMapOutput?: string
  cwd?: string
}): Promise<BundlingResult> {
  cwd = cwd || process.cwd()
  const miniAppOutPath = path.join(
    outDir,
    'ElectrodeContainer',
    'Libraries',
    'MiniApp'
  )
  const bundleOutput = path.join(miniAppOutPath, 'MiniApp.jsbundle')
  const assetsDest = miniAppOutPath
  if (fs.existsSync(assetsDest)) {
    shell.rm('-rf', path.join(assetsDest, '{.*,*}'))
    shell.mkdir('-p', path.join(assetsDest, 'assets'))
    // Write a dummy file to the empty `assets` directory,
    // otherwise empty directories are not pushed to git repositories
    // which will lead to issues when building the iOS Container
    // if the assets directory is missing
    fs.writeFileSync(
      path.join(assetsDest, 'assets', 'README.md'),
      'React Native bundled assets will be stored in this directory'
    )
  }

  if (!fs.existsSync(miniAppOutPath)) {
    shell.mkdir('-p', miniAppOutPath)
  }

  shell.pushd(cwd)

  const entryFile = fs.existsSync(path.join(cwd, 'index.ios.js'))
    ? 'index.ios.js'
    : 'index.js'

  try {
    const result = await reactnative.bundle({
      assetsDest,
      bundleOutput,
      dev: !!dev,
      entryFile,
      platform: 'ios',
      sourceMapOutput,
    })
    return result
  } finally {
    shell.popd()
  }
}
