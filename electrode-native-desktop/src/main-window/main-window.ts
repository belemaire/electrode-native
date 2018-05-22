import { app, BrowserWindow } from 'electron'
import url from 'url'
import path from 'path'

// default dimensions
export const DIMENSIONS = { width: 600, height: 500, minWidth: 450, minHeight: 450 }

/**
 * Creates the main window.
 *
 * @param appPath The path to the bundle root.
 * @param showDelay How long in ms before showing the window after the renderer is ready.
 * @return The main BrowserWindow.
 */
export function createMainWindow(appPath: string, showDelay: number = 100) {
  // create our main window
  const window = new BrowserWindow({
    backgroundColor: '#fff',
    height: DIMENSIONS.height,
    minHeight: DIMENSIONS.minHeight,
    minWidth: DIMENSIONS.minWidth,
    show: false,
    title: 'Electrode Native UI',
    useContentSize: true,
    vibrancy: "light",
    webPreferences: {
      backgroundThrottling: false,
      textAreasAreResizable: false
    },
    width: DIMENSIONS.width
  })

  // load entry html page in the renderer.
  window.loadURL(
    url.format({
      pathname: path.join(appPath, "dist/index.html"),
      protocol: "file:",
      slashes: true,
    }),
  )

  // only appear once we've loaded
  window.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      window.show()
      window.focus()
    }, showDelay)
  })

  return window
}
