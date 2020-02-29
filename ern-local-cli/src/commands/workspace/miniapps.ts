import { Argv } from 'yargs'

export const command = 'miniapps'
export const desc = 'Workspace miniapps commands'
export const builder = (argv: Argv) => {
  return argv
    .commandDir('miniapps', {
      extensions: process.env.ERN_ENV === 'development' ? ['js', 'ts'] : ['js'],
    })
    .demandCommand(1, 'miniapps needs a command')
    .strict()
}
export const handler = (args: any) => {
  return
}
