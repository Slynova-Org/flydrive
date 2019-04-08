/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream'
import { Storage as GCSDriver, StorageOptions, Bucket, File, GetSignedUrlConfig } from '@google-cloud/storage'
import Storage from '../Storage'
import { isReadableStream, pipeline } from '../utils'

export class GoogleCloudStorage extends Storage {
  protected storageDriver: GCSDriver
  protected storageBucket: Bucket

  constructor(protected config: GoogleCloudStorageConfig) {
    super()
    const GCSStorage = require('@google-cloud/storage').Storage;
    this.storageDriver = new GCSStorage(config)
    this.storageBucket = this.storageDriver.bucket(config.bucket)
  }

  private _file(path: string): File {
    return this.storageBucket.file(path)
  }

  /**
   * Use a different bucket at runtime.
   * This method returns a new instance of GoogleCloudStorage.
   */
  bucket(name: string): GoogleCloudStorage {
    const newStorage = new GoogleCloudStorage(this.config)
    newStorage.storageBucket = newStorage.storageDriver.bucket(name)
    return newStorage
  }

  /**
   * Copy a file to a location.
   */
  async copy(src: string, dest: string): Promise<boolean> {
    const srcFile = this._file(src)
    const destFile = this._file(dest)

    await srcFile.copy(destFile)

    return true
  }

  /**
   * Delete existing file.
   * This method will not throw an exception if file doesn't exists.
   */
  async delete(location: string): Promise<boolean> {
    await this._file(location).delete()
    return true
  }

  /**
   * Returns the driver.
   */
  driver(): GCSDriver {
    return this.storageDriver
  }

  /**
   * Determines if a file or folder already exists.
   */
  async exists(location: string): Promise<boolean> {
    const [result] = await this._file(location).exists()
    return result
  }

  /**
   * Returns the file contents.
   */
  async get(location: string, encoding?: string): Promise<Buffer | string | Readable> {
    const file = this._file(location)
    const [content] = await file.download()
    return encoding ? content.toString(encoding) : content
  }

  /**
   * Returns signed url for an existing file.
   */
  async getSignedUrl(location: string, expiry?: number): Promise<string> {
    const file = this._file(location)
    const defaultExpiryTime: number = 900
    let requestParams: GetSignedUrlConfig = {
      action: 'read',
      expires: Date.now() + (expiry === undefined ? defaultExpiryTime : expiry) * 1000
    }
    const [result] = await file.getSignedUrl(requestParams)
    return result
  }

  /**
   * Returns file size in bytes.
   */
  async getSize(location: string): Promise<number> {
    const file = this._file(location)
    const [metadata] = await file.getMetadata()
    return Number(metadata.size)
  }

  /**
   * Returns the stream for the given file.
   */
  getStream(location: string): Readable {
    return this._file(location).createReadStream()
  }

  /**
   * Returns url for a given key. Note this method doesn't
   * validates the existence of file or it's visibility
   * status.
   */
  getUrl(location: string): string {
    return `https://storage.cloud.google.com/${this.storageBucket.name}/${location}`
  }

  /**
   * Move file to a new location.
   */
  async move(src: string, dest: string): Promise<boolean> {
    const srcFile = this._file(src)
    const destFile = this._file(dest)

    await srcFile.move(destFile)

    return true
  }

  /**
   * Creates a new file.
   * This method will create missing directories on the fly.
   */
  async put(location: string, content: Buffer | Readable | string): Promise<boolean> {
    const file = this._file(location)
    if (isReadableStream(content)) {
      const destStream = file.createWriteStream()
      await pipeline(content, destStream)
      return true
    }

    await file.save(content, { resumable: false })
    return true
  }
}

export interface GoogleCloudStorageConfig extends StorageOptions {
  bucket: string
}
