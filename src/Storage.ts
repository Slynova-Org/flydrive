/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Stream, Readable } from 'stream'
import { MethodNotSupported } from './Exceptions'

export interface StorageInterface {
  append: (location: string, content: Buffer | Stream | string, options: Object) => Promise<boolean>
  bucket: (name: string) => void,
  copy: (src: string, dest: string, options: object) => Promise<boolean>
  delete: (location: string) => Promise<boolean>
  driver: () => any
  exists: (location: string) => Promise<boolean>
  get: (location: string, encoding?: object | string) => Promise<Buffer | string | Readable>
  getObject: (location: string) => Promise<any>
  getSignedUrl: (location: string, expiry?: number) => Promise<string>
  getSize: (location: string) => Promise<number>
  getStream: (location: string, options: object | string) => Stream
  getUrl: (location: string) => string
  move: (src: string, dest: string) => Promise<boolean>
  put: (location: string, content: Buffer | Stream | string, options: object) => Promise<boolean>
  prepend: (location: string, content: Buffer | string, options: object) => Promise<boolean>
}

export default abstract class Storage implements StorageInterface {
  /**
   * Appends content to a file.
   *
   * Supported drivers: "local"
   */
  append(location: string, content: Buffer | Stream | string, options: object): Promise<boolean> {
    throw new MethodNotSupported('append', this.constructor.name)
  }

  /**
   * Use a different bucket at runtime.
   *
   * Supported drivers: "s3", "gcs"
   */
  bucket(name: string): void {
    throw new MethodNotSupported('bucket', this.constructor.name)
  }

  /**
   * Copy a file to a location.
   *
   * Supported drivers: "local", "s3", "gcs"
   */
  copy(src: string, dest: string, options: object): Promise<boolean> {
    throw new MethodNotSupported('copy', this.constructor.name)
  }

  /**
   * Delete existing file.
   * This method will not throw an exception if file doesn't exists.
   *
   * Supported drivers: "local", "s3", "gcs"
   */
  delete(location: string): Promise<boolean> {
    throw new MethodNotSupported('delete', this.constructor.name)
  }

  /**
   * Returns the driver.
   *
   * Supported drivers: "local", "s3", "gcs"
   */
  public driver(): any {
    throw new MethodNotSupported('driver', this.constructor.name)
  }

  /**
   * Determines if a file or folder already exists.
   *
   * Supported drivers: "local", "s3", "gcs"
   */
  exists(location: string): Promise<boolean> {
    throw new MethodNotSupported('exists', this.constructor.name)
  }

  /**
   * Returns the file contents.
   *
   * Supported drivers: "local", "s3", "gcs"
   */
  get(location: string, encoding?: object | string): Promise<Buffer | string | Readable> {
    throw new MethodNotSupported('get', this.constructor.name)
  }

  /**
   * Returns an S3 object for a given file.
   *
   * Supported drivers: "s3"
   */
  getObject(location: string): Promise<any> {
    throw new MethodNotSupported('getObject', this.constructor.name)
  }

  /**
   * Returns signed url for an existing file.
   *
   * Supported drivers: "s3", "gcs"
   */
  getSignedUrl(location: string, expiry?: number): Promise<string> {
    throw new MethodNotSupported('getSignedUrl', this.constructor.name)
  }

  /**
   * Returns file size in bytes.
   *
   * Supported drivers: "local", "gcs"
   */
  getSize(location: string): Promise<number> {
    throw new MethodNotSupported('getSize', this.constructor.name)
  }

  /**
   * Returns the stream for the given file.
   *
   * Supported drivers: "local", "s3", "gcs"
   */
  getStream(location: string, options: object | string): Stream {
    throw new MethodNotSupported('getStream', this.constructor.name)
  }

  /**
   * Returns url for a given key. Note this method doesn't
   * validates the existence of file or it's visibility
   * status.
   *
   * Supported drivers: "s3", "gcs"
   */
  getUrl(location: string): string {
    throw new MethodNotSupported('getUrl', this.constructor.name)
  }

  /**
   * Move file to a new location.
   *
   * Supported drivers: "local", "s3", "gcs"
   */
  move(src: string, dest: string): Promise<boolean> {
    throw new MethodNotSupported('move', this.constructor.name)
  }

  /**
   * Creates a new file.
   * This method will create missing directories on the fly.
   *
   * Supported drivers: "local", "s3", "gcs"
   */
  put(location: string, content: Buffer | Stream | string, options: object): Promise<boolean> {
    throw new MethodNotSupported('put', this.constructor.name)
  }

  /**
   * Prepends content to a file.
   *
   * Supported drivers: "local"
   */
  prepend(location: string, content: Buffer | string, options: object): Promise<boolean> {
    throw new MethodNotSupported('prepend', this.constructor.name)
  }
}
