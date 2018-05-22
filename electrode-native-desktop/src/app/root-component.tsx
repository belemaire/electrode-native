// This is the top-most component in the app.
import React from 'react'
import Button from '@material-ui/core/Button'
import CssBaseline from '@material-ui/core/CssBaseline'
import { Platform } from 'ern-core'
import { Provider } from 'react-redux'
import configureStore from './store'
import App from './components/App'
import { getNativeApps } from './actions'
import { connect } from 'react-redux'
export default class RootComponent extends React.Component<{}, {}> {
  public render() {
    return (
      <Provider store={configureStore()}>
        <React.Fragment>
          <CssBaseline />
          <App />
        </React.Fragment>
      </Provider>
    )
  }
}
