import { NATIVE_APPS_RETRIEVED } from '../actions'

export default (state = [], action) => {
  switch (action.type) {
    case NATIVE_APPS_RETRIEVED:
      return action.payload
    default:
      return state
  }
}
