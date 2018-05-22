import React from 'react'
import { CauldronNativeApp } from 'ern-cauldron-api'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import { Apple, Android } from 'mdi-material-ui'
import green from '@material-ui/core/colors/red'

export interface NativeAppItemProps {
  nativeApp: CauldronNativeApp
}

export class NativeAppItem extends React.Component<NativeAppItemProps, {}> {
  public render() {
    return (
      <ListItem button>
        <ListItemText
          primary={this.props.nativeApp.name}
          secondary={this.formatPlatforms(this.props.nativeApp)}
        />
      </ListItem>
    )
  }

  private formatPlatforms(nativeApp: CauldronNativeApp) {
    return (
      <React.Fragment>
        {nativeApp.platforms.map(
          p =>
            p.name === 'android' ? (
              <Android key="android" />
            ) : (
              <Apple key="apple" />
            )
        )}
      </React.Fragment>
    )
  }
}
