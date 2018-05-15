'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const fs = require('fs-extra')
const path = require('path')
const createOutputStream = require('create-output-stream')
const CE = require('../Exceptions')

/**
 * Returns a boolean indication if stream param
 * is a readable stream or not.
 *
 * @param {*} stream
 *
 * @return {Boolean}
 */
function isReadableStream (stream) {
  return stream !== null
    && typeof (stream) === 'object'
    && typeof (stream.pipe) === 'function'
    && typeof (stream._read) === 'function'
    && typeof (stream._readableState) === 'object'
    && stream.readable !== false
}

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
  exists (location) {
    return fs.pathExists(this._fullPath(location))
  }

  /**
   * Returns file contents
   *
   * @method get
   * @async
   *
   * @param  {String} location
   * @param  {String|Object} [encoding]
   *
   * @return {String|Buffer}
   */
  async get (location, encoding) {
    try {
      return await fs.readFile(this._fullPath(location), encoding)
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw CE.FileNotFound.file(location)
      }

      throw e
    }
  }

  /**
   * Returns a read stream for a file location. This method
   * is same as `fs.createReadStream` but added for
   * convenience.
   *
   * @method getStream
   *
   * @param {String} location
   * @param {Object|String} options
   *
   * @return {ReadableStream}
   */
  getStream (location, options) {
    return fs.createReadStream(this._fullPath(location), options)
  }

  /**
   * Create a new file. This method will create
   * missing directories on the fly.
   *
   * @method put
   *
   * @param  {String} location
   * @param  {String|Buffer|Stream}  content
   * @param  {Object} [options = {}]
   *
   * @return {Boolean}
   */
  async put (location, content, options = {}) {
    if (isReadableStream(content)) {
      return new Promise((resolve, reject) => {
        const ws = createOutputStream(this._fullPath(location), options)

        ws.on('close', () => resolve(true))
        ws.on('error', reject)
        content.pipe(ws)
      })
    }

    await fs.outputFile(this._fullPath(location), content, options)

    return true
  }

  /**
   * Prepends content to the file
   *
   * @method prepend
   *
   * @param  {String} location
   * @param  {String|Buffer}  content
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
   * @param  {String|Buffer|Stream}  content
   * @param  {Object} [options = {}]
   *
   * @return {Boolean}
   */
  async append (location, content, options) {
    if (isReadableStream(content)) {
      return this.put(location, content, Object.assign({ flags: 'a' }, options))
    }

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

    return true
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
