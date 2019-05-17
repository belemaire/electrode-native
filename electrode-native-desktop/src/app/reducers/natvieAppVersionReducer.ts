import { NATIVE_APP_VERSION_CHANGED } from '../actions'

export default (state = { name: 'troglodyte' }, action) => {
  switch (action.type) {
    case NATIVE_APP_VERSION_CHANGED:
      return action.payload

    default:
      return state
  }
}
