/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const fs = require('fs-extra')
const path = require('path')
const FileNotFound = require('../Exceptions/FileNotFound')

class LocalFileSystem {
  /**
   * Constructor.
   */
  constructor (config) {
    this.root = config.root
  }

  /**
   * Returns full path to the storage root directory
   *
   * @method _fullPath
   *
   * @param  {String}  relativePath
   *
   * @return {String}
   *
   * @private
   */
  _fullPath (relativePath) {
    return path.isAbsolute(relativePath) ? relativePath : path.join(this.root, relativePath)
  }

  /**
   * Determine if a file or folder already exists
   *
   * @method exists
   * @async
   *
   * @param {String} location
   */
  async exists (location) {
    return fs.pathExists(this._fullPath(location))
  }

  /**
   * Returns file contents
   *
   * @method get
   * @async
   *
   * @param  {String} location
   * @param  {String} [encoding]
   *
   * @return {String}
   */
  async get (location, encoding) {
    try {
      return fs.readFile(this._fullPath(location), encoding)
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw FileNotFound.file(location)
      }
      throw e
    }
  }

  /**
   * Create a new file. This method will create
   * missing directories on the fly.
   *
   * @method put
   *
   * @param  {String} location
   * @param  {Mixed}  content
   * @param  {Object} [options = {}]
   *
   * @return {Boolean}
   */
  async put (location, content, options = {}) {
    await fs.outputFile(this._fullPath(location), content, options)
    return true
  }

  /**
   * Prepends content to the file
   *
   * @method prepend
   *
   * @param  {String} location
   * @param  {Mixed}  content
   * @param  {Object} [options = {}]
   *
   * @return {Boolean}
   */
  async prepend (location, content, options) {
    if (await this.exists(location)) {
      const actualContent = await this.get(location, 'utf-8')
      return this.put(location, `${content}${actualContent}`, options)
    }

    return this.put(location, content, options)
  }

  /**
   * Appends content to the file
   *
   * @method append
   *
   * @param  {String} location
   * @param  {Mixed}  content
   * @param  {Object} [options = {}]
   *
   * @return {Boolean}
   */
  async append (location, content, options) {
    await fs.appendFile(this._fullPath(location), content, options)
    return true
  }

  /**
   * Delete existing file. This method will not
   * throw any exception if file doesn't exists
   *
   * @method delete
   *
   * @param  {String} location
   *
   * @return {Boolean}
   */
  async delete (location) {
    await fs.remove(this._fullPath(location))
  }

  /**
   * Move file to a new location
   *
   * @method move
   * @async
   *
   * @param  {String} src
   * @param  {String} dest
   * @param  {Object} options
   *
   * @return {Boolean}
   */
  async move (src, dest, options = {}) {
    await fs.move(this._fullPath(src), this._fullPath(dest), options)
    return true
  }

  /**
   * Copy a file to a location.
   *
   * @method copy
   * @async
   *
   * @param  {String} src
   * @param  {String} dest
   * @param  {Object} options
   *
   * @return {Boolean}
   */
  async copy (src, dest, options) {
    await fs.copy(this._fullPath(src), this._fullPath(dest), options)
    return true
  }
}

module.exports = LocalFileSystem
