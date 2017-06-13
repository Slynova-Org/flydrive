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
  async exists (path) {
    return this.driver.exists(path)
  }

  /**
   * Get the content of a file.
   *
   * @param  {string}  path
   * @return {Buffer}
   */
  async get (path) {
    try {
      return await this.driver.get(path)
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
  async put (path, content) {
    return this.driver.put(path, content)
  }

  /**
   * Prepend the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  async prepend (path, content) {
    return this.driver.prepend(path, content)
  }

  /**
   * Append the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  async append (path, content) {
    return this.driver.append(path, content)
  }

  /**
   * Delete the file.
   *
   * @param  {string}  path
   * @return {boolean}
   */
  async delete (path) {
    return this.driver.delete(path)
  }

  /**
   * Move a file to a new location.
   *
   * @param  {string}  oldPath
   * @param  {string}  target
   * @return {boolean}
   */
  async move (oldPath, target) {
    return this.driver.move(oldPath, target)
  }

  /**
   * Copy a file to a location.
   *
   * @param  {string}  path
   * @param  {string}  target
   * @return {boolean}
   */
  async copy (path, target) {
    return this.driver.copy(path, target)
  }
}

module.exports = Storage
