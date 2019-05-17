import React from 'react'
import { NativeAppItem } from './NativeAppItem'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import { connect } from 'react-redux'
import { nativeAppNameChanged } from '../actions'
import { CauldronNativeApp } from 'ern-cauldron-api'

export interface NativeAppSelectProps {
  nativeApp: CauldronNativeApp
  onNativeAppNameSelected: (name: CauldronNativeApp) => void
  nativeApps: CauldronNativeApp[]
}

class NativeAppSelect extends React.Component<NativeAppSelectProps, {}> {
  public render() {
    return (
      <Select
        value={this.props.nativeApp}
        name="NativeAppName"
        onChange={e =>
          this.props.onNativeAppNameSelected &&
          this.props.onNativeAppNameSelected(e.target.value as any)
        }
      >
        {this.props.nativeApps.map(nap => (
          <MenuItem key={nap.name} value={nap as any}>
            {nap.name}
          </MenuItem>
        ))}
      </Select>
    )
  }
}

export default connect(
  s => ({}),
  dispatch => ({
    onNativeAppNameSelected(name) {
      dispatch(nativeAppNameChanged(name))
    },
  })
)(NativeAppSelect)
