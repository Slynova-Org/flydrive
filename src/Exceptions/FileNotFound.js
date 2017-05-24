/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const NE = require('node-exceptions')

class FileNotFound extends NE.RuntimeException {

  static file (path) {
    const exception = new this(`The file ${path} doesn't exist`, 404)
    exception.file = path

    return exception
  }

}

module.exports = FileNotFound
