'use strict'

/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const S3 = require('aws-sdk/clients/s3');
const FileNotFound = require('../Exceptions/FileNotFound');

class AwsS3 {

  /**
   * Constructor.
   */
  constructor (config) {
    this.bucket = config.bucket
    this.s3 = new S3({
      accessKeyId: config.key,
      secretAccessKey: config.secret,
      region: config.region
    })
  }

  /**
   * Determine if a file or directory exists.
   *
   * @param  {string}  path
   * @return {boolean}
   */
  * exists (path) {
    return new Promise((resolve, reject) => {
      this.s3.headObject({ Bucket: this.bucket, Key: path }, (err, data) => {
        if ('NotFound' === err.code) resolve(false)
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }

  /**
   * Get the content of a file.
   *
   * @param  {string}  path
   * @return {Buffer}
   */
  * get (path) {
    return new Promise((resolve, reject) => {
      this.s3.getObject({ Bucket: this.bucket, Key: path }, (err, data) => {
        if (err) return reject(err)
        return resolve(data.Body)
      })
    })
  }

  /**
   * Write the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {string}
   */
  * put (path, content) {
    return new Promise((resolve, reject) => {
      this.s3.upload({ Bucket: this.bucket, Key: path, Body: content }, (err, data) => {
        if (err) return reject(err)
        return resolve(data.Location)
      })
    })
  }

}

module.exports = AwsS3
