import * as fileUtils from './fileUtil'
import fs from 'fs'
import path from 'path'
import shell from './shell'
import createTmpDir from './createTmpDir'
import { execp, spawnp } from './childProcess'
import { exec, spawn, execSync, execFileSync } from 'child_process'
import fetch from 'node-fetch'
import log from './log'
import kax from './kax'
import util from 'util'
const ex = util.promisify(exec)
const sp = util.promisify(spawn)
export interface BundlingResult {
  // The root path to the assets
  assetsPath: string
  // The target platform of the bundle
  platform: string
  // Indicates whether this is a dev bundle or a production one
  dev: boolean
  // Full path to the bundle
  bundlePath: string
  // Full path to the source map (if any)
  sourceMapPath?: string
}

export default class ReactNativeCli {
  public readonly binaryPath: string

  constructor(binaryPath: string = 'react-native') {
    this.binaryPath = binaryPath
  }

  public async init(
    appName: string,
    rnVersion: string,
    { template }: { template?: string } = {}
  ) {
    const dir = path.join(process.cwd(), appName)

    if (fs.existsSync(dir)) {
      throw new Error(`Path already exists will not override ${dir}`)
    }

    const initCmd = `init ${appName} --version react-native@${rnVersion}${
      template ? ` --template ${template}` : ''
    }`

    return template
      ? // For some reason, when using 'react-native init' with
        // the template option, stdin redirection matters.
        // By default using 'pipe' for stdin, but this cause
        // 'react-native init' command to stall with Node 8.
        // The problem is not present with Node 10 and above
        // But because Electrode Native min requirement is Node 8
        // we need to handle this specific case.
        spawnp(this.binaryPath, initCmd.split(' '), {
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : execp(`${this.binaryPath} ${initCmd}`)
  }

  public async bundle({
    entryFile,
    dev,
    bundleOutput,
    assetsDest,
    platform,
    workingDir,
    sourceMapOutput,
  }: {
    entryFile: string
    dev: boolean
    bundleOutput: string
    assetsDest: string
    platform: string
    workingDir?: string
    sourceMapOutput?: string
  }): Promise<BundlingResult> {
    const bundleCommand = `${this.binaryPath} bundle \
${entryFile ? `--entry-file=${entryFile}` : ''} \
${dev ? '--dev=true' : '--dev=false'} \
${platform ? `--platform=${platform}` : ''} \
${bundleOutput ? `--bundle-output=${bundleOutput}` : ''} \
${assetsDest ? `--assets-dest=${assetsDest}` : ''} \
${sourceMapOutput ? `--sourcemap-output=${sourceMapOutput}` : ''}`

    await execp(bundleCommand, { cwd: workingDir })
    return {
      assetsPath: assetsDest,
      bundlePath: bundleOutput,
      dev,
      platform,
      sourceMapPath: sourceMapOutput,
    }
  }

  public startPackager(cwd: string) {
    spawnp(this.binaryPath, ['start'], { cwd })
  }

  public async startPackagerInNewWindow(cwd: string, args: string[] = []) {
    const isPackagerRunning = await this.isPackagerRunning()

    if (!isPackagerRunning) {
      await kax.task('Starting React Native packager').run(Promise.resolve())
      if (process.platform === 'darwin') {
        return this.darwinStartPackagerInNewWindow({ cwd, args })
      } else if (/^win/.test(process.platform)) {
        return this.windowsStartPackagerInNewWindow({ cwd, args })
      } else {
        return this.linuxStartPackageInNewWindow({ cwd, args })
      }
    } else {
      log.warn(
        'A React Native Packager is already running in a different process'
      )
    }
  }

  public async darwinStartPackagerInNewWindow({
    cwd = process.cwd(),
    args = [],
  }: {
    cwd?: string
    args?: string[]
  }) {
    const scriptPath = await this.createStartPackagerScript({
      args,
      cwd,
      scriptFileName: 'packager.sh',
    })
    spawnp('open', ['-a', 'Terminal', scriptPath])
  }

  public async linuxStartPackageInNewWindow({
    cwd = process.cwd(),
    args = [],
  }: {
    cwd?: string
    args?: string[]
  }) {
    const scriptPath = await this.createStartPackagerScript({
      args,
      cwd,
      scriptFileName: 'packager.sh',
    })
    spawnp('gnome-terminal', ['--command', scriptPath])
  }

  public async windowsStartPackagerInNewWindow({
    cwd = process.cwd(),
    args = [],
  }: {
    cwd?: string
    args?: string[]
  }) {
    const scriptPath = await this.createStartPackagerScript({
      args,
      cwd,
      scriptFileName: 'packager.bat',
    })
    spawnp('cmd.exe', ['/C', scriptPath], { detached: true })
  }

  public async createStartPackagerScript({
    cwd,
    args,
    scriptFileName,
  }: {
    cwd: string
    args: string[]
    scriptFileName: string
  }): Promise<string> {
    const tmpDir = createTmpDir()
    const tmpScriptPath = path.join(tmpDir, scriptFileName)
    await fileUtils.writeFile(
      tmpScriptPath,
      `
cd "${cwd}"; 
echo "Running ${this.binaryPath} start ${args.join(' ')}";
${this.binaryPath} start ${args.join(' ')};
`
    )
    shell.chmod('+x', tmpScriptPath)
    return tmpScriptPath
  }

  public async isPackagerRunning() {
    return fetch('http://localhost:8081/status').then(
      res => res.text().then(body => body === 'packager-status:running'),
      () => false
    )
  }
}
