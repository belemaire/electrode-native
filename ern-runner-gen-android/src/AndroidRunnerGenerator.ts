import { RunnerGenerator, RunnerGeneratorConfig } from 'ern-runner-gen'
import { mustacheUtils, NativePlatform, shell } from 'ern-core'
import path from 'path'
import { android } from 'ern-core'

const runnerHullPath = path.join(__dirname, 'hull')
const defaultReactNativePackagerHost = 'localhost'
const defaultReactNativePackagerPort = '8081'

export default class AndroidRunnerGenerator implements RunnerGenerator {
  public get platform(): NativePlatform {
    return 'android'
  }

  public async generate(config: RunnerGeneratorConfig): Promise<void> {
    return mustacheUtils.mustacheDirectory({
      inputDir: runnerHullPath,
      mustacheView: createMustacheView(config),
      outputDir: config.outDir,
    })
  }

  public async regenerateRunnerConfig(
    config: RunnerGeneratorConfig
  ): Promise<void> {
    const mustacheView = createMustacheView(config)

    const subPathToRunnerConfig = path.normalize(
      'app/src/main/java/com/walmartlabs/ern/RunnerConfig.java.mustache'
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
}

function createMustacheView(config: RunnerGeneratorConfig) {
  return {
    isReactNativeDevSupportEnabled:
      config.reactNativeDevSupportEnabled === true ? 'true' : 'false',
    miniAppName: config.mainMiniAppName,
    packagerHost:
      config.reactNativePackagerHost || defaultReactNativePackagerHost,
    packagerPort:
      config.reactNativePackagerPort || defaultReactNativePackagerPort,
    pascalCaseMiniAppName: pascalCase(config.mainMiniAppName),
    ...android.resolveAndroidVersions(
      config.extra && config.extra.androidConfig
    ),
  }
}

function pascalCase(str: string) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}
