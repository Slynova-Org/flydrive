'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const Resetable = require('resetable')
/* eslint-disable import/no-extraneous-dependencies */
const S3 = require('aws-sdk/clients/s3')

/**
 * Aws driver for using s3 with flydriver
 *
 * @constructor
 * @class AwsS3
 */
class AwsS3 {
  constructor (config) {
    this.s3 = new S3(Object.assign({}, {
      accessKeyId: config.key,
      secretAccessKey: config.secret,
      region: config.region,
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
      const clonedParams = Object.assign({}, params, {
        Bucket: this._bucket.pull(),
        Key: location,
      })

      this.s3.headObject(clonedParams, (error) => {
        if (error && error.statusCode === 404) {
          resolve(false)

          return
        }

        if (error) {
          reject(error)

          return
        }

        resolve(true)
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
   * @param  {Object} [params]
   *
   * @return {Promise<String>}
   */
  put (location, content, params) {
    return new Promise((resolve, reject) => {
      const clonedParams = Object.assign({}, params, {
        Key: location,
        Body: content,
        Bucket: this._bucket.pull(),
      })

      this.s3.upload(clonedParams, (error, response) => {
        if (error) {
          return reject(error)
        }

        return resolve(response.Location)
      })
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
      const clonedParams = Object.assign({}, params, {
        Bucket: this._bucket.pull(),
        Key: location,
      })

      this.s3.deleteObject(clonedParams, (error) => {
        if (error) {
          return reject(error)
        }

        return resolve(true)
      })
    })
  }

  /**
   * Returns s3 object for a given file
   *
   * @method getObject
   * @async
   *
   * @param  {String}  location
   * @param  {Object}  params
   *
   * @return {Promise<Object>}
   */
  getObject (location, params) {
    return new Promise((resolve, reject) => {
      const clonedParams = Object.assign({}, params, {
        Bucket: this._bucket.pull(),
        Key: location,
      })

      this.s3.getObject(clonedParams, (error, response) => {
        if (error) {
          return reject(error)
        }

        return resolve(response)
      })
    })
  }

  /**
   * Returns contents for a give file
   *
   * @method get
   * @async
   *
   * @param  {String} location
   * @param  {String} [encoding = 'utf-8']
   * @param  {Object} [params = {}]
   *
   * @return {Promise<String>}
   */
  async get (location, encoding = 'utf-8', params = {}) {
    const { Body } = await this.getObject(location, params)

    return Buffer.isBuffer(Body) ? Body.toString(encoding) : Body
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
    const clonedParams = Object.assign({}, params, {
      Bucket: this._bucket.pull(),
      Key: location,
    })

    return this.s3.getObject(clonedParams).createReadStream()
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
    const { href } = this.s3.endpoint

    if (href.startsWith('https://s3.amazonaws')) {
      return `https://${bucket}.s3.amazonaws.com/${location}`
    }

    return `${href}${bucket}/${location}`
  }

  /**
   * Returns signed url for an existing file
   *
   * @method getSignedUrl
   * @async
   *
   * @param  {String}     location
   * @param  {Number}     [expiry = 900]
   * @param  {Object}     [params = {}]
   *
   * @return {Promise<String>}
   */
  getSignedUrl (location, expiry, params) {
    return new Promise((resolve, reject) => {
      const clonedParams = Object.assign({}, params, {
        Key: location,
        Bucket: this._bucket.pull(),
        Expires: expiry || 900,
      })

      this.s3.getSignedUrl('getObject', clonedParams, (error, url) => {
        if (error) {
          return reject(error)
        }

        return resolve(url)
      })
    })
  }

  /**
   * Copy file from one location to another within
   * or accross s3 buckets.
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

      const clonedParams = Object.assign({}, params, {
        Key: dest,
        CopySource: `/${bucket}/${src}`,
        Bucket: destBucket || bucket,
      })

      this.s3.copyObject(clonedParams, (error) => {
        if (error) {
          return reject(error)
        }

        return resolve(this.getUrl(dest, destBucket))
      })
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

module.exports = AwsS3
