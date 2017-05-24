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

module.exports = MethodNotSupported
