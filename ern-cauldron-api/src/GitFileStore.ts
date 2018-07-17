import { writeFile } from './fs-util'
import BaseGit from './BaseGit'
import fs from 'fs'
import path from 'path'
import { log, shell } from 'ern-core'
import { ICauldronFileStore } from './types'

export default class GitFileStore extends BaseGit
  implements ICauldronFileStore {
  private readonly prefix: string

  constructor({
    cauldronPath,
    repository,
    branch,
  }: {
    cauldronPath: string
    repository?: string
    branch: string
  }) {
    super({ cauldronPath, repository, branch })
  }

  // ===========================================================
  // ICauldronFileAccess implementation
  // ===========================================================

  public async storeFile(
    filePath: string,
    content: string | Buffer,
    fileMode?: string
  ) {
    await this.sync()
    const storeDirectoryPath = path.resolve(this.fsPath, path.dirname(filePath))
    if (!fs.existsSync(storeDirectoryPath)) {
      log.debug(`Creating directory ${storeDirectoryPath}`)
      shell.mkdir('-p', storeDirectoryPath)
    }
    const pathToFile = path.resolve(storeDirectoryPath, path.basename(filePath))
    await writeFile(pathToFile, content, { flag: 'w' })
    if (fileMode) {
      shell.chmod(fileMode, pathToFile)
    }
    await this.git.addAsync(pathToFile)
    if (!this.pendingTransaction) {
      await this.git.commitAsync(`Add file ${filePath}`)
      await this.push()
    }
  }

  public async hasFile(filePath: string) {
    await this.sync()
    try {
      fs.statSync(this.pathToFile(filePath)).isFile()
      return true
    } catch (e) {
      return false
    }
  }

  public async getPathToFile(filePath: string): Promise<string | void> {
    await this.sync()
    if (fs.existsSync(this.pathToFile(filePath))) {
      return this.pathToFile(filePath)
    }
  }

  public async getFile(filePath: string): Promise<Buffer | void> {
    await this.sync()
    if (fs.existsSync(this.pathToFile(filePath))) {
      return fs.readFileSync(this.pathToFile(filePath))
    }
  }

  public async removeFile(filePath: string): Promise<boolean> {
    await this.sync()
    if (fs.existsSync(this.pathToFile(filePath))) {
      await this.git.rmAsync(this.pathToFile(filePath))
      if (!this.pendingTransaction) {
        await this.git.commitAsync(`Remove file ${filePath}`)
        await this.push()
      }
      return true
    }
    return false
  }

  private pathToFile(filePath: string) {
    return path.join(this.fsPath, filePath)
  }
}
