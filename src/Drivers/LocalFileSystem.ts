/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Stream } from 'stream'
import { isAbsolute, join } from 'path'
import fs from 'fs-extra'
import createOutputStream from 'create-output-stream'
import Storage from '../Storage'
import { FileNotFound } from '../Exceptions'
import { isReadableStream, pipeline } from '../../utils'

export class LocalFileSystem extends Storage {
  constructor(protected $config: LocalFileSystemConfig) {
    super()
  }

  /**
   * Returns full path to the storage root directory.
   */
  private _fullPath(relativePath: string): string {
    return isAbsolute(relativePath) ? relativePath : join(this.$config.root, relativePath)
  }

  /**
   * Appends content to a file.
   */
  public async append(
    location: string,
    content: Buffer | Stream | string,
    options?: fs.WriteFileOptions
  ): Promise<boolean> {
    if (isReadableStream(content)) {
      return this.put(location, content, Object.assign({ flags: 'a' }, options))
    }

    await fs.appendFile(this._fullPath(location), content, options)

    return true
  }

  /**
   * Copy a file to a location.
   */
  public async copy(src: string, dest: string, options?: fs.CopyOptions): Promise<boolean> {
    await fs.copy(this._fullPath(src), this._fullPath(dest), options)

    return true
  }

  /**
   * Delete existing file.
   * This method will not throw an exception if file doesn't exists.
   */
  public async delete(location: string): Promise<boolean> {
    await fs.remove(this._fullPath(location))

    return true
  }

  /**
   * Determines if a file or folder already exists.
   */
  public exists(location: string) {
    return fs.pathExists(this._fullPath(location))
  }

  /**
   * Returns the file contents.
   */
  public async get(location: string, encoding: string = 'utf8'): Promise<Buffer | string> {
    const fullPath = this._fullPath(location)

    try {
      return await fs.readFile(fullPath, encoding)
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new FileNotFound(fullPath)
      }

      throw e
    }
  }

  /**
   * Returns file size in bytes.
   */
  public async getSize(location: string): Promise<number> {
    const fullPath = this._fullPath(location)

    try {
      const stat = await fs.stat(fullPath)

      return stat.size
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new FileNotFound(fullPath)
      }

      throw e
    }
  }

  /**
   * Returns a read stream for a file location.
   */
  public getStream(location: string, options?: ReadStreamOptions | string): fs.ReadStream {
    return fs.createReadStream(this._fullPath(location), options)
  }

  /**
   * Move file to a new location.
   */
  public async move(src: string, dest: string): Promise<boolean> {
    await fs.move(this._fullPath(src), this._fullPath(dest))

    return true
  }

  /**
   * Prepends content to a file.
   */
  public async prepend(location: string, content: Buffer | string, options?: fs.WriteFileOptions): Promise<boolean> {
    if (await this.exists(location)) {
      const actualContent = await this.get(location, 'utf-8')

      return this.put(location, `${content}${actualContent}`, options)
    }

    return this.put(location, content, options)
  }

  /**
   * Creates a new file.
   * This method will create missing directories on the fly.
   */
  public async put(
    location: string,
    content: Buffer | Stream | string,
    options?: fs.WriteFileOptions
  ): Promise<boolean> {
    const fullPath = this._fullPath(location)

    if (isReadableStream(content)) {
      const ws = createOutputStream(fullPath, options)
      await pipeline(content, ws)

      return true
    }

    await fs.outputFile(fullPath, content, options)

    return true
  }
}

export type LocalFileSystemConfig = {
  root: string
}

export type ReadStreamOptions = {
  flags?: string
  encoding?: string
  fd?: number
  mode?: number
  autoClose?: boolean
  start?: number
  end?: number
  highWaterMark?: number
}
