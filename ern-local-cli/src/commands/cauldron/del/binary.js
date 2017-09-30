// @flow

import {
  NativeApplicationDescriptor
} from 'ern-util'
import {
  cauldron
} from 'ern-core'
import utils from '../../../lib/utils'

exports.command = 'binary'
exports.desc = 'Remove the binary of a native application version from the Cauldron'

exports.builder = function (yargs: any) {
  return yargs
  .option('descriptor', {
    type: 'string',
    alias: 'd',
    describe: 'A complete native application descriptor'
  })
  .epilog(utils.epilog(exports))
}

exports.handler = async function ({
  descriptor
} : {
  descriptor?: string
}) {
  if (!descriptor) {
    descriptor = await utils.askUserToChooseANapDescriptorFromCauldron({ onlyNonReleasedVersions: false })
  }
  const napDescriptor = NativeApplicationDescriptor.fromString(descriptor)

  await utils.logErrorAndExitIfNotSatisfied({
    isCompleteNapDescriptorString: { descriptor },
    napDescriptorExistInCauldron: {
      descriptor,
      extraErrorMessage: 'This command cannot work on a non existing native application version'
    }
    // Add rule to check if native application version contains a binary
  })

  try {
    await cauldron.removeNativeBinary(napDescriptor)
    log.info(`${napDescriptor.toString()} binary was succesfully removed ! `)
  } catch (e) {
    log.error(`An error happened while trying to remove ${napDescriptor.toString()} binary`)
  }
}
