
//     node-google-drive
//     Copyright (c) 2012- Nick Baugh <niftylettuce@gmail.com> (http://niftylettuce.com)
//     MIT Licensed

// Open source node.js module for accessing Google Drive's API:
// <https://developers.google.com/drive/v1/reference/>

// * Author: [@niftylettuce](https://twitter.com/#!/niftylettuce)
// * Source: <https://github.com/niftylettuce/node-google-drive>

// # node-google-drive

const baseUrl = 'https://www.googleapis.com/drive/v3'
const uploadUrl = 'https://www.googleapis.com/upload/drive/v3'
const request = require('request')

function extend (a, b) {
  for (var x in b) a[x] = b[x]
  return a
}

module.exports = function (accessToken) {
  var defaults = {
    headers: {
      Authorization: 'Bearer ' + accessToken
    },
    qs: {}
  }

  function makeRequest (p) {
    var options = defaults
    options.qs = extend(options.qs, p.params)
    if (p.meta) {
      if (p.meta.media && p.meta.media) {
        options.multipart = [
          {
            'content-type': 'application/json',
            body: JSON.stringify(p.meta.resource)
          }
        ]
        if(p.meta.media.body){
          options.multipart.push({
            'content-type': p.meta.media.mimeType,
            body: (p.meta.media.body)
          })
        }
      }else{
        options.headers['Content-Type'] = 'application/json'
        options.body = JSON.stringify(p.meta.resource || p.meta);
      }
    } else {
      options.headers['Content-Type'] = 'application/json'
      options.body = null
    }
    return request.defaults(options)
  }

  function extractParams (meta, params, cb) {
    if ((!cb) && (!params) && (typeof meta === 'function')) {
      return {meta: {}, params: {}, cb: meta}
    } else if ((!cb) && (typeof params === 'function')) {
      return {meta: meta, params: {}, cb: params}
    } else return {meta: meta, params: params, cb: cb}
  }

  const resources = {}

  resources.files = function (fileId) {
    return {
      list: function (params, cb) {
        var p = extractParams(undefined, params, cb)
        return makeRequest(p).get(baseUrl + '/files', p.cb)
      },
      create: function (meta, params, cb) {
        var p = extractParams(meta, params, cb)
        let req = makeRequest(p)
        return req.post(uploadUrl + '/files', p.cb)
      },
      get: function (params, encoding, cb) {
        if (typeof encoding === 'function') {
          cb = encoding
          encoding = undefined
        }
        var p = extractParams(undefined, params, cb)
        return makeRequest(p).get(baseUrl + '/files/' + fileId, {encoding}, p.cb)
      },
      patch: function (meta, params, cb) {
        var p = extractParams(meta, params, cb)
        return makeRequest(p).patch(baseUrl + '/files/' + fileId, p.cb)
      },
      update: function (meta, params, cb) {
        var p = extractParams(meta, params, cb)
        return makeRequest(p).patch(baseUrl + '/files/' + fileId, p.cb)
      },
      copy: function (meta, params, cb) {
        var p = extractParams(meta, params, cb)
        return makeRequest(p).post(baseUrl + '/files/' + fileId + '/copy', p.cb)
      },
      delete: function (cb) {
        var p = extractParams(undefined, undefined, cb)
        return makeRequest(p).del(baseUrl + '/files/' + fileId, p.cb)
      },
      touch: function (cb) {
        var p = extractParams(undefined, undefined, cb)
        return makeRequest(p).post(baseUrl + '/files/' + fileId, p.cb)
      },
      trash: function (cb) {
        var p = extractParams(undefined, undefined, cb)
        return makeRequest(p).post(baseUrl + '/files/' + fileId + '/trash', p.cb)
      },
      untrash: function (cb) {
        var p = extractParams(undefined, undefined, cb)
        return makeRequest(p).post(baseUrl + '/files/' + fileId + '/untrash', p.cb)
      },
      permissions: function (permId) {
        return {
          list: function (params, cb) {
            var p = extractParams(undefined, params, cb)
            return makeRequest(p).get(baseUrl + '/files/' + fileId + '/permissions', p.cb)
          },
          patch: function (meta, params, cb) {
            var p = extractParams(meta, params, cb)
            return makeRequest(p).patch(baseUrl + '/files/' + fileId + '/permissions/' + permId, p.cb)
          },
          update: function (meta, params, cb) {
            var p = extractParams(meta, params, cb)
            return makeRequest(p).put(baseUrl + '/files/' + fileId + '/permissions/' + permId, p.cb)
          },
          insert: function (meta, params, cb) {
            var p = extractParams(meta, params, cb)
            return makeRequest(p).post(baseUrl + '/files/' + fileId + '/permissions', p.cb)
          },
          getIdForEmail: function (email, params, cb) {
            var p = extractParams(undefined, params, cb)
            return makeRequest(p).get(baseUrl + '/permissionIds/' + email, p.cb)
          }
        }
      }
    }
  }

  return resources
}
