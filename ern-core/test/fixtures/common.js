// @flow

import os from 'os'
export const pkgNameNotInNpm = 'zxc-pkg-not-in-npm-bnm'
export const pkgName = 'chai'
export const pkgNameWithVersion = 'chai@4.1.2'
export const pkgNameWithInvalidVersion = 'chai@1000.1000.0'
export const moduleTypeNotSupported = 'moduleTypeNotSupported'
export const deviceOne = 'emulator-5554\tdevice'
export const deviceTwo = '8XV7N16516003608\tdevice'
export const multipleAvdList = ['Nexus6API23M', 'Nexus_5X_API_24']
export const oneAvdList = ['Nexus6API23M']
export const oneAvd = 'Nexus6API23M'
export const activityName = 'ChaiActivity'
export const projectPath = 'projectPath'
export const getDeviceResult = `emulator-5554\tdevice${os.EOL}8XV7N16516003608\tdevice`
export const oneUdid = 'A1213FE6-BDA8-424B-972C-4EA0480C3497'
export const npmPkgNameExists = 'chai'
export const npmPkgNameDoesNotExists = 'zxc-pkg-not-in-npm-bnm'
export const npmPkgName = 'chai'
export const validCompleteNapDescriptor = 'myapp:android:17.14.0'

export const validElectrodeNativeModuleNames = [
  'MyApp',
  'myApi',
  'helloworld',
  'MYAPIIMPLEMENTATION'
]

export const invalidElectrodeNativeModuleNames = [
  'My-App',
  'my_app',
  'hell0w0rld',
  'my*app',
  'my$app'
]

export const validContainerVersions = [ 
  '1.2.3', 
  '0.0.0', 
  '123.456.789'
]

export const invalidContainerVersions = [ 
  '123',
  '1.2',
  '1.2.x',
  'x.y.z',
]

export const withoutGitOrFileSystemPath = [
  'package@1.2.3',
  '@scope/package@1.2.3'
]

export const withGitOrFileSystemPath = [
  'git+ssh://github.com:electrode/react-native.git#master',
  'file:/Users/username'
]

export const withoutFileSystemPath = [
  'git+ssh://github.com:electrode/react-native.git#master',
  'package@1.2.3'
]

export const withFileSystemPath = [
  'file:/Users/username'
]

export const completeNapDescriptors = [
  'myapp:android:17.14.0',
  'myapp:ios:1'
]

export const incompleteNapDescriptors = [
  'myapp',
  'myapp:android'
]

export const validNpmPackageNames = [
  'hello-world',
  '@hello/world'
]

export const invalidNpmPackageNames = [
  ' leading - space:and:weirdchars',
  'camelCase',
  'pascalCase',
  'some spaces',
  '.start-with-.',
  '_start-with-_',
  'invalid-char-~',
  'invalid-char-)',
  'invalid-char-(',
  'invalid-char-\'',
  'invalid-char-!',
  'invalid-char-*'
]

export const miniAppNameWithSuffix = [
  'MiniAppTest',
  'TestMiniApp',
  'testminiapp',
  'miniappTest',
  'thisMiniAppIsValid'
]

export const apiNameWithSuffix = [
  'ApiTest',
  'TestApi',
  'testapi',
  'apiTest',
  'thisapiIsValid'
]

export const apiNativeImplNameWithSuffix = [
  'ApiImplNativeTest',
  'TestApiimplNative',
  'testapiImplNative',
  'apiImplNativeTest',
  'thisapiImplNativeIsValid'
]

export const apiJsImplNameWithSuffix = [
  'ApiImplJsTest',
  'TestApiimplJs',
  'testapiImplJs',
  'apiImplJsTest',
  'thisapiImplJsIsValid'
]

export const differentNativeApplicationPlatformDescriptors = [
  'testapp:android:1.0.0',
  'testapp:android:2.0.0',
  'testapp:ios:1.0.0',
  'testapp:android:3.0.0',
]

export const sameNativeApplicationPlatformDescriptors = [
  'testapp:android:1.0.0',
  'testapp:android:2.0.0',
  'testapp:android:3.0.0'
]
