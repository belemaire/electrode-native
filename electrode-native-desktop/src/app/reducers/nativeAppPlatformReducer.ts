import { NATIVE_APP_PLATFORM_CHANGED } from '../actions'

export default (state = { name: 'troglodyte', versions: [] }, action) => {
  switch (action.type) {
    case NATIVE_APP_PLATFORM_CHANGED:
      return action.payload

    default:
      return state
  }
}
