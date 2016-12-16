'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const Storage = require('./Storage')
const Drivers = require('./Drivers')
const DriverNotSupported = require('./Exceptions/DriverNotSupported')

const publicApi = [
  'exists',
  'get',
  'put',
  'prepend',
  'append',
  'delete',
  'move',
  'copy',
  'url',
  'size',
  'lastModified',
]

class StorageManager {

  /**
   * Constructor.
   *
   * @param  {object} config
   */
  constructor (config) {
    this.config = config
    this.disks = []
    this.customDrivers = []

    this.__call()
  }

  /**
   * Register a custom driver.
   *
   * @param  {string} name
   * @param  {mixed} handler
   * @return {this}
   */
  extend (name, handler) {
    this.customDrivers[name] = handler

    return this
  }

  /**
   * Get a disk instance.
   *
   * @param  {string} name
   * @return {object}
   */
  disk (name) {
    name = name || this._getDefaultDriver()

    return this.disks[name] = this._get(name)
  }

  /**
   * Proxy all storage method to the default driver.
   */
  __call () {
    publicApi.forEach(method => {
      this[method] = () => {
        const driver = this.disk()
        return driver[method].apply(driver, arguments)
      }
    })
  }

  /**
   * Attempt to get the disk from the local cache.
   *
   * @param  {string} name
   * @return {object}
   */
  _get (name) {
    return (this.disks[name] !== undefined) ? this.disks[name] : this._resolve(name)
  }

  /**
   * Resolve the given disk.
   *
   * @param  {string} name
   * @return {[type]}
   */
  _resolve (name) {
    const config = this._getConfig(name)

    if (this.customDrivers[config.driver]) {
      return this._callCustomCreator(config)
    }

    if (Drivers[config.driver]) {
      return new Storage(
        new Drivers[config.driver](config)
      )
    }

    throw DriverNotSupported.driver(name)
  }

  /**
   * Call a custom driver creator.
   *
   * @param  {object} config
   * @return {object}
   */
  _callCustomCreator (config) {
    const driver = this.customDrivers[config.driver](config)

    return driver
  }

  /**
   * Get the configuration of a disk.
   *
   * @param  {string} name
   * @return {object}
   */
  _getConfig (name) {
    return this.config.disks[name]
  }

  /**
   * Get the default driver name.
   *
   * @return {string}
   */
  _getDefaultDriver () {
    return this.config.default
  }

}

module.exports = StorageManager
