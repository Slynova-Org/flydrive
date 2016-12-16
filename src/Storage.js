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

}

module.exports = Storage
