import { RunnerGenerator, RunnerGeneratorConfig } from 'ern-runner-gen'
import { mustacheUtils, NativePlatform, shell, utils } from 'ern-core'
import path from 'path'

const runnerHullPath = path.join(__dirname, 'hull')

export default class IosRunerGenerator implements RunnerGenerator {
  public get platform(): NativePlatform {
    return 'ios'
  }

  public async generate(config: RunnerGeneratorConfig): Promise<void> {
    this.validateExtraConfig(config)
    const mustacheView = this.createMustacheView(config)
    shell.cp('-R', path.join(runnerHullPath, '*'), config.outDir)

    const filesToMustache = [
      'ErnRunner/RunnerConfig.m',
      'ErnRunner.xcodeproj/project.pbxproj',
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
    this.validateExtraConfig(config)
    const mustacheView = this.createMustacheView(config)
    const subPathToRunnerConfig = path.join('ErnRunner', 'RunnerConfig.m')
    const pathToRunnerConfig = path.join(config.outDir, subPathToRunnerConfig)
    shell.cp(
      path.join(runnerHullPath, subPathToRunnerConfig),
      pathToRunnerConfig
    )
    await mustacheUtils.mustacheRenderToOutputFileUsingTemplateFile(
      pathToRunnerConfig,
      mustacheView,
      pathToRunnerConfig
    )
  }

  public createMustacheView(config: RunnerGeneratorConfig) {
    const pathToElectrodeContainerXcodeProj = utils.replaceHomePathWithTidle(
      path.join(config.extra.containerGenWorkingDir, 'out', 'ios')
    )
    return {
      isReactNativeDevSupportEnabled:
        config.reactNativeDevSupportEnabled === true ? 'YES' : 'NO',
      miniAppName: config.mainMiniAppName,
      packagerHost: config.reactNativePackagerHost,
      packagerPort: config.reactNativePackagerPort,
      pascalCaseMiniAppName: utils.pascalCase(config.mainMiniAppName),
      pathToElectrodeContainerXcodeProj,
    }
  }

  public validateExtraConfig(config: RunnerGeneratorConfig) {
    if (!config.extra || !config.extra.containerGenWorkingDir) {
      throw new Error('Missing containerGenWorkingDir in extra config')
    }
  }
}
