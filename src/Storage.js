'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const proxyHandler = {
  get (target, name) {
    /**
     * if node is inspecting then stick to target properties
     */
    if (typeof (name) === 'symbol' || name === 'inspect') {
      return target[name]
    }

    /**
     * if value exists on target, return that
     */
    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    /**
     * Fallback to driver instance
     */
    if (typeof (target.driver[name]) === 'function') {
      return target.driver[name].bind(target.driver)
    }

    return target.driver[name]
  },
}

class Storage {
  /**
   * Constructor.
   *
   * @param  {object} driver
   */
  constructor (driver) {
    this.driver = driver

    return new Proxy(this, proxyHandler)
  }
}

module.exports = Storage
