import { combineReducers } from 'redux'
import cauldrons from './cauldronsReducer'
import nativeApps from './nativeAppsReducer'

const rootReducer = combineReducers({ cauldrons, nativeApps })

export default rootReducer
