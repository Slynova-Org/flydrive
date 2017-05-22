/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const S3 = require('aws-sdk/clients/s3')
const FileNotFound = require('../Exceptions/FileNotFound')
const MethodNotSupported = require('../Exceptions/MethodNotSupported')

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
  async exists (path) {
    return new Promise((resolve, reject) => {
      this.s3.headObject({ Bucket: this.bucket, Key: path }, (err, data) => {
        if (err.code === 'NotFound') resolve(false)
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
  async get (path) {
    return new Promise((resolve, reject) => {
      this.s3.getObject({ Bucket: this.bucket, Key: path }, (err, data) => {
        if (err) {
          if (err.code === 'NoSuchKey') reject(FileNotFound.file(path))
          return reject(err)
        }
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
  async put (path, content) {
    return new Promise((resolve, reject) => {
      this.s3.upload({ Bucket: this.bucket, Key: path, Body: content }, (err, data) => {
        if (err) return reject(err)
        return resolve(data.Location)
      })
    })
  }

  /**
   * Prepend the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  async prepend (path, content) {
    throw MethodNotSupported.method('prepend', 's3')
  }

  /**
   * Append the content into a file.
   *
   * @param  {string}  path
   * @param  {string}  content
   * @return {boolean}
   */
  async append (path, content) {
    throw MethodNotSupported.method('append', 's3')
  }

  /**
   * Delete the file.
   *
   * @param  {string}  path
   * @return {boolean}
   */
  async delete (path) {
    return new Promise((resolve, reject) => {
      this.s3.deleteObject({ Bucket: this.bucket, Key: path }, (err, data) => {
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }

  /**
   * Move a file to a new location.
   *
   * @param  {string}  oldPath
   * @param  {string}  target
   * @return {boolean}
   */
  async move (oldPath, target) {
    try {
      await this.copy(oldPath, target)
      await this.delete(oldPath)

      return true
    } catch (e) {
      console.log(e)
    }
  }

  /**
   * Copy a file to a location.
   *
   * @param  {string}  path
   * @param  {string}  target
   * @return {boolean}
   */
  async copy (path, target) {
    return new Promise((resolve, reject) => {
      this.s3.copyObject({ Bucket: this.bucket, CopySource: `${this.bucket}/${path}`, Key: target }, (err, data) => {
        if (err) return reject(err)
        return resolve(true)
      })
    })
  }

}

module.exports = AwsS3
