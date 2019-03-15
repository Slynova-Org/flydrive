/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import * as test from 'japa'
import * as path from 'path'
import * as fs from 'fs-extra'
import { Readable } from 'stream'

import * as CE from '../../src/Exceptions'
import { LocalFileSystem } from '../../src/Drivers'

let storage: LocalFileSystem

function isWindowsDefenderError(error: { code: string }): boolean {
  return error.code === 'EPERM'
}

function fullPath(relativePath: string): string {
  return path.join(process.cwd(), `./tests/unit/storage/${relativePath}`)
}

function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = []

    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('close', () => resolve(chunks.join('\n')))
  })
}

test.group('Local Driver', group => {
  group.before(async () => {
    storage = new LocalFileSystem({ root: path.join(__dirname, '../../') })
    await fs.ensureDir(fullPath('.'))
  })

  group.afterEach(async () => {
    await fs.emptyDir(fullPath('.'))
  })

  test('find if a file exist', async assert => {
    await fs.outputFile(fullPath('i_exist'), '')
    const exists = await storage.exists('./test/unit/storage/i_exist')
    assert.isTrue(exists)
  })

  test(`find if a file doesn't exist`, async assert => {
    const exists = await storage.exists('./test/unit/storage/i_dont_exists')
    assert.isFalse(exists)
  })

  test('find if a folder exist', async assert => {
    const exists = await storage.exists('./test/unit/storage')
    assert.isTrue(exists)
  })

  test('create a file', async assert => {
    await storage.put('./test/unit/storage/im_new', 'im_new')
    const contents = await storage.get('./test/unit/storage/im_new')
    assert.equal(contents, 'im_new')
  })

  test('create a file in a deep directory', async assert => {
    try {
      await storage.put('./test/unit/storage/deep/directory/im_new', 'im_new')
      const contents = await storage.get('./test/unit/storage/deep/directory/im_new')
      assert.equal(contents, 'im_new')
    } catch (e) {
      console.log(e)
    }
  })

  test('delete a file', async assert => {
    await fs.outputFile(fullPath('i_will_be_deleted'), '')

    try {
      await storage.delete('./test/unit/storage/i_will_be_deleted')
      const exists = await storage.exists('./test/unit/storage/i_will_be_deleted')
      assert.isFalse(exists)
    } catch (error) {
      if (!isWindowsDefenderError(error)) {
        throw error
      }
    }
  })

  test(`delete a file that doesn't exist`, async assert => {
    try {
      await storage.delete('./test/unit/storage/i_dont_exist')
      const exists = await storage.exists('./test/unit/storage/i_dont_exist')
      assert.isFalse(exists)
    } catch (error) {
      if (!isWindowsDefenderError(error)) {
        throw error
      }
    }
  })

  test('move a file', async assert => {
    await fs.outputFile(fullPath('i_will_be_renamed'), '')

    await storage.move('./test/unit/storage/i_will_be_renamed', './test/unit/storage/im_renamed')
    assert.isTrue(await storage.exists('./test/unit/storage/im_renamed'))
    assert.isFalse(await storage.exists('./test/unit/storage/i_will_be_renamed'))
  })

  test('copy a file', async assert => {
    await fs.outputFile(fullPath('i_will_be_copied'), '')

    await storage.copy('./test/unit/storage/i_will_be_copied', './test/unit/storage/im_copied')
    assert.isTrue(await storage.exists('./test/unit/storage/im_copied'))
    assert.isTrue(await storage.exists('./test/unit/storage/i_will_be_copied'))
  })

  test('prepend to a file', async assert => {
    await fs.outputFile(fullPath('i_have_content'), 'world')

    await storage.prepend('./test/unit/storage/i_have_content', 'hello ')
    const content = await storage.get('./test/unit/storage/i_have_content')
    assert.equal(content, 'hello world')
  })

  test('append to a file', async assert => {
    await fs.outputFile(fullPath('i_have_content'), 'hello')

    await storage.append('./test/unit/storage/i_have_content', ' universe')
    const content = await storage.get('./test/unit/storage/i_have_content')
    assert.equal(content, 'hello universe')
  })

  test('prepend to new file', async assert => {
    await storage.prepend('./test/unit/storage/i_have_content', 'hello')
    const content = await storage.get('./test/unit/storage/i_have_content', 'utf-8')
    assert.equal(content, 'hello')
  })

  test('throw file not found exception when unable to find file', async assert => {
    assert.plan(1)
    try {
      await storage.get('./test/unit/storage/non_existing', 'utf-8')
    } catch (error) {
      assert.instanceOf(error, CE.FileNotFound)
    }
  })

  test('do not prepend root path when path itself is absolute', async assert => {
    const dummyFile = path.join(__dirname, './dummy_file')

    await storage.put(dummyFile, 'dummy content')
    const content = await storage.get(dummyFile, 'utf-8')

    assert.equal(content, 'dummy content')
    await storage.delete(dummyFile)
  })

  test('create file from stream', async assert => {
    await storage.put('./test/unit/storage/foo', 'Foo related content')
    const readStream = fs.createReadStream(path.join(__dirname, './storage/foo'))
    await storage.put('./test/unit/storage/bar', readStream)
    assert.isTrue(readStream.close)

    const barContents = await storage.get('./test/unit/storage/bar')
    assert.equal(barContents, 'Foo related content')
  })

  test('append to exisiting file', async assert => {
    await storage.put('./test/unit/storage/object', ' World')
    await storage.put('./test/unit/storage/greeting', 'Hello')

    const readStream = fs.createReadStream(path.join(__dirname, './storage/object'))

    await storage.append('./test/unit/storage/greeting', readStream)
    assert.isTrue(readStream.close)

    const barContents = await storage.get('./test/unit/storage/greeting')
    assert.equal(barContents, 'Hello World')
  })

  test('throw exception when unable to find file', async assert => {
    assert.plan(1)

    const readStream = storage.getStream('./test/unit/storage/foo')
    try {
      await streamToString(readStream)
    } catch ({ code }) {
      assert.equal(code, 'ENOENT')
    }
  })

  test('get stream of a given file', async assert => {
    await storage.put('./test/unit/storage/foo', 'Foo')
    const readStream = storage.getStream('./test/unit/storage/foo')
    const content = await streamToString(readStream)
    assert.equal(content, 'Foo')
  })
})
