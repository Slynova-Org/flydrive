'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const CE = require('../Exceptions')

const pathMap = {
  local: './LocalFileSystem',
  s3: './AwsS3',
  spaces: './AwsS3',
  ftp: './FTP',
}

const proxyHandler = {
  get (target, name) {
    const path = pathMap[name]

    if (path === undefined) {
      throw CE.DriverNotSupported.driver(name)
    }

    /* eslint-disable global-require, import/no-dynamic-require */
    return require(pathMap[name])
  },
}

module.exports = new Proxy({}, proxyHandler)
