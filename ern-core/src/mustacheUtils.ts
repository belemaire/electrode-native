import Mustache from 'mustache'
import { readFile, writeFile } from './fileUtil'
import shell from './shell'
import path from 'path'
import readDir from 'fs-readdir-recursive'

// =============================================================================
// Mustache related utilities
// =============================================================================

// Mustache render using a template file
// filename: Path to the template file
// view: Mustache view to apply to the template
// returns: Rendered string output
export async function mustacheRenderUsingTemplateFile(
  filename: string,
  view: any
) {
  return readFile(filename, 'utf8').then(template =>
    Mustache.render(template, view)
  )
}

// Mustache render to an output file using a template file
// templateFilename: Path to the template file
// view: Mustache view to apply to the template
// outputFile: Path to the output file
export async function mustacheRenderToOutputFileUsingTemplateFile(
  templateFilename: string,
  view: any,
  outputFile: string
) {
  return mustacheRenderUsingTemplateFile(templateFilename, view).then(
    output => {
      return writeFile(outputFile, output)
    }
  )
}

export async function mustacheDirectory({
  inputDir,
  outputDir,
  mustacheView,
}: {
  inputDir: string
  outputDir?: string
  mustacheView: any
}) {
  if (outputDir) {
    shell.cp('-R', path.join(inputDir, '{.*,*}'), outputDir)
  }

  /**
   * Recursively get path to all mustache files
   * from input directory (all files with .mustache extension)
   */
  const mustacheFiles = readDir(
    inputDir,
    () => true /* also return hidden files */
  )
    .filter(f => f.endsWith('.mustache'))
    .map(f => path.join(inputDir, f))

  /**
   * Apply mustache view to each .mustache file
   * and save result to file with same path but
   * without .mustache extension.
   * Cleanup by removing .mustache template file.
   *
   * For example if file path is
   *  /Users/foo/bar/ElectrodeContainer.h.mustache
   *
   * The resulting mustache rendered file will be
   *  /Users/foo/bar/ElectrodeContainer.h
   */
  for (const mustacheFile of mustacheFiles) {
    await mustacheRenderToOutputFileUsingTemplateFile(
      mustacheFile,
      mustacheView,
      mustacheFile.replace('.mustache', '')
    )
    shell.rm(mustacheFile)
  }
}
