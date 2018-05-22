/**
 * This is the main process entry point.
 * It is launching an Electron renderer window.
 */
import { app, dialog, ipcMain } from 'electron'
import { createMainWindow } from '../main-window'
import log from 'electron-log'
import isDev from 'electron-is-dev'
import { createMenu } from '../menu'

log.transports.file.level = isDev ? false : 'info'
log.transports.console.level = isDev ? 'debug' : false

/**
 * Install Chrome Development Tools for React and Redux,
 * only if running development build.
 * Noop if production build.
 */
const installDevExtensions = async (): Promise<any> => {
  if (isDev) {
    log.debug('Installing Chrome development tools extensions')
    const installer = require('electron-devtools-installer')
    const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS']
    return Promise.all(
      extensions.map(extName => installer.default(installer[extName]))
    )
  }
  return Promise.resolve()
}

/**
 * Electron application entry point
 */
app.on('ready', async (): Promise<void> => {
  await installDevExtensions()
  const window: Electron.BrowserWindow = createMainWindow(app.getAppPath())
  createMenu(window)
})

app.on('window-all-closed', app.quit)
