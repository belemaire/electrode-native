import { NATIVE_APP_NAME_CHANGED } from '../actions'

export default (state = { name: 'troglodyte', platforms: [] }, action) => {
  switch (action.type) {
    case NATIVE_APP_NAME_CHANGED:
      return action.payload

    default:
      return state
  }
}
