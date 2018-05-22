import { combineEpics, ActionsObservable } from 'redux-observable'
import { Action } from 'redux'
import { Observable } from 'rxjs/Observable'
import { getActiveCauldron, CauldronNativeApp } from 'ern-cauldron-api'
import { nativeAppsRetrieved } from '../actions'
import 'rxjs/add/operator/mergeMap'
import 'rxjs/add/operator/map'
import 'rxjs/add/observable/from'
import 'rxjs/add/operator/catch'

async function getCauldronNativeApps(): Promise<CauldronNativeApp[]> {
  const cauldron = await getActiveCauldron()
  return cauldron.getAllNativeApps()
}

function getNativeAppsEpic(action$: ActionsObservable<any>) {
  return action$.ofType('GET_NATIVE_APPS').mergeMap(action =>
    Observable.from(getCauldronNativeApps())
      .map(nativeAppsRetrieved)
      .catch(err => {
        throw err // should dispatch new failure action
      })
  )
}

const rootEpic = combineEpics(getNativeAppsEpic)

export default rootEpic
