'use strict'

let storage = null
const test = require('japa')
const config = require('../stubs/config')
const Storage = require('../../src/StorageManager')

test.group('Local Driver', group => {

  group.before(() => {
    storage = new Storage(config)
  })

  test('it can know if a file exist', (assert) => {
    return new Promise((resolve, reject) => {
      storage.disk('local').exists('./storage/i_exist')
    })
    console.log(file)

    assert.isTrue(file)
  })

})
