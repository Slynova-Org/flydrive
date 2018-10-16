/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */
const path = require('path')
/* eslint-disable import/no-extraneous-dependencies */
const JSFtp = require('jsftp')

/**
 * FTP driver for using ftp server with flydriver
 *
 * @constructor
 * @class FTP
 */
class FTP {
  /**
   * Constructor.
   */
  constructor (config) {
    this.longLive = config.longLive || false
    this.config = config
    this.connected = false

    this.ftp = new JSFtp(this.config)
    this.ftp.auth(this.config.user, this.config.pass, (err) => {
      if (err) {
        throw err
      }
      this.connected = true
    })
  }

  /**
   * Finds if a file exists or not
   *
   * @method exists
   * @async
   *
   * @param  {String} location
   *
   * @return {Promise<Boolean>}
   */
  async exists (location) {
    if (this.connected === false) {
      await this._reconnect()
    }

    const existsFolder = new Promise((resolve, reject) => {
      const pathWithoutLastFolder = path.parse(location).dir
      const lastFolder = path.parse(location).base

      this.ftp.ls(pathWithoutLastFolder || '.', (err, res) => {
        if (err) {
          return reject(err)
        }

        return resolve(res.findIndex(element => element.name === lastFolder) !== -1)
      })
    })

    const existsFile = new Promise((resolve, reject) => {
      this.ftp.get(location, (err) => {
        if (err === null) {
          return resolve(true)
        }

        if (err.code === 550) {
          return resolve(false)
        }

        return reject(err)
      })
    })

    const exists = await Promise.all([existsFolder, existsFile])

    if (this.longLive === false) {
      await this._disconnect()
    }

    return exists[0] === true || exists[1] === true
  }

  /**
   * Returns contents for a give file
   *
   * @method get
   * @async
   *
   * @param  {String} location
   *
   * @return {Promise<String>}
   */
  get (location) {
    return new Promise(async (resolve) => {
      if (!this.connected) {
        await this._reconnect()
      }

      let str = ''

      this.ftp.get(location, (err, socket) => {
        if (err) {
          throw err
        }

        socket.on('data', (d) => {
          str += d.toString()
        })

        socket.on('close', async (err2) => {
          if (this.longLive === false) {
            await this._disconnect()
          }

          if (err2) {
            throw err2
          }
          resolve(str)
        })

        socket.resume()
      })
    })
  }

  /**
   * Create a new file from string or buffer
   *
   * @method put
   * @async
   *
   * @param  {String} location
   * @param  {String} content
   *
   * @return {Promise<String>}
   */
  put (location, content) {
    return new Promise(async (resolve) => {
      if (!this.connected) {
        await this._reconnect()
      }
      this.ftp.put(Buffer.from(content), location, async (err) => {
        if (this.longLive === false) {
          await this._disconnect()
        }

        if (err) {
          throw err
        }
        resolve()
      })
    })
  }

  /**
   * Appends content to the file
   *
   * @method append
   *
   * @param  {String} location
   * @param  {String}  content
   *
   * @return {Boolean}
   */
  async append (location, content) {
    const currentContent = await this.get(location)

    await this.put(location, currentContent + content)
  }

  /**
   * Prepends content to the file
   *
   * @method prepend
   *
   * @param  {String} location
   * @param  {String}  content
   *
   * @return {Boolean}
   */
  async prepend (location, content) {
    const currentContent = await this.get(location)

    await this.put(location, content + currentContent)
  }

  /**
   * Remove a file
   *
   * @method delete
   * @async
   *
   * @param  {String} location
   *
   * @return {Promise<Boolean>}
   */
  async delete (location) {
    if (!this.connected) {
      await this._reconnect()
    }
    const deleteFile = new Promise((resolve) => {
      this.ftp.raw('dele', location, err => resolve(err))
    })

    const deleteFolder = new Promise((resolve) => {
      this.ftp.raw('rmd', location, err => resolve(err))
    })

    const errs = await Promise.all([deleteFile, deleteFolder])

    if (this.longLive === false) {
      await this._disconnect()
    }

    if (errs[0] !== null && errs[1] !== null) {
      throw (errs[0] ? errs[0] : errs[1])
    }
  }

  /**
   * Move file to a new location
   *
   * @method move
   * @async
   *
   * @param  {String} from
   * @param  {String} to
   *
   * @return {Boolean}
   */
  async move (from, to) {
    if (!this.connected) {
      await this._reconnect()
    }

    return new Promise((resolve) => {
      this.ftp.rename(from, to, async (err) => {
        if (this.longLive === false) {
          await this._disconnect()
        }

        if (err) {
          throw err
        }
        resolve()
      })
    })
  }

  /**
   * Copy a file to a location.
   *
   * @method copy
   * @async
   *
   * @param  {String} from
   * @param  {String} to
   *
   * @return {Boolean}
   */
  async copy (from, to) {
    return this.put(to, await this.get(from))
  }

  _disconnect () {
    return new Promise((resolve) => {
      this.ftp.raw('quit', '', (err) => {
        if (err) {
          throw err
        }
        this.connected = false
        resolve()
      })
    })
  }

  _reconnect () {
    return new Promise((resolve) => {
      this.ftp = new JSFtp(this.config)
      this.ftp.auth(this.config.user, this.config.pass, (err) => {
        if (err) {
          throw err
        }
        this.connected = true
        resolve()
      })
    })
  }
}

module.exports = FTP
