/**
 * node-flydrive
 * this driver need google-auth-library to function
 * Author: Doumbia Mahamadou (doumbiamahamadou.ensate@gmail.com)
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const GoogleAuth = require('google-auth-library')
const async = require('async')
class GoogleDrive {
  constructor (config) {
    this.drive = require('./drive')
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.redirectUrl = config.redirectUrl
    const auth = new GoogleAuth()
    this._oaut2Client = new auth.OAuth2(this.clientId, this.clientSecret, this.redirectUrl)
  }

  /**
   * Resolve a single file id based on its parent id and the file name
   * @param parentId ( Nullable )
   * @param token
   * @param fileName
   * @private
   */
  _resolveId (parentId, fileName, token) {
    return new Promise((resolve, reject) => {
      let pageToken = null
      if (!parentId) parentId = 'root'
      const params = {
        q: `'${parentId}' in parents and name = '${fileName}'`,
        fields: 'nextPageToken, incompleteSearch, files(id, name)',
        spaces: 'drive',
        pageToken: pageToken,
        pageSize: 1
      }
      let id = null
      async.doWhilst((cb) => {
        params.pageToken = pageToken
        this.drive(token).files().list(params, (err, response, body) => {
          if (err) return cb(err)
          if (response.statusCode !== 200) return cb(GoogleDrive.__onError(response.statusMessage, response.statusCode))
          const rep = JSON.parse(body)
          const files = rep.files
          if (!files) reject(new Error('an error occured'))
          if (files.length === 0) resolve(null)
          for (let i = 0; i < files.length; i++) {
            const f = files[i]
            if (f.name === fileName) {
              id = f.id
              pageToken = null
              return cb()
            }
          }
          if (!rep.incompleteSearch) {
            pageToken = null
          } else pageToken = rep.nextPageToken
          cb()
        })
      }, () => {
        return !!pageToken
      }, (err) => {
        if (err) return reject(err)
        else {
          resolve(id)
        }
      })
    })
  }
  /**
   * That method try to resolve a file id based on its full path
   *
   * @param fullPath
   * @private
   */
  __resolveFileId (fullPath, token) {
    return new Promise(async (resolve, reject) => {
      const parents = fullPath.split(/\//)
      let parentCount = parents.length
      if (parentCount === 0) resolve('root')
      // list the root directory
      let parentId = null
      let count = 0
      while (count < parentCount) {
        // get the top parent id
        parentId = await this._resolveId(parentId, parents[count].trim(), token)
        if (parentId === null) return resolve(null)// not found
        count++
      }
      return resolve(parentId)
    })
  }
  /**
   * Use a different token at runtime
   * Can be useful when you want to work on different google driver
   * @param token (must contains a refresh token so that the oauthclient can refresh a new access token)
   * @returns {Promise.<GoogleDrive>}
   */
  with (token) {
    if (typeof token === 'string') {
      this._oaut2Client.credentials = token
    } else {
      this._oaut2Client.credentials = Object.assign({}, token)
      /* if (token.refresh_token || token.refresToken) {
        this._oaut2Client.credentials.access_token = await this.getNewTokenFromRefresh(token.refresh_token || token.refresToken)
      } */
    }
    return this
  }
  __token () {
    return new Promise(async (resolve, reject) => {
      if (!this._oaut2Client) return reject(new Error('No oauth2 token found'))
      if (typeof this._oaut2Client.credentials === 'string') {
        return this._oaut2Client.credentials
      }
      let token = this._oaut2Client.credentials.access_token
      let refreshToken = this._oaut2Client.credentials.refresh_token || this._oaut2Client.credentials.refreshToken
      try {
        if (refreshToken) token = await this.getNewTokenFromRefresh(refreshToken)
        return resolve(token)
      } catch (err) {
        reject(err)
      }
    })
  }
  /**
   * retrieve a new token from a refresh token
   * @param refreshToken
   * @returns {Promise}
   */
  getNewTokenFromRefresh (refreshToken) {
    return new Promise((resolve, reject) => {
      this._oaut2Client.credentials = {refresh_token: refreshToken}
      this._oaut2Client.getRequestMetadata(null, (err, headers) => {
        if (err) return reject(err)
        resolve(headers.Authorization.split(/\s/)[1])
      })
    })
  }
  /**
   * Finds if a file exists or not by it's id
   *
   * @method exists
   * @async
   *
   * @param  {String} fileId
   * @param  {Object} [params]
   *
   * @return {Promise<Object || null>}
   */
  idExists (fileId, params) {
    return new Promise(async (resolve, reject) => {
      //  location is the file full path from the drive root
      const clonedParams = Object.assign({}, params, {
        token: this._oaut2Client,
        fileId: fileId
      })
      this.drive(await this.__token()).files(fileId).get(clonedParams, (err, resp, body) => {
        if (err) return reject(err)
        if (resp.statusCode !== 200) {
          return resolve(null)
        }
        resolve(JSON.parse(body))
      })
    })
  }
  /**
   * Finds if a file exists or not
   *
   * @method exists
   * @async
   *
   * @param  {String} fileName
   * @param  {String} params
   * @return {Promise<Boolean>}
   */
  async exists (fileName, params = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const token = await this.__token()
        if (params.fileId) return resolve(await this.idExists(params.fileId))
        const id = await this.__resolveFileId(fileName, token)
        resolve(id)
      } catch (err) {
        reject(err)
      }
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
  put (location, content, params = {}) {
    return new Promise(async (resolve, reject) => {
      let parentId = null
      let fileName
      if (params.parentId) {
        parentId = params.parentId
        delete params.parentId
        fileName = location
      } else {
        let parents = location.split(/\//)
        if (parents.length === 0) return resolve(null)
        fileName = parents.splice(parents.length - 1)[0]
        let fpath = parents.join('/')
        parentId = await this.exists(fpath)
      }
      if (parentId === null) parentId = 'root'
      let metadata = content.metadata || {}
      let clonedParams = Object.assign({}, params, {
        uploadType: 'multipart'
      })
      let resource = Object.assign({}, metadata, {
        name: fileName,
        parents: [parentId]
      })
      let media = content.media || {}
      let meta = {
        media,
        resource
      }
      this.drive(await this.__token()).files(parentId).create(meta, clonedParams, (err, response, body) => {
        if (err) return reject(err)
        if (response.statusCode !== 200) return reject(GoogleDrive.__onError(response.statusMessage, response.statusCode))
        const rep = JSON.parse(body)
        resolve(rep)
      })
    })
  }
  /**
   * Returns contents for a give file
   *
   * @method get
   * @async
   *
   * @param  {String} location
   * @param  {Object} [params = {}]
   * @param  {String} [dest = 'utf-8']
   *
   * @return {Promise<String>}
   */
  async get (location, params = {}, dest = null) {
    try {
      let fileId = null
      if (params.fileId) {
        fileId = params.fileId
        delete params.fileId
      } else fileId = await this.exists(location)
      const copiedParams = Object.assign({}, params)
      return await this.download(await this.__token(), fileId, copiedParams, dest)
    } catch (e) {
      return null
    }
  }
  /**
   * Copy file from one location to another within
   *
   * @method copy
   *
   * @param  {String} src
   * @param  {String} dest
   * @param  {String} meta [meta = {}]
   * @param  {Object} [params = {}]
   *
   * @return {Promise<String>}
   */
  copy (src, dest, meta = {}, params = {}) {
    return new Promise(async (resolve, reject) => {
      let destParentId = null
      let fileName = null
      if (meta.destinationParentId || params.destinationParentId) {
        destParentId = meta.destinationParentId || params.destinationParentId
        delete meta.destinationParentId
        delete params.destinationParentId
        fileName = dest
        if (destParentId === null) return resolve(null)
      } else {
        let destinationParents = dest.split(/\//)
        if (destinationParents.length === 0) return resolve(null)
        fileName = destinationParents.splice(destinationParents.length - 1)[0]
        let fpath = destinationParents.join('/')
        destParentId = await this.exists(fpath)
        if (destParentId === null) return resolve(null)
      }
      let srcId = null
      if (meta.sourceId || params.sourceId) {
        srcId = meta.sourceId || params.sourceId
        if (srcId === null) return reject(GoogleDrive.__onError('Source file not found', 404))
      } else {
        srcId = await this.exists(src)
        if (srcId === null) return reject(GoogleDrive.__onError('Source file not found', 404))
      }
      let clonedParams = Object.assign({}, params)
      meta = Object.assign({resource: {}, media: null}, meta)
      let resource = Object.assign({
        name: fileName,
        parents: [destParentId]
      }, meta.resource)
      this.drive(await this.__token()).files(srcId).copy({resource, media: meta.media}, clonedParams, (err, response, body) => {
        if (err) return reject(err)
        if (response.statusCode !== 200) {
          return reject(GoogleDrive.__onError(response.statusMessage, response.statusCode))
        }
        //
        const rep = JSON.parse(body)
        resolve(rep)
      })
    })
  }
  /**
   * Moves file from one location to another. This
   *
   * @method move
   *
   * @param  {String} src
   * @param  {String} dest
   * @param  {Object} [params = {}]
   *
   * @return {Promise<String>}
   */
  async move (src, dest, params = {}) {
    return new Promise(async (resolve, reject) => {
      let srcFile = null
      if (params.sourceId) {
        srcFile = JSON.parse(await this.get(src, {fileId: params.sourceId, fields: 'id, name, mimeType, parents', alt: null, encoding: 'utf-8'}))
        delete params.sourceId
      } else {
        srcFile = JSON.parse(await this.get(src, {fields: 'id, name, mimeType, parents', alt: null, encoding: 'utf-8'}))
      }
      let srcId = srcFile.id
      if (!srcId) return reject(GoogleDrive.__onError('Source not found', 404))
      let srcParentId = null
      if (srcFile.parents.length > 0) {
        if (params.sourceParentId) {
          srcParentId = params.sourceParentId
          delete params.sourceParentId
        } else {
          let filesArr = src.split('/')
          filesArr.splice(filesArr.length - 1)
          srcParentId = await this.exists(filesArr.join('/'))
        }
      }
      let destParentId = null
      if (params.destinationParentId) {
        destParentId = params.destinationParentId
        delete params.destinationParentId
      } else {
        destParentId = await this.exists(dest)
      }
      if (!destParentId) destParentId = 'root'
      let parentToRemoves = ''
      if (srcParentId) {
        let ind = srcFile.parents.indexOf(srcParentId)
        if (ind >= 0) {
          parentToRemoves = (srcFile.parents.splice(ind, 1)).join(',')
        }
      }
      srcFile.parents.push(destParentId)
      let parentToAdd = srcFile.parents.join(',')
      let clonedParams = Object.assign({}, params, {
        addParents: parentToAdd,
        removeParents: parentToRemoves
      })
      let resource = {
        name: srcFile.name,
        mimeType: srcFile.mimeType
      }
      this.drive(await this.__token()).files(srcId).update({resource}, clonedParams, (err, response, body) => {
        if (err) return reject(err)
        if (response.statusCode !== 200) {
          return reject(GoogleDrive.__onError(response.statusMessage, response.statusCode))
        }
        const rep = JSON.parse(body)
        resolve(rep)
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
    return new Promise(async (resolve, reject) => {
      let fileId = null
      if (params.fileId) fileId = params.fileId
      else fileId = await this.exists(location)
      if (!fileId) return reject(GoogleDrive.__onError('Not found!!!! ', 404))
      this.drive(await this.__token()).files(fileId).delete((error, response) => {
        if (error) {
          return reject(error)
        }
        resolve(true)
      })
    })
  }
  download (token, fileId, params, dest) {
    return new Promise((resolve, reject) => {
      params = Object.assign({alt: false}, params)

      const encoding = params.encoding || null
      let req = this.drive(token).files(fileId).get(params, encoding, (err, resp, body) => {
        if (resp.statusCode !== 200) {
          return reject(GoogleDrive.__onError(resp.statusMessage, resp.statusCode))
        }
        if (err) return reject(err)
        return resolve(body)
      })
      if (dest) req.pipe(dest)
    })
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
  async getStream (location, params = {}) {
    let fileId = null
    if (params.fileId) {
      fileId = params.fileId
    } else fileId = await this.exists(location)
    if (!fileId) return null
    const clonedParams = Object.assign({}, params, {
      alt: 'media'
    })
    const token = await this.__token()
    return this.drive(token).files(fileId).get(clonedParams, null)
  }
  static __onError (msg, code) {
    const error = new Error(msg)
    error.code = code
    return error
  }
}
module.exports = GoogleDrive
