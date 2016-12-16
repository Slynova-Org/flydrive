'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const fs = require('fs')

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
      yield fs.access(path, fs.constants.R_OK)
      console.log('exists')
      return true
    } catch (e) {
      console.log('dont exists')
    }
  }

  /**
   * Compute a path to a fully qualified path.
   *
   * @param  {string}  path
   * @return {string}
   */
  _fullPath (path) {

  }

}

module.exports = LocalFileSystem
