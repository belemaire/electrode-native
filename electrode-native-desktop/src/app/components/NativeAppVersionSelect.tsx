import React from 'react'
import { NativeAppItem } from './NativeAppItem'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import { connect } from 'react-redux'
import { nativeAppVersionChanged } from '../actions'
import {
  CauldronNativeAppPlatform,
  CauldronNativeAppVersion,
} from 'ern-cauldron-api'

export interface NativeAppVersionSelectProps {
  onNativeAppVersionChanged: (name: string) => void
  nativeAppPlatform: CauldronNativeAppPlatform
  nativeAppVersion: CauldronNativeAppVersion
}

class NativeAppVersionSelect extends React.Component<
  NativeAppVersionSelectProps,
  {}
> {
  public render() {
    return (
      <Select
        value={this.props.nativeAppVersion}
        name="NativeAppPlatform"
        onChange={e =>
          this.props.onNativeAppVersionChanged &&
          this.props.onNativeAppVersionChanged(e.target.value)
        }
      >
        {this.props.nativeAppPlatform.versions.map(v => (
          <MenuItem key={v.name} value={v as any}>
            {v.name}
          </MenuItem>
        ))}
      </Select>
    )
  }
}

export default connect(
  s => ({}),
  dispatch => ({
    onNativeAppVersionChanged(name) {
      dispatch(nativeAppVersionChanged(name))
    },
  })
)(NativeAppVersionSelect)
