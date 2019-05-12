// This is the top-most component in the app.
import React from 'react'
import CssBaseline from '@material-ui/core/CssBaseline'
import { Provider } from 'react-redux'
import configureStore from './store'
import App from './components/App'

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
