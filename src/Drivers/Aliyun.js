'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const Resetable = require('resetable')
/* eslint-disable import/no-extraneous-dependencies */
const OSS = require('ali-oss')

/**
 * Aliyun driver for using with flydriver
 *
 * @constructor
 * @class Aliyun
 */
class Aliyun {
  constructor (config) {
    this.oss = new OSS(Object.assign({}, {
      accessKeyId: config.key,
      accessKeySecret: config.secret,
      region: config.region,
      secure: config.secure,
    }, config))
    
    this._bucket = new Resetable(config.bucket)
  }

  /**
   * Use a different bucket at runtime
   *
   * @method bucket
   *
   * @param  {String} bucket
   *
   * @chainable
   */
  bucket (bucket) {
    this._bucket.set(bucket)
    
    return this
  }

  /**
   * Finds if a file exists or not
   *
   * @method exists
   * @async
   *
   * @param  {String} location
   * @param  {Object} [params]
   *
   * @return {Promise<Boolean>}
   */
  exists (location, params) {
    return new Promise((resolve, reject) => {
      const successStatuses = [200, 304]

      this.oss.head(location, params)
        .then((response) => {
          if (successStatuses.indexOf(response.status) >= 0) {
            resolve(true)
          } else {
            reject(response)
          }
        })
        .catch(error => reject(error))
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
   * @param  {Object} [params]
   *
   * @return {Promise<String>}
   */
  put (location, content, params) {
    return new Promise((resolve, reject) => {
      this.oss.put(location, content, params)
       .then((response) => {
         if (response.status === 200) {
          resolve(response.name)
         } else {
           reject(response)
         }
       })
       .catch(error => reject(error))
    })
  }

  /**
   * Remove a file
   *
   * @method delete
   * @async
   *
   * @param  {String} location
   * @param  {Object} [params = {}]
   *
   * @return {Promise<Boolean>}
   */
  delete (location, params = {}) {
    return new Promise((resolve, reject) => {
      this.oss.delete(location, params)
      .then(() => resolve(true))
      .catch(error => reject(error))
    })
  }

  /**
   * Returns contents for a given file
   *
   * @method get
   *
   * @param  {String} location
   * @param  {String} [file]
   * @param  {Object} [params = {}]
   *
   * @return {Promise<String>}
   */
  get (location, file = '', params = {}) {
    return new Promise((resolve, reject) => {
      this.oss.get(location)
      .then(response => {
        const content = response.content
        return Buffer.isBuffer(content) ? resolve(content) : reject(content)
      })
      .catch(error => reject(error))
    })
  }

  /**
   * Returns the stream for the given file
   *
   * @method getStream
   *
   * @param  {String}  location
   * @param  {Object}  [params = {}]
   *
   * @return {Stream}
   */
  getStream (location, params = {}) {
    return new Promise((resolve, reject) => {
      this.oss.getStream(location, params)
      .then(response => {
        resolve(response.stream)
      })
      .catch(error => reject(error))
    })
  }

  /**
   * Returns url for a given key. Note this method doesn't
   * validates the existence of file or it's visibility
   * status.
   *
   * @method getUrl
   *
   * @param  {String} location
   * @param  {String} bucket
   *
   * @return {String}
   */
  getUrl (location, bucket) {
    bucket = bucket || this._bucket.pull()
    const { secure, region } = this.oss.options
    const protocol = secure ? 'https://' : 'http://'
    return `${protocol}${bucket}.${region}.aliyuncs.com/${location}`
  }

  /**
   * Copy file from one location to another within
   * or accross oss buckets.
   *
   * @method copy
   *
   * @param  {String} src
   * @param  {String} dest
   * @param  {String} [destBucket = this.bucket]
   * @param  {Object} [params = {}]
   *
   * @return {Promise<String>}
   */
  copy (src, dest, destBucket, params = {}) {
    return new Promise((resolve, reject) => {
      const bucket = this._bucket.pull()
      const combinedDest = `/${bucket}/${src}`
      // Aliyun OSS switches the src and destination for some reason
      this.oss.copy(dest, combinedDest)
        .then(response => {
          resolve(this.getUrl(dest, destBucket))
        })
        .catch(error => reject(error))
    })
  }

  /**
   * Moves file from one location to another. This
   * method will call `copy` and `delete` under
   * the hood.
   *
   * @method move
   *
   * @param  {String} src
   * @param  {String} dest
   * @param  {String} [destBucket = this.bucket]
   * @param  {Object} [params = {}]
   *
   * @return {Promise<String>}
   */
  async move (src, dest, destBucket, params = {}) {
    const url = await this.copy(src, dest, destBucket, params)
    await this.delete(src)
    return url
  }
}

module.exports = Aliyun
