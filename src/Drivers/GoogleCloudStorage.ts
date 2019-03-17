/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream'
import { Storage as GCSDriver, StorageOptions, Bucket, File } from '@google-cloud/storage'
import Storage from '../Storage'
import { isReadableStream, pipeline } from '../utils'

export class GoogleCloudStorage extends Storage {
  protected $config: GoogleCloudStorageConfig
  protected $driver: GCSDriver
  protected $bucket: Bucket

  public constructor(config: GoogleCloudStorageConfig) {
    super()
    this.$config = config
    const GCSStorage = require('@google-cloud/storage').Storage;
    this.$driver = new GCSStorage(config)
    this.$bucket = this.$driver.bucket(config.bucket)
  }

  private _file(path: string): File {
    return this.$bucket.file(path)
  }

  /**
   * Use a different bucket at runtime.
   * This method returns a new instance of GoogleCloudStorage.
   */
  public bucket(name: string): GoogleCloudStorage {
    const newStorage = new GoogleCloudStorage(this.$config)
    newStorage.$bucket = newStorage.$driver.bucket(name)
    return newStorage
  }

  /**
   * Copy a file to a location.
   */
  public async copy(src: string, dest: string): Promise<boolean> {
    const srcFile = this._file(src)
    const destFile = this._file(dest)

    await srcFile.copy(destFile)

    return true
  }

  /**
   * Delete existing file.
   * This method will not throw an exception if file doesn't exists.
   */
  public async delete(location: string): Promise<boolean> {
    await this._file(location).delete()
    return true
  }

  /**
   * Returns the driver.
   */
  public driver(): GCSDriver {
    return this.$driver
  }

  /**
   * Determines if a file or folder already exists.
   */
  public async exists(location: string): Promise<boolean> {
    const [result] = await this._file(location).exists()
    return result
  }

  /**
   * Returns the file contents.
   */
  public async get(location: string, encoding?: string): Promise<Buffer | string> {
    const file = this._file(location)
    const [content] = await file.download()
    return encoding ? content.toString(encoding) : content
  }

  /**
   * Returns signed url for an existing file.
   */
  public async getSignedUrl(location: string, expiry: number = 900): Promise<string> {
    const file = this._file(location)
    const [result] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiry * 1000,
    })
    return result
  }

  /**
   * Returns file size in bytes.
   */
  public async getSize(location: string): Promise<number> {
    const file = this._file(location)
    const [metadata] = await file.getMetadata()
    return Number(metadata.size)
  }

  /**
   * Returns the stream for the given file.
   */
  public getStream(location: string): Readable {
    return this._file(location).createReadStream()
  }

  /**
   * Returns url for a given key. Note this method doesn't
   * validates the existence of file or it's visibility
   * status.
   */
  public getUrl(location: string): string {
    return `https://storage.cloud.google.com/${this.$bucket.name}/${location}`
  }

  /**
   * Move file to a new location.
   */
  public async move(src: string, dest: string): Promise<boolean> {
    const srcFile = this._file(src)
    const destFile = this._file(dest)

    await srcFile.move(destFile)

    return true
  }

  /**
   * Creates a new file.
   * This method will create missing directories on the fly.
   */
  public async put(location: string, content: Buffer | Readable | string): Promise<boolean> {
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
