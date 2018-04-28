// @flow

import simpleGit from 'simple-git'
import Prom from 'bluebird'

export default function gitCli (workingDir?: string) {
  let simpleGitInstance = simpleGit(workingDir)
  /*simpleGitInstance.silent(global.ernLogLevel !== 'trace')*/
  simpleGitInstance.silent(true)
  return Prom.promisifyAll(simpleGitInstance)
}
