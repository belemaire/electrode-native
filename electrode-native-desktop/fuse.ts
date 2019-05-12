/**
 * This file holds the configuration/orchestration for
 * FuseBox (https://fuse-box.org/) which is the bundler
 * that Electrode Native is using to bundle the
 * electrode-native-desktop module source code (Electron app).
 */

import { FuseBox, CSSPlugin, Sparky, CopyPlugin, ReplacePlugin } from 'fuse-box'
import { spawn } from 'child_process'

const ASSETS = ['*.jpg', '*.png', '*.jpeg', '*.gif', '*.svg']

// are we running in production mode?
const isProduction = process.env.NODE_ENV === 'production'
console.log(`isProduction: ${isProduction}`)

// copy the renderer's html file into the right place
Sparky.task('copy-html', () => {
  return Sparky.src('src/app/index.html').dest('dist/$name')
})

// the default task
Sparky.task('default', ['copy-html'], () => {
  // setup the producer with common settings
  const fuse = FuseBox.init({
    alias: {
      'ern-cauldron-api': '~/ern-cauldron-api/src',
      'ern-core': '~/ern-core/src',
    },
    cache: !isProduction,
    homeDir: '../',
    log: isProduction,
    output: 'dist/$name.js',
    sourceMaps: true,
    target: 'electron',
    tsConfig: 'tsconfig.json',
  })

  // start the hot reload server
  if (!isProduction) {
    console.log('Starting Fuse development server')
    fuse.dev({ port: 4445, httpServer: false })
  }

  // bundle the electron main code
  const mainBundle = fuse
    .bundle('main')
    .target('server')
    .instructions('> [electrode-native-desktop/src/app/main.ts]')

  // and watch unless we're bundling for production
  if (!isProduction) {
    mainBundle.watch()
  }

  // bundle the electron renderer code
  const rendererBundle = fuse
    .bundle('renderer')
    .instructions(
      '> [electrode-native-desktop/src/app/index.tsx] +fuse-box-css'
    )
    .plugin(CSSPlugin())
    .plugin(
      CopyPlugin({
        dest: 'assets',
        files: ASSETS,
        resolve: 'assets/',
        useDefault: false,
      })
    )

  // and watch & hot reload unless we're bundling for production
  if (!isProduction) {
    rendererBundle.watch()
    rendererBundle.hmr()
  }

  // when we are finished bundling...
  return fuse.run().then(() => {
    if (!isProduction) {
      // startup electron
      spawn('node', [`${__dirname}/node_modules/electron/cli.js`, __dirname], {
        stdio: 'inherit',
      }).on('exit', code => {
        console.log(`electron process exited with code ${code}`)
        process.exit(code ? code : undefined)
      })
    }
  })
})
