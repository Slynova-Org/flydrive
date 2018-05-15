/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const test = require('japa')
const fs = require('fs-extra')
const path = require('path')

const StorageManager = require('../../src/StorageManager')
const Storage = require('../../src/Storage')
const LocalFileSystem = require('../../src/Drivers/LocalFileSystem')

function fullPath (relativePath) {
  return path.join(process.cwd(), `./tests/unit/storage/${relativePath}`)
}

test.group('Storage Manager', (group) => {
  group.before(async () => {
    await fs.ensureDir(fullPath('.'))
  })

  group.afterEach(async () => {
    await fs.emptyDir(fullPath('.'))
  })

  test('throw exception when no disk name is defined', (assert) => {
    const storageManager = new StorageManager({})
    const fn = () => storageManager.disk()
    assert.throw(fn, 'E_INVALID_CONFIG: Make sure to define a default disk name inside config file')
  })

  test('throw exception when disk config is missing', (assert) => {
    const storageManager = new StorageManager({
      default: 'local',
    })
    const fn = () => storageManager.disk()
    assert.throw(fn, 'E_INVALID_CONFIG: Make sure to define config for local disk')
  })

  test('throw exception when disk config doesnt have driver', (assert) => {
    const storageManager = new StorageManager({
      default: 'local',
      disks: {
        local: {
          root: '',
        },
      },
    })
    const fn = () => storageManager.disk()
    assert.throw(fn, 'E_INVALID_CONFIG: Make sure to define driver for local disk')
  })

  test('throw exception when driver is invalid', (assert) => {
    const storageManager = new StorageManager({
      default: 'local',
      disks: {
        local: {
          root: '',
          driver: 'foo',
        },
      },
    })
    const fn = () => storageManager.disk()
    assert.throw(fn, 'Driver foo is not supported')
  })

  test('return storage instance for a given driver', (assert) => {
    const storageManager = new StorageManager({
      default: 'local',
      disks: {
        local: {
          root: '',
          driver: 'local',
        },
      },
    })
    const localDriver = storageManager.disk('local')
    assert.instanceOf(localDriver, Storage)
    assert.instanceOf(localDriver.driver, LocalFileSystem)
  })

  test('proxy storage methods for default driver', async (assert) => {
    const storageManager = new StorageManager({
      default: 'local',
      disks: {
        local: {
          root: path.join(__dirname, '../../'),
          driver: 'local',
        },
      },
    })

    await fs.outputFile(fullPath('i_exist'), '')
    const exists = await storageManager.exists('./tests/unit/storage/i_exist')
    assert.isTrue(exists)
  })

  test('extend and add new drivers', async (assert) => {
    const storageManager = new StorageManager({
      default: 'local',
      disks: {
        local: {
          driver: 'foo',
        },
      },
    })

    class FooDriver {}
    storageManager.extend('foo', FooDriver)

    assert.instanceOf(storageManager.disk('local').driver, FooDriver)
  })
})
