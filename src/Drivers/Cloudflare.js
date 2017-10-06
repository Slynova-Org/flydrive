/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const SDK = require('cloudflare4')

class Cloudflare {
  /**
   * Constructor.
   */
  constructor (config) {
    this.cloudflare = new SDK({
      email: config.email,
      key: config.key
    })
  }
}

module.exports = Cloudflare
