'use strict'

const co = require('co')
const config = require('./tests/stubs/config')
const StorageManager = require('./src/StorageManager')

const storage = new StorageManager(config)

co(function* () {
  const file = yield storage.get('index.js')
  console.log(file.toString())
})
