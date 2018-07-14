import { compose, createStore, applyMiddleware } from 'redux'
import { createEpicMiddleware } from 'redux-observable'
import rootEpic from '../epics/rootEpic'
import rootReducer from '../reducers/rootReducer'
import log from 'electron-log'

const epicMiddleware = createEpicMiddleware()
const windowIfDefined = typeof window === 'undefined' ? null : (window as any)
const composeEnhancers =
  (windowIfDefined && windowIfDefined.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose

export default function configureStore() {
  log.debug('configureStore')
  const store = createStore(
    rootReducer,
    { nativeApps: [] },
    composeEnhancers(applyMiddleware(epicMiddleware))
  )
  epicMiddleware.run(rootEpic)
  return store
}
