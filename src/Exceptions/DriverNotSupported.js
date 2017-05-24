/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const NE = require('node-exceptions')

class DriverNotSupported extends NE.RuntimeException {

  static driver (name) {
    const exception = new this(`Driver ${name} is not supported`, 400)
    exception.driver = name

    return exception
  }

}

module.exports = DriverNotSupported
