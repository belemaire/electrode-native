import { Argv } from 'yargs'

export const command = 'workspace'
export const desc = 'Workspace commands'
export const builder = (argv: Argv) => {
  return argv
    .commandDir('workspace', {
      extensions: process.env.ERN_ENV === 'development' ? ['js', 'ts'] : ['js'],
    })
    .demandCommand(1, 'workspace needs a command')
    .strict()
}
export const handler = (args: any) => {
  return
}
