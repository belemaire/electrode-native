import React from 'react'
import { NativeAppItem } from './NativeAppItem'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import { connect } from 'react-redux'
import { cauldronCurrentChanged } from '../actions'

export interface CauldronSelectProps {
  currentRepo: string
  onChangedCauldron: (name: string) => void
  repos: { [key: string]: string }
}

class CauldronSelect extends React.Component<CauldronSelectProps, {}> {
  public render() {
    return (
      <Select
        value={this.props.currentRepo}
        name="Cauldron"
        onChange={e =>
          this.props.onChangedCauldron &&
          this.props.onChangedCauldron(e.target.value)
        }
      >
        {Object.keys(this.props.repos).map(repo => (
          <MenuItem key={repo} value={repo}>
            {repo}
          </MenuItem>
        ))}
      </Select>
    )
  }
}

export default connect(
  s => ({}),
  dispatch => ({
    onChangedCauldron(name) {
      dispatch(cauldronCurrentChanged(name))
    },
  })
)(CauldronSelect)
