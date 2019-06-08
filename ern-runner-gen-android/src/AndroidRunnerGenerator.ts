import { RunnerGenerator, RunnerGeneratorConfig } from 'ern-runner-gen'
import { mustacheUtils, NativePlatform, shell } from 'ern-core'
import path from 'path'
import { android, utils } from 'ern-core'

const runnerHullPath = path.join(__dirname, 'hull')

export default class AndroidRunnerGenerator implements RunnerGenerator {
  public get platform(): NativePlatform {
    return 'android'
  }

  public async generate(config: RunnerGeneratorConfig): Promise<void> {
    const mustacheView = this.createMustacheView(config)
    shell.cp('-R', path.join(runnerHullPath, '*'), config.outDir)

    const filesToMustache = [
      'build.gradle',
      'app/build.gradle',
      'app/src/main/java/com/walmartlabs/ern/RunnerConfig.java',
      'gradle/wrapper/gradle-wrapper.properties',
    ].map(f => path.join(config.outDir, ...f.split('/')))

    for (const file of filesToMustache) {
      await mustacheUtils.mustacheRenderToOutputFileUsingTemplateFile(
        file,
        mustacheView,
        file
      )
    }
  }

  public async regenerateRunnerConfig(
    config: RunnerGeneratorConfig
  ): Promise<void> {
    const mustacheView = this.createMustacheView(config)
    const subPathToRunnerConfig = path.join(
      'app',
      'src',
      'main',
      'java',
      'com',
      'walmartlabs',
      'ern',
      'RunnerConfig.java'
    )
    const pathToRunnerConfigHull = path.join(
      runnerHullPath,
      subPathToRunnerConfig
    )
    const pathToRunnerConfig = path.join(config.outDir, subPathToRunnerConfig)
    shell.cp(pathToRunnerConfigHull, pathToRunnerConfig)
    await mustacheUtils.mustacheRenderToOutputFileUsingTemplateFile(
      pathToRunnerConfig,
      mustacheView,
      pathToRunnerConfig
    )
  }

  public createMustacheView(config: RunnerGeneratorConfig) {
    let mustacheView: any = {}
    const versions = android.resolveAndroidVersions(
      config.extra && config.extra.androidConfig
    )
    mustacheView = Object.assign(mustacheView, versions)

    mustacheView.isReactNativeDevSupportEnabled =
      config.reactNativeDevSupportEnabled === true ? 'true' : 'false'
    mustacheView.miniAppName = config.mainMiniAppName
    mustacheView.packagerHost = config.reactNativePackagerHost
    mustacheView.packagerPort = config.reactNativePackagerPort
    mustacheView.pascalCaseMiniAppName = utils.pascalCase(
      config.mainMiniAppName
    )

    return mustacheView
  }
}
