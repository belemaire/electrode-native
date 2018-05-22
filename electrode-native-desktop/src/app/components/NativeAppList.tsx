import React from 'react'
import { NativeAppItem } from './NativeAppItem'
import { CauldronNativeApp } from 'ern-cauldron-api'
import List from '@material-ui/core/List'
import { withStyles, WithStyles } from '@material-ui/core/styles'

const decorate = withStyles(({ palette }) => ({
  root: {
    backgroundColor: palette.background.default,
    maxWidth: 360,
    width: '100%',
  },
}))

export interface NativeAppListProps {
  nativeApps: CauldronNativeApp[]
}

export const NativeAppList = decorate(
  class extends React.Component<NativeAppListProps & WithStyles<'root'>, {}> {
    public render() {
      const { classes } = this.props
      return (
        <div className={classes.root}>
          <List>
            {this.props.nativeApps.map(nap => (
              <NativeAppItem key={nap.name} nativeApp={nap} />
            ))}
          </List>
        </div>
      )
    }
  }
)
