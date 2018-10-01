import { assert, expect } from 'chai'
import * as sut from '../src/lib/codepush'
import { fileUtils, config } from 'ern-core'
import path from 'path'
import sinon from 'sinon'
const sandbox = sinon.createSandbox()

const fixturesPath = path.join(__dirname, 'fixtures')

describe('codepush', () => {
  afterEach(() => {
    sandbox.restore()
  })

  describe('getCodePushInitConfig', () => {
    it('should get config from global .code-push.config file if it exists', () => {
      const initialEnvHome = process.env.HOME
      try {
        process.env.HOME = fixturesPath
        const codePushConfigFixture = fileUtils.readJSONSync(
          path.join(fixturesPath, '.code-push.config')
        )
        const codePushConfig = sut.getCodePushInitConfig()
        expect(codePushConfig).deep.equal(codePushConfigFixture)
      } finally {
        process.env.HOME = initialEnvHome
      }
    })

    it('should get config from local ern config if no global .code-push.config file exists', () => {
      const initialEnvHome = process.env.HOME
      try {
        process.env.HOME = __dirname
        sandbox.stub(config, 'getValue').callsFake(key => {
          switch (key) {
            case 'codePushAccessKey':
              return 'AK'
            case 'codePushCustomHeaders':
              return 'CH'
            case 'codePushCustomServerUrl':
              return 'CSU'
            case 'codePushproxy':
              return 'P'
            default:
              throw new Error('Unexpected key requested')
          }
        })
        const codePushConfig = sut.getCodePushInitConfig()
        expect(codePushConfig).deep.equal({
          accessKey: 'AK',
          customHeaders: 'CH',
          customServerUrl: 'CSU',
          proxy: 'P',
        })
      } finally {
        process.env.HOME = initialEnvHome
      }
    })
  })

  describe('getCodePushSdk', () => {
    it('should throw if code push config cannot be found', () => {
      const initialEnvHome = process.env.HOME
      try {
        process.env.HOME = __dirname
        expect(() => sut.getCodePushSdk()).to.throw()
      } finally {
        process.env.HOME = initialEnvHome
      }
    })

    it('should throw if code push config does not contain the access key', () => {
      const initialEnvHome = process.env.HOME
      try {
        process.env.HOME = __dirname
        sandbox.stub(sut, 'getCodePushInitConfig').returns({})
        expect(() => sut.getCodePushSdk()).to.throw()
      } finally {
        process.env.HOME = initialEnvHome
      }
    })
  })
})
