'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const fs = require('mz/fs')
const path = require('path')

class LocalFileSystem {

  /**
   * Constructor.
   */
  constructor (config) {
    this.root = config.root
  }

  /**
   * Determine if a file or directory exists.
   *
   * @param  {string}  path
   * @return {boolean}
   */
  * exists (path) {
    try {
      yield fs.access(this._fullPath(path))
      return true
    } catch (e) {
      if ('ENOENT' === e.code) return false
      throw e
    }
  }

  /**
   * Compute a path to a fully qualified path.
   *
   * @param  {string}  relativePath
   * @return {string}
   */
  _fullPath (relativePath) {
    return path.join(this.root, relativePath)
  }

}

module.exports = LocalFileSystem
