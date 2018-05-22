// This is the top-most component in the app.
import React from 'react'
import Button from '@material-ui/core/Button'
import { Platform } from 'ern-core'
import { Provider } from 'react-redux'
import { NativeAppList } from './NativeAppList'
import CauldronSelect from './CauldronSelect'
import { getNativeApps } from '../actions'
import { connect } from 'react-redux'

class App extends React.Component<
  {
    nativeApps: any
    getNativeApps: any
    currentCauldron: string
    cauldrons: { [key: string]: string }
  },
  {}
> {
  public render() {
    return (
      <React.Fragment>
        <Button
          variant="raised"
          color="primary"
          onClick={this.props.getNativeApps}
        >
          Hello World. {Platform.rootDirectory}
        </Button>
        <NativeAppList nativeApps={this.props.nativeApps} />
        <CauldronSelect
          currentRepo={this.props.currentCauldron}
          repos={this.props.cauldrons}
        />
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state: any) => ({
  cauldrons: state.cauldrons.repositories,
  currentCauldron: state.cauldrons.current,
  nativeApps: state.nativeApps,
})

export default connect(mapStateToProps, { getNativeApps })(App)
