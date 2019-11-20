import fs from 'fs-extra'
import shell from './shell'
import path from 'path'
import log from './log'

export default function handleCopyDirective(
  sourceRoot: string,
  destRoot: string,
  arr: any[]
) {
  for (const cp of arr) {
    const sourcePath = path.join(sourceRoot, cp.source)
    const destPath = path.join(destRoot, cp.dest)
    fs.ensureDirSync(destPath)
    log.error(`sourcePath: ${sourcePath} destPath:${destPath}`)
    shell.cp('-R', sourcePath, destPath)
  }
}
