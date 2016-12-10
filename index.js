'use strict'

const config = require('./tests/stubs/config')
const StorageManager = require('./src/StorageManager')

const storage = new StorageManager(config)

storage.extend('myDriver', function (config) {
  console.log(config)
  console.log('custom')
})

storage.disk('local')
