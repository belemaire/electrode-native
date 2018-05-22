import { config as ernConfig } from 'ern-core'
import { CAULDRON_CURRENT_CHANGED } from '../actions'

export default (
  state = {
    current: 'NONE',
    repositories: ernConfig.getValue('cauldronRepositories'),
  },
  action
) => {
  switch (action.type) {
    case CAULDRON_CURRENT_CHANGED:
      ernConfig.setValue('cauldronRepoInUse', action.payload)
      return { ...state, current: action.payload }
    default:
      return state
  }
}
