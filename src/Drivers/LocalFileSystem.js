/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const fs = require('mz/fs')
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
   * Determine if a file or directory exists.
   *
   * @param  {string}  path
   * @return {boolean}
   */
  async exists (path) {
    try {
      await fs.access(this._fullPath(path))
      return true
    } catch (e) {
      if (e.code === 'ENOENT') return false
      throw e
    }
  }

  /**
   * Get the content of a file.
   *
   * @param  {string}  path
   * @return {Buffer}
   */
  async get (path) {
    try {
      return await fs.readFile(this._fullPath(path))
    } catch (e) {
      if (e.code === 'ENOENT') throw FileNotFound.file(path)
      throw e
    }
  }

  /**
   * Write the content into a file.
   *
   * @param  {string}  target
   * @param  {string}  content
   * @return {boolean}
   */
  async put (target, content) {
    try {
      await fs.writeFile(this._fullPath(target), content)
      return true
    } catch (e) {
      if (e.code === 'ENOENT') {
        await fs.mkdir(path.dirname(this._fullPath(target)))
        await this.put(target, content)
      }
      throw e
    }
  }

  /**
   * Prepend the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  async prepend (path, content) {
    if (await this.exists(path)) {
      const actualContent = (await this.get(path)).toString()
      return await this.put(path, `${content}${actualContent}`)
    }

    return await this.put(path, content)
  }

  /**
   * Append the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  async append (path, content) {
    try {
      await fs.appendFile(this._fullPath(path), content)
      return true
    } catch (e) {
      throw e
    }
  }

  /**
   * Delete the file.
   *
   * @param  {string}  path
   * @return {boolean}
   */
  async delete (path) {
    try {
      await fs.unlink(this._fullPath(path))
      return true
    } catch (e) {
      throw e
    }
  }

  /**
   * Move a file to a new location.
   *
   * @param  {string}  oldPath
   * @param  {string}  target
   * @return {boolean}
   */
  async move (oldPath, target) {
    try {
      await fs.rename(this._fullPath(oldPath), this._fullPath(target))
      return true
    } catch (e) {
      if (e.code === 'ENOENT') {
        await fs.mkdir(path.dirname(this._fullPath(target)))
        await this.move(oldPath, target)
      }
      throw e
    }
  }

  /**
   * Copy a file to a location.
   *
   * @param  {string}  path
   * @param  {string}  target
   * @return {boolean}
   */
  async copy (path, target) {
    try {
      fs.createReadStream(this._fullPath(path))
        .pipe(fs.createWriteStream(this._fullPath(target)))
      return true
    } catch (e) {
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
