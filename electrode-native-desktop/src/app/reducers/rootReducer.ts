import { combineReducers } from 'redux'
import cauldrons from './cauldronsReducer'
import nativeApps from './nativeAppsReducer'
import nativeApp from './nativeAppReducer'
import nativeAppPlatform from './nativeAppPlatformReducer'
import nativeAppVersion from './natvieAppVersionReducer'

const rootReducer = combineReducers({
  cauldrons,
  nativeApp,
  nativeApps,
  nativeAppPlatform,
  nativeAppVersion,
})

export default rootReducer
