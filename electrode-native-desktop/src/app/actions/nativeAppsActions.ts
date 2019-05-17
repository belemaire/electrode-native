export const GET_NATIVE_APPS = 'GET_NATIVE_APPS'
export const NATIVE_APPS_RETRIEVED = 'NATIVE_APPS_RETRIEVED'
export const NATIVE_APP_NAME_CHANGED = 'NATIVE_APP_NAME_CHANGED'
export const NATIVE_APP_PLATFORM_CHANGED = 'NATIVE_APP_PLATFORM_CHANGED'
export const NATIVE_APP_VERSION_CHANGED = 'NATIVE_APP_VERSION_CHANGED'

export const getNativeApps = () => ({ type: GET_NATIVE_APPS })

export const nativeAppsRetrieved = nativeapps => ({
  payload: nativeapps,
  type: NATIVE_APPS_RETRIEVED,
})

export const nativeAppNameChanged = name => ({
  payload: name,
  type: NATIVE_APP_NAME_CHANGED,
})

export const nativeAppPlatformChanged = name => ({
  payload: name,
  type: NATIVE_APP_PLATFORM_CHANGED,
})

export const nativeAppVersionChanged = name => ({
  payload: name,
  type: NATIVE_APP_VERSION_CHANGED,
})
