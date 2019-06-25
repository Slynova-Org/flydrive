/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream'
import S3, { ClientConfiguration, GetObjectOutput } from 'aws-sdk/clients/s3'
import { Storage } from '..'
import { FileNotFound } from '../Exceptions'
import { isReadableStream } from '../utils'

export class AWSS3 extends Storage {
  protected $driver: S3
  protected $config: AWSS3Config
  protected $bucket: string

  constructor(config: AWSS3Config) {
    super()
    const S3 = require('aws-sdk/clients/s3')

    this.$driver = new S3({
      accessKeyId: config.key,
      secretAccessKey: config.secret,
      ...config,
    })

    this.$config = config
    this.$bucket = config.bucket
  }

  /**
   * Use a different bucket at runtime.
   * This method returns a new instance of AWSS3.
   */
  public bucket(bucket: string): AWSS3 {
    return new AWSS3({
      ...this.$config,
      bucket,
    })
  }

  /**
   * Copy a file to a location.
   */
  public copy(src: string, dest: string, options: object = {}): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const params = {
        Key: dest,
        Bucket: this.$bucket,
        CopySource: `/${this.$bucket}/${src}`,
        ...options,
      }

      this.$driver.copyObject(params, error => {
        if (error) {
          return reject(error)
        }

        return resolve(true)
      })
    })
  }

  /**
   * Delete existing file.
   */
  public delete(location: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const params = { Key: location, Bucket: this.$bucket }

      this.$driver.deleteObject(params, error => {
        if (error) {
          return reject(error)
        }

        return resolve(true)
      })
    })
  }

  /**
   * Determines if a file or folder already exists.
   */
  public exists(location: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const params = { Key: location, Bucket: this.$bucket }

      this.$driver.headObject(params, error => {
        if (error && error.statusCode === 404) {
          return resolve(false)
        }

        if (error) {
          return reject(error)
        }

        resolve(true)
      })
    })
  }

  /**
   * Returns the file contents.
   */
  public async get(location: string, encoding?: string): Promise<Buffer | string> {
    const { Body } = await this.$getObject(location)

    if (!Body) {
      throw new FileNotFound(location)
    }

    //* Removing the Blob type since Node doesn't support Blob...
    const content = Body as Buffer | Uint8Array | Readable | string

    if (isReadableStream(content)) {
      return this.$streamToBuffer(content)
    }

    if (content instanceof Uint8Array) {
      return new Buffer(content)
    }

    return content
  }

  /**
   * Returns the stream for the given file.
   */
  public getStream(location: string): Readable {
    const params = { Key: location, Bucket: this.$bucket }

    return this.$driver.getObject(params).createReadStream()
  }

  /**
   * Returns url for a given key.
   */
  public getUrl(location: string): string {
    const { href } = this.$driver.endpoint

    if (href.startsWith('https://s3.amazonaws')) {
      return `https://${this.$bucket}.s3.amazonaws.com/${location}`
    }

    return `${href}${this.$bucket}/${location}`
  }

  /**
   * Returns signed url for an existing file
   */
  public getSignedUrl(location: string, expiry: number = 900): Promise<string> {
    return new Promise((resolve, reject) => {
      const params = {
        Key: location,
        Bucket: this.$bucket,
        Expiry: expiry,
      }

      this.$driver.getSignedUrl('getObject', params, (error, url) => {
        if (error) {
          return reject(error)
        }

        return resolve(url)
      })
    })
  }

  /**
   * Moves file from one location to another. This
   * method will call `copy` and `delete` under
   * the hood.
   */
  public async move(src: string, dest: string): Promise<boolean> {
    await this.copy(src, dest)
    await this.delete(src)

    return true
  }

  /**
   * Creates a new file.
   * This method will create missing directories on the fly.
   */
  public put(location: string, content: Buffer | Readable | string, options: object): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const params = { Key: location, Body: content, Bucket: this.$bucket }

      this.$driver.upload(params, error => {
        if (error) {
          return reject(error)
        }

        return resolve(true)
      })
    })
  }

  /**
   * Returns S3 Object for a given file.
   */
  protected $getObject(location: string): Promise<GetObjectOutput> {
    return new Promise((resolve, reject) => {
      const params = { Key: location, Bucket: this.$bucket }

      this.$driver.getObject(params, (error, response) => {
        if (error) {
          return reject(error)
        }

        return resolve(response)
      })
    })
  }

  /**
   * Transform the given Stream to a Buffer
   */
  protected $streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = []

      stream.on('data', chunk => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }
}

export interface AWSS3Config extends ClientConfiguration {
  key: string
  secret: string
  bucket: string
}
