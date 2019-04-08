/**
 * @reference https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
 *
 * @license MIT
 */

import { Readable } from 'stream'
import * as aws from 'aws-sdk'
import Storage from '../Storage'

const PUBLIC_GRANT_URI: string = 'http://acs.amazonaws.com/groups/global/AllUsers'

export class S3Storage extends Storage {
  protected client: aws.S3

  constructor(protected config: S3Config) {
    super()
    this.client = new aws.S3(config)
  }

  /**
   * Use a different bucket at runtime.
   * This method returns a new instance of GoogleCloudStorage.
   */
  bucket(name: string): S3Storage {
    return new S3Storage(Object.assign(this.config, {bucket: name}))
  }

  /**
   * Copy a file to a location.
   */
  copy(src: string, dest: string): Promise<boolean> {
    let copyProperties: aws.S3.CopyObjectRequest = {
      Bucket: this.config.bucket,
      CopySource: `/${this.config.bucket}/${src}`,
      Key: dest,
      ACL: this.isPublic(src) ? 'public-read' : 'private'
    }
    return new Promise((res, rej) => {
      this.client.copyObject(copyProperties, (err) => {
        if (err) {
          rej(err)
        } else {
          res(true)
        }
      })
    })
  }

  /**
   * Delete existing file.
   * This method will not throw an exception if file doesn't exists.
   */
  delete(location: string): Promise<boolean> {
    let deleteRequest: aws.S3.DeleteObjectRequest = {
      Bucket: this.config.bucket,
      Key: location
    }
    return new Promise((res, rej) => {
      this.client.deleteObject(deleteRequest, (err) => {
        if (err) {
          rej(err)
        } else {
          res(true)
        }
      })
    })
  }

  /**
   * Returns the driver.
   */
  driver(): aws.S3 {
    return this.client
  }

  /**
   * Determines if a file or folder already exists.
   */
  exists(location: string): Promise<boolean> {
    let headObjectRequest: aws.S3.HeadObjectRequest = {
      Bucket: this.config.bucket,
      Key: location
    }
    return new Promise((res, rej) => {
      this.client.headObject(headObjectRequest, (err, data) => {
        if (err && err.statusCode === 404) {
          res(false)
          return;
        }
        if (err) {
          rej(err)
          return;
        }
        res(true)
      })
    })
  }

  /**
   * Returns the file contents.
   */
  async get(location: string, encoding?: string): Promise<Buffer | string | Readable> {
    let getObjectRequest: aws.S3.GetObjectRequest = {
      Bucket: this.config.bucket,
      Key: location
    }
    return new Promise((res, rej) => {
      this.client.getObject(getObjectRequest, (err, data) => {
        if (err) {
          rej(err)
        } else {
          let result: Buffer | Readable | string
          if (data.Body instanceof Uint8Array) {
            result = Buffer.from(data.Body)
          } else if (data.Body instanceof Buffer || data.Body instanceof Readable || typeof data.Body === 'string') {
            result = data.Body
          } else {
            result = data.Body as string
          }
          if (encoding && (result instanceof Buffer || result instanceof Readable)) {
            res(result.toString(encoding))
            return
          }

          res(result)
        }
      })
    })
  }

  /**
   * Returns signed url for an existing file.
   */
  getSignedUrl(location: string, expiry: number = 900): Promise<string> {
    let getSignedUrlParams = { Bucket: this.config.bucket, Key: location, }
    if (expiry !== undefined) {
      getSignedUrlParams['Expires'] = expiry
    }
    return new Promise((res, rej) => {
      this.client.getSignedUrl('getObject', getSignedUrlParams, (err, url) => {
        if (err) {
          rej(err)
        } else {
          res(url)
        }
      })
    })
  }

  /**
   * Returns file size in bytes.
   */
  async getSize(location: string): Promise<number> {
    let headObjectRequest: aws.S3.HeadObjectRequest = {
      Bucket: this.config.bucket,
      Key: location,
    }
    return new Promise((res, rej) => {
      this.client.headObject(headObjectRequest, (err, data) => {
        if (err) {
          rej(err)
        } else {
          res(data.ContentLength)
        }
      })
    })
  }

  /**
   * Returns the stream for the given file.
   */
  getStream(location: string): Readable {
    let getObjectRequest: aws.S3.GetObjectRequest = {
      Bucket: this.config.bucket,
      Key: location
    }
    return this.client.getObject(getObjectRequest).createReadStream()
  }

  /**
   * Returns url for a given key. Note this method doesn't
   * validates the existence of file or it's visibility
   * status.
   */
  getUrl(location: string): string {
    const { protocol, port, host } = this.client.endpoint
    // no need to specify host if that's 80 or 443.
    // @TODO @investigate URL might be hardcoded with
    // http(s)://<bucket>.s3.amazonaws.com/<object>
    // or
    // http(s)://s3.amazonaws.com/<bucket>/<object>
    // acccording to @link https://forums.aws.amazon.com/thread.jspa?threadID=93828
    if (port === 80 || port === 443) {
      return `${protocol}//${this.config.bucket}.${host}/${location}`
    }
    return `${protocol}//${this.config.bucket}.${host}:${port}/${location}`
  }

  /**
   * Move file to a new location.
   */
  move(src: string, dest: string): Promise<boolean> {
    return this.copy(src, dest).then(isCopied => {
      if (!isCopied) {
        return false
      }
      return this.delete(src)
    })
  }

  /**
   * Creates a new file.
   * This method will create missing directories on the fly.
   * 
   * @TODO add configuration for upload (i.e. ability to specify ACL)
   */
  put(location: string, content: Buffer | Readable | string): Promise<boolean> {
    let putObjectRequest: aws.S3.PutObjectRequest = {
      Body: content,
      Key: location,
      Bucket: this.config.bucket,

    }
    return new Promise((res, rej) => {
      this.client.upload(putObjectRequest, (err, data) => {
        if (err) {
          rej(err)
        } else {
          // @TODO think about enhancing put method interface so we can grab more useful information like ETag
          res(true)
        }
      })
    })
  }

  protected isPublic(path: string): Promise<boolean> {
    return this.getRawVisibility(path).then(visibility => {
      if (visibility.Grants === undefined) {
        return false
      }
      for (let grant of visibility.Grants) {
          if (
            grant.Grantee !== undefined
            && grant.Grantee.URI === PUBLIC_GRANT_URI
            && grant.Permission === 'READ'
          ) {
            return true
          }
      }
      return false
    })
  }

  protected getRawVisibility(path: string): Promise<aws.S3.GetObjectAclOutput> {
    let aclRequest: aws.S3.GetObjectAclRequest = {
      Bucket: this.config.bucket,
      Key: path,
    }
    return new Promise((res, rej) => {
      this.client.getObjectAcl(aclRequest, (err, data) => {
        if (err) {
          rej(err)
        } else {
          res(data)
        }
      })
    })
  }
}

export interface S3Config extends aws.S3.ClientConfiguration {
  bucket: string
}
