'use strict'

const fs = require('mz/fs')
const path = require('path')
const test = require('japa')
const rimraf = require('rimraf')
const config = require('../stubs/config')
const Storage = require('../../src/StorageManager')

let storage = null

function isWindowsDefenderError (error) {
  return error.code === 'EPERM'
}

function fullPath (relativePath) {
  return path.join(process.cwd(), `./tests/unit/storage/${relativePath}`)
}

test.group('Local Driver', group => {
  group.before(() => {
    storage = new Storage(config)
  })

  group.beforeEach(async () => {
    const filesToCreate = ['i_exist', 'i_will_be_deleted', 'i_will_be_renamed']

    // Cleaning storage folder
    rimraf.sync(fullPath('*'))

    // Populating storage folder
    filesToCreate.forEach(
      async file => fs.writeFile(fullPath(file), file)
    )
  })

  group.after(async () => {
    // Cleaning storage folder
    rimraf.sync(fullPath('*'))

    await fs.writeFile(fullPath('.gitkeep'), '')
  })

  test('it can know if a file exist', async (assert) => {
    assert.isTrue(
      await storage.disk('local').exists('./tests/unit/storage/i_exist')
    )
  })

  test('it can create a file', async (assert) => {
    await storage.disk('local').put('./tests/unit/storage/im_new', 'im_new')

    assert.equal(
      await storage.disk('local').get('./tests/unit/storage/im_new'), 'im_new'
    )
  })

  test('it can delete a file', async (assert) => {
    try {
      await storage.disk('local').delete('./tests/unit/storage/i_will_be_deleted')
      assert.isFalse(
        await storage.disk('local').exists('./tests/unit/storage/i_will_be_deleted')
      )
    } catch (error) {
      if (!isWindowsDefenderError(error)) {
        throw error
      }
    }
  })

  test('it can rename a file', async (assert) => {
    await storage.disk('local').move(
      './tests/unit/storage/i_will_be_renamed', './tests/unit/storage/im_renamed'
    )

    assert.isTrue(
      await storage.disk('local').exists('./tests/unit/storage/im_renamed')
    )

    assert.isFalse(
      await storage.disk('local').exists('./tests/unit/storage/i_will_be_renamed')
    )
  })
})
