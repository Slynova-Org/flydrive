'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

class Storage {

  /**
   * Constructor.
   *
   * @param  {object} driver
   */
  constructor (driver) {
    this.driver = driver
  }

  /**
   * Determine if a file or directory exists.
   *
   * @param  {string}  path
   * @return {boolean}
   */
  * exists (path) {
    return yield this.driver.exists(path)
  }

  /**
   * Get the content of a file.
   *
   * @param  {string}  path
   * @return {Buffer}
   */
  * get (path) {
    try {
      return yield this.driver.get(path)
    } catch (e) {
      console.log(e)
    }
  }

  /**
   * Write the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  * put (path, content) {
    return yield this.driver.put(path, content)
  }

  /**
   * Prepend the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  * prepend (path, content) {
    return yield this.driver.prepend(path, content)
  }

  /**
   * Append the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  * append (path, content) {
    return yield this.driver.append(path, content)
  }

  /**
   * Delete the file.
   *
   * @param  {string}  path
   * @return {boolean}
   */
  * delete (path) {
    return yield this.driver.delete(path)
  }

  /**
   * Move a file to a new location.
   *
   * @param  {string}  oldPath
   * @param  {string}  target
   * @return {boolean}
   */
  * move (oldPath, target) {
    return yield this.driver.move(oldPath, target)
  }

  /**
   * Copy a file to a location.
   *
   * @param  {string}  path
   * @param  {string}  target
   * @return {boolean}
   */
  * copy (path, target) {
    return yield this.driver.copy(path, target)
  }

}

module.exports = Storage
