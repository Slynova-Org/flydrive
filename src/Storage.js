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
    return yield this.driver.get(path)
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

}

module.exports = Storage
