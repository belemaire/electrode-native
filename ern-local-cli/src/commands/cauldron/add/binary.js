// @flow

import {
  NativeApplicationDescriptor
} from 'ern-util'
import {
  cauldron
} from 'ern-core'
import utils from '../../../lib/utils'

exports.command = 'binary <binaryPath>'
exports.desc = 'Add the binary of a native application version in the Cauldron'

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
  binaryPath,
  descriptor
}: {
  binaryPath: string,
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
    // Add a rule to check if path is valid (points to a file)
    // Add a rule to check if extension is correct one based on target platform (APK / APP)
    // Add a rule to check if a binary does not already exist in cauldron (otherwise user should use update command)
  })

  try {
    await cauldron.addNativeBinary(napDescriptor, binaryPath)
    log.info(`${napDescriptor.toString()} binary was succesfully added !`)
  } catch (e) {
    log.error(`An error happened while trying to add ${napDescriptor.toString()} binary`)
  }
}
