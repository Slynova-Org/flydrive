const Resetable = require('resetable')
const COS = require('cos-nodejs-sdk-v5')

/**
 * Tencent Cloud COS driver for using with flydrive
 *
 * @constructor
 * @class TencentCOS
 */
class TencentCOS {
  constructor (config) {
    // this.config = Object.assign({}, {
    //   bucket: config.bucket,
    //   region: config.region,
    //   secure: config.secure,
    // }, config)
    this.cos = new COS(Object.assign({}, {
      AppId: config.AppId,
      SecretId: config.SecretId,
      SecretKey: config.SecretKey,
      bucket: config.bucket,
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
      const clonedParams = Object.assign({}, params, {
        Bucket: this._bucket.pull(),
        Region: this.cos.region,
        Key: location,
      })

      this.cos.headObject(clonedParams, (error) => {
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
        Bucket: this._bucket.pull(),
        Region: this.cos.region,
        Key: location,
        Body: content,
      })
      
      this.cos.putObject(clonedParams, (error, response) => {
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
        Region: this.cos.region,
        Key: location,
      })

      this.cos.deleteObject(clonedParams, (error) => {
        if (error) {
          return reject(error)
        }

        return resolve(true)
      })
    })
  }

  /**
   * Returns object for a given file
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
        Region: this.cos.region,
        Key: location,
        Output: location
      })

      this.cos.getObject(clonedParams, (error, response) => {
        if (error) {
          return reject(error)
        }

        return resolve(response)
      })
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
      Region: this.cos.region,
      Bucket: this._bucket.pull(),
      Key: location,
    })

    return this.cos.getObject(clonedParams).createReadStream()
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
    const { secure, region } = this.cos.options
    const protocol = secure ? 'https://' : 'http://'
    return `${protocol}${bucket}.cos.${region}.myqcloud.com/${location}`
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

      const clonedParams = Object.assign({}, params, {
        Key: dest,
        CopySource: `/${bucket}/${src}`,
        Bucket: destBucket || bucket,
        Region: this.cos.region
      })

      this.cos.sliceCopyFile(clonedParams, (error) => {
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

module.exports = TencentCOS
