/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const NE = require('node-exceptions')

class MethodNotSupported extends NE.RuntimeException {
  static method (name, driver) {
    const exception = new this(`Method ${name} is not supported for the driver ${driver}`, 400)
    exception.method = name
    exception.driver = driver
    return exception
  }
}

class DriverNotSupported extends NE.RuntimeException {
  static driver (name) {
    const exception = new this(`Driver ${name} is not supported`, 400)
    exception.driver = name
    return exception
  }
}

class FileNotFound extends NE.RuntimeException {
  static file (path) {
    const exception = new this(`The file ${path} doesn't exist`, 404)
    exception.file = path
    return exception
  }
}

module.exports = { MethodNotSupported, DriverNotSupported, FileNotFound }
