'use strict'

const fs = require('fs-extra')
const path = require('path')
const test = require('japa')

const CE = require('../../src/Exceptions')
const LocalFileSystem = require('../../src/Drivers/LocalFileSystem')

function isWindowsDefenderError (error) {
  return error.code === 'EPERM'
}

function fullPath (relativePath) {
  return path.join(process.cwd(), `./tests/unit/storage/${relativePath}`)
}

function streamToString (stream) {
  return new Promise((resolve, reject) => {
    const chunk = []
    stream.on('data', (line) => (chunk.push(line)))
    stream.on('error', reject)
    stream.on('close', () => resolve(chunk.join('\n')))
  })
}

test.group('Local Driver', group => {
  group.before(async () => {
    this.storage = new LocalFileSystem({ root: path.join(__dirname, '../../') })
    await fs.ensureDir(fullPath('.'))
  })

  group.afterEach(async () => {
    await fs.emptyDir(fullPath('.'))
  })

  test('find if a file exist', async (assert) => {
    await fs.outputFile(fullPath('i_exist'), '')
    const exists = await this.storage.exists('./tests/unit/storage/i_exist')
    assert.isTrue(exists)
  })

  test('create a file', async (assert) => {
    await this.storage.put('./tests/unit/storage/im_new', 'im_new')
    const contents = await this.storage.get('./tests/unit/storage/im_new')
    assert.equal(contents, 'im_new')
  })

  test('delete a file', async (assert) => {
    await fs.outputFile(fullPath('i_will_be_deleted'), '')

    try {
      await this.storage.delete('./tests/unit/storage/i_will_be_deleted')
      const exists = await this.storage.exists('./tests/unit/storage/i_will_be_deleted')
      assert.isFalse(exists)
    } catch (error) {
      if (!isWindowsDefenderError(error)) {
        throw error
      }
    }
  })

  test('move a file', async (assert) => {
    await fs.outputFile(fullPath('i_will_be_renamed'), '')

    await this.storage.move('./tests/unit/storage/i_will_be_renamed', './tests/unit/storage/im_renamed')
    assert.isTrue(await this.storage.exists('./tests/unit/storage/im_renamed'))
    assert.isFalse(await this.storage.exists('./tests/unit/storage/i_will_be_renamed'))
  })

  test('copy a file', async (assert) => {
    await fs.outputFile(fullPath('i_will_be_copied'), '')

    await this.storage.copy('./tests/unit/storage/i_will_be_copied', './tests/unit/storage/im_copied')
    assert.isTrue(await this.storage.exists('./tests/unit/storage/im_copied'))
    assert.isTrue(await this.storage.exists('./tests/unit/storage/i_will_be_copied'))
  })

  test('prepend to a file', async (assert) => {
    await fs.outputFile(fullPath('i_have_content'), 'world')

    await this.storage.prepend('./tests/unit/storage/i_have_content', 'hello ')
    const content = await this.storage.get('./tests/unit/storage/i_have_content')
    assert.equal(content, 'hello world')
  })

  test('append to a file', async (assert) => {
    await fs.outputFile(fullPath('i_have_content'), 'hello')

    await this.storage.append('./tests/unit/storage/i_have_content', ' universe')
    const content = await this.storage.get('./tests/unit/storage/i_have_content')
    assert.equal(content, 'hello universe')
  })

  test('prepend to new file', async (assert) => {
    await this.storage.prepend('./tests/unit/storage/i_have_content', 'hello')
    const content = await this.storage.get('./tests/unit/storage/i_have_content', 'utf-8')
    assert.equal(content, 'hello')
  })

  test('throw file not found exception when unable to find file', async (assert) => {
    assert.plan(1)
    try {
      await this.storage.get('./tests/unit/storage/non_existing', 'utf-8')
    } catch (error) {
      assert.instanceOf(error, CE.FileNotFound)
    }
  })

  test('do not prepend root path when path itself is absolute', async (assert) => {
    const dummyFile = path.join(__dirname, './dummy_file')

    await this.storage.put(dummyFile, 'dummy content')
    const content = await this.storage.get(dummyFile, 'utf-8')

    assert.equal(content, 'dummy content')
    await this.storage.delete(dummyFile)
  })

  test('create file from stream', async (assert) => {
    await this.storage.put('./tests/unit/storage/foo', 'Foo related content')
    const readStream = fs.createReadStream(path.join(__dirname, './storage/foo'))
    await this.storage.put('./tests/unit/storage/bar', readStream)
    assert.isTrue(readStream.closed)

    const barContents = await this.storage.get('./tests/unit/storage/bar')
    assert.equal(barContents, 'Foo related content')
  })

  test('append to exisiting file', async (assert) => {
    await this.storage.put('./tests/unit/storage/object', ' World')
    await this.storage.put('./tests/unit/storage/greeting', 'Hello')

    const readStream = fs.createReadStream(path.join(__dirname, './storage/object'))

    await this.storage.append('./tests/unit/storage/greeting', readStream)
    assert.isTrue(readStream.closed)

    const barContents = await this.storage.get('./tests/unit/storage/greeting')
    assert.equal(barContents, 'Hello World')
  })

  test('throw exception when unable to find file', async (assert) => {
    assert.plan(1)

    const readStream = this.storage.getStream('./tests/unit/storage/foo')
    try {
      await streamToString(readStream)
    } catch ({ code }) {
      assert.equal(code, 'ENOENT')
    }
  })

  test('get stream of a given file', async (assert) => {
    await this.storage.put('./tests/unit/storage/foo', 'Foo')
    const readStream = this.storage.getStream('./tests/unit/storage/foo')
    const content = await streamToString(readStream)
    assert.equal(content, 'Foo')
  })
})
