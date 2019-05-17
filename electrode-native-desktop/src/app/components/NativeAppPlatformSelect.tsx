import React from 'react'
import { NativeAppItem } from './NativeAppItem'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import { connect } from 'react-redux'
import { nativeAppPlatformChanged } from '../actions'
import { CauldronNativeApp, CauldronNativeAppPlatform } from 'ern-cauldron-api'

export interface NativeAppPlatformSelectProps {
  onNativeAppPlatformSelected: (name: string) => void
  nativeApp: CauldronNativeApp
  nativeAppPlatform: CauldronNativeAppPlatform
}

class NativeAppPlatformSelect extends React.Component<
  NativeAppPlatformSelectProps,
  {}
> {
  public render() {
    return (
      <Select
        value={this.props.nativeAppPlatform}
        name="NativeAppPlatform"
        onChange={e =>
          this.props.onNativeAppPlatformSelected &&
          this.props.onNativeAppPlatformSelected(e.target.value)
        }
      >
        {this.props.nativeApp.platforms.map(p => (
          <MenuItem key={p.name} value={p as any}>
            {p.name}
          </MenuItem>
        ))}
      </Select>
    )
  }
}

export default connect(
  s => ({}),
  dispatch => ({
    onNativeAppPlatformSelected(name) {
      dispatch(nativeAppPlatformChanged(name))
    },
  })
)(NativeAppPlatformSelect)
