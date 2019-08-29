import fs from 'fs'
import { promisify } from 'util'

export const fsa = {
  exists: async (path: fs.PathLike) => {
    return new Promise((resolve, reject) => {
      fs.stat(path, err => {
        if (err && err.code === 'ENOENT') {
          resolve(false)
        } else if (err) {
          console.log(`err rej is ${err}`)
          reject(err)
        }
        resolve(true)
      })
    })
  },
  readFile: promisify(fs.readFile),
  readdir: promisify(fs.readdir),
  stat: promisify(fs.stat),
}
