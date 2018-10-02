'use strict'

import Hapi from 'hapi'
import { getActiveCauldron } from 'ern-cauldron-api'
import { NativeApplicationDescriptor } from 'ern-core'

const server = new Hapi.Server({
  host: 'localhost',
  port: 3000,
  routes: {
    json: {
      space: 2,
    },
  },
})

const init = async () => {
  await server.start()
  console.log(`Electrode Native Service running at: ${server.info.uri}`)
}

process.on('unhandledRejection', err => {
  console.log(err)
  process.exit(1)
})

server.route({
  handler: async (request, h) => {
    const cauldron = await getActiveCauldron()
    const nativeApp = await cauldron.getDescriptor(
      NativeApplicationDescriptor.fromString('system-test-app:ios:1.0.0')
    )
    return nativeApp
  },
  method: 'GET',
  path: '/',
})

init()
