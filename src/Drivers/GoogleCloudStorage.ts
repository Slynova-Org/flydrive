import { Readable } from 'stream'

import { Storage as GCSDriver, StorageOptions, Bucket, File } from '@google-cloud/storage'

import Storage from '../Storage'
import { isReadableStream, pipeline } from '../../utils'

export interface GoogleCloudStorageConfig extends StorageOptions {
  bucket: string
}

export class GoogleCloudStorage extends Storage {
  private $driver: GCSDriver
  private $bucket: Bucket
  public constructor(config: GoogleCloudStorageConfig) {
    super()
    this.$driver = new GCSDriver(config)
    this.$bucket = this.$driver.bucket(config.bucket)
  }

  private _file(path: string): File {
    return this.$bucket.file(path)
  }

  public bucket(name: string): void {
    this.$bucket = this.$driver.bucket(name)
  }

  public async copy(src: string, dest: string): Promise<boolean> {
    const srcFile = this._file(src)
    const destFile = this._file(dest)

    await srcFile.copy(destFile)

    return true
  }

  public async delete(location: string): Promise<boolean> {
    await this._file(location).delete()
    return true
  }

  public driver(): GCSDriver {
    return this.$driver
  }

  public async exists(location: string): Promise<boolean> {
    const [result] = await this._file(location).exists()
    return result
  }

  public async get(location: string, encoding?: string): Promise<Buffer | string> {
    const file = this._file(location)
    const [content] = await file.download()
    return encoding ? content.toString(encoding) : content
  }

  public async getSignedUrl(location: string, expiry: number = 900): Promise<string> {
    const file = this._file(location)
    const [result] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiry * 1000,
    })
    return result
  }

  public async getSize(location: string): Promise<number> {
    const file = this._file(location)
    const [metadata] = await file.getMetadata()
    return Number(metadata.size)
  }

  public getStream(location: string): Readable {
    return this._file(location).createReadStream()
  }

  public getUrl(location: string): string {
    return `https://storage.cloud.google.com/${this.$bucket.name}/${location}`
  }

  public async move(src: string, dest: string): Promise<boolean> {
    const srcFile = this._file(src)
    const destFile = this._file(dest)

    await srcFile.move(destFile)

    return true
  }

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
