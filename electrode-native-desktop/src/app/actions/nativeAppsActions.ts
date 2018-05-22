export const GET_NATIVE_APPS = 'GET_NATIVE_APPS'
export const NATIVE_APPS_RETRIEVED = 'NATIVE_APPS_RETRIEVED'

export const getNativeApps = () => ({ type: GET_NATIVE_APPS })

export const nativeAppsRetrieved = nativeapps => ({
  payload: nativeapps,
  type: NATIVE_APPS_RETRIEVED,
})
