/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const test = require('japa')
const fs = require('fs-extra')
const path = require('path')

const Storage = require('../../src/Storage')
const LocalFileSystem = require('../../src/Drivers/LocalFileSystem')

function fullPath (relativePath) {
  return path.join(process.cwd(), `./tests/unit/storage/${relativePath}`)
}

test.group('Storage', (group) => {
  group.before(async () => {
    this.storage = new Storage(new LocalFileSystem({ root: path.join(__dirname, '../../') }))
    await fs.ensureDir(fullPath('.'))
  })

  group.afterEach(async () => {
    await fs.emptyDir(fullPath('.'))
  })

  test('proxy driver methods', async (assert) => {
    await fs.outputFile(fullPath('i_exist'), '')
    const exists = await this.storage.exists('./tests/unit/storage/i_exist')
    assert.isTrue(exists)
  })

  test('access own properties', async (assert) => {
    assert.instanceOf(this.storage.driver, LocalFileSystem)
  })
})
