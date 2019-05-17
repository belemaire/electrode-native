// This is the top-most component in the app.
import React from 'react'
import Button from '@material-ui/core/Button'
import { Platform } from 'ern-core'
import { Provider } from 'react-redux'
import { NativeAppList } from './NativeAppList'
import NativeAppSelect from './NativeAppSelect'
import NativeAppPlatformSelect from './NativeAppPlatformSelect'
import NativeAppVersionSelect from './NativeAppVersionSelect'
import CauldronSelect from './CauldronSelect'
import { getNativeApps } from '../actions'
import { connect } from 'react-redux'
import ReactMarkdown from 'react-markdown'
import fs from 'fs'

export interface AppProps {
  nativeApps: any
  getNativeApps: any
  nativeApp: any
  currentCauldron: string
  nativeAppPlatform: any
  nativeAppVersion: any
  cauldrons: { [key: string]: string }
}
class App extends React.Component<AppProps, {}> {
  public render() {
    return (
      <React.Fragment>
        <CauldronSelect
          currentRepo={this.props.currentCauldron}
          repos={this.props.cauldrons}
        />
        <NativeAppSelect
          nativeApp={this.props.nativeApp}
          nativeApps={this.props.nativeApps}
        />
        <NativeAppPlatformSelect
          nativeAppPlatform={this.props.nativeAppPlatform}
          nativeApp={this.props.nativeApp}
        />
        <NativeAppVersionSelect
          nativeAppPlatform={this.props.nativeAppPlatform}
          nativeAppVersion={this.props.nativeAppVersion}
        />
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state: any) => ({
  cauldrons: state.cauldrons.repositories,
  currentCauldron: state.cauldrons.current,
  nativeApp: state.nativeApp,
  nativeAppPlatform: state.nativeAppPlatform,
  nativeApps: state.nativeApps,
  nativeAppVersion: state.nativeAppVersion,
})

export default connect(
  mapStateToProps,
  { getNativeApps }
)(App)
