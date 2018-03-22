'use strict'

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

class FileNotFound extends NE.RuntimeException {
  static file (path) {
    const exception = new this(`The file ${path} doesn't exist`, 404)

    exception.file = path

    return exception
  }
}

class InvalidConfig extends NE.RuntimeException {
  static missingDiskName () {
    return new this('Make sure to define a default disk name inside config file', 500, 'E_INVALID_CONFIG')
  }

  static missingDiskConfig (name) {
    return new this(`Make sure to define config for ${name} disk`, 500, 'E_INVALID_CONFIG')
  }

  static missingDiskDriver (name) {
    return new this(`Make sure to define driver for ${name} disk`, 500, 'E_INVALID_CONFIG')
  }
}

class MethodNotSupported extends NE.RuntimeException {
  static method (name, driver) {
    const exception = new this(`Method ${name} is not supported for the driver ${driver}`, 400)

    exception.method = name
    exception.driver = driver

    return exception
  }
}

module.exports = {
  DriverNotSupported,
  FileNotFound,
  InvalidConfig,
  MethodNotSupported,
}
