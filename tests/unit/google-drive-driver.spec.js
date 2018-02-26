/**
 * node-flydrive
 * Author : Doumbia Mahamadou (doumbiamahamadou.ensate@gmail.com)
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const test = require('japa')
const path = require('path')
const fs = require('fs-extra')

const readStream = function (stream) {
  return new Promise((resolve, reject) => {
    let body = ''

    stream
      .on('data', (chunk) => (body += chunk))
      .on('end', () => resolve(body))
      .on('error', reject)
  })
}

const { drive: GoogleDriver } = require('../../src/Drivers')
require('dotenv').load()
const config = {
  clientId: process.env.DRIVE_CLIENT_ID,
  clientSecret: process.env.DRIVE_CLIENT_SECRET,
  redirectUrl: process.env.DRIVE_REDIRECT_URL
}
const token = {
  'access_token': process.env.GD_ACCESS_TOKEN,
  'refresh_token': process.env.GD_REFRESH_TOKEN
}

test.group('Googel Drive Driver', () => {
  test('return null when file doesn\'t exists', async (assert) => {
    const driveDriver = new GoogleDriver(config)
    const exists = await driveDriver.with(token).exists('some-file.jpg')
    assert.isNull(exists)
  }).timeout(0)

  test('create a new file', async (assert) => {
    const driveDriver = new GoogleDriver(config)

    const file = await driveDriver.with(token).put('some-file.txt', {
      media: {
        body: 'This is the text file'
      },
      metadata: {
        mimeType: 'text/plain',
        description: 'a test simple txt file'
      }
    })
    assert.isNotNull(file.id)
    const exists = await driveDriver.with(token).exists('', {fileId: file.id})
    assert.equal(file.name, `some-file.txt`)
    assert.isNotNull(exists)
  }).timeout(0)

  test('create a new file from buffer', async (assert) => {
    const driveDriver = new GoogleDriver(config)
    const file = await driveDriver.with(token).put('buffer-file.txt', {
      media: {
        body: Buffer.from('This is the text file', 'utf-8')
      },
      metadata: {
        mimeType: 'text/plain',
        description: 'a test simple txt file'
      }
    })
    const exists = await driveDriver.with(token).exists('buffer-file.txt')
    assert.isNotNull(file)
    assert.equal(file.name, `buffer-file.txt`)
    assert.isNotNull(exists)
  }).timeout(0)

  test('create a new file from stream', async (assert) => {
    const dummyFile = path.join(__dirname, 'stream-file.txt')
    await fs.outputFile(dummyFile, 'Some dummy content')

    const driveDriver = new GoogleDriver(config)
    const readStream = fs.createReadStream(dummyFile)

    const file = await driveDriver.with(token).put('stream-file.txt', {
      media: {
        body: readStream
      },
      metadata: {
        mimeType: 'text/plain',
        description: 'a test simple txt file'
      }
    })
    const exists = await driveDriver.with(token).exists('stream-file.txt')
    await fs.remove(dummyFile)
    assert.isNotNull(file.id)
    assert.equal(file.name, `stream-file.txt`)
    assert.isNotNull(exists)
  }).timeout(0)

  test('delete existing file', async (assert) => {
    const driveDriver = new GoogleDriver(config)
    await driveDriver.with(token).put('dummy-file.txt', {
      media: {
        body: 'Hello'
      },
      metadata: {
        mimeType: 'text/plain',
        description: 'a test simple txt file'
      }
    })
    const ret = await driveDriver.with(token).delete('dummy-file.txt')
    assert.isTrue(ret)
  }).timeout(0)

  test('get file contents', async (assert) => {
    const driveDriver = new GoogleDriver(config)
    await driveDriver.with(token).put('dummy-file.txt', {
      media: {
        body: 'Hello'
      },
      metadata: {
        mimeType: 'text/plain',
        description: 'a test simple txt file'
      }
    })
    const content = await driveDriver.with(token).get('dummy-file.txt', {alt: 'media', encoding: 'utf-8'})
    assert.equal(content, 'Hello')
  }).timeout(0)

  test('get file as stream', async (assert) => {
    const driveDriver = new GoogleDriver(config)
    const file = await driveDriver.with(token).put('dummy-file.txt', {
      media: {
        body: 'Hello'
      },
      metadata: {
        mimeType: 'text/plain',
        description: 'a test simple txt file'
      }
    })
    assert.isNotNull(file)
    const stream = await driveDriver.with(token).getStream('', {fileId: file.id})
    const content = await readStream(stream)
    assert.equal(content, 'Hello')
  }).timeout(0)
  test('throw exception when getting stream for non-existing file', async (assert) => {
    assert.plan(1)
    const driveDriver = new GoogleDriver(config)
    const stream = await driveDriver.with(token).getStream('non-existing.txt')
    assert.isNull(stream)
  }).timeout(10 * 1000)

  test('copy file from one location to other', async (assert) => {
    const driveDriver = new GoogleDriver(config)
    await driveDriver.with(token).put('dummy-file1.txt', {
      media: {
        body: 'Hello'
      },
      metadata: {
        mimeType: 'text/plain',
        description: 'a test simple txt file'
      }
    })
    const file = await driveDriver.with(token).copy('dummy-file1.txt', 'dummy-file2.txt')
    assert.isNotNull(file)
    assert.equal(file.name, `dummy-file2.txt`)
  }).timeout(10 * 1000)

  test('move file from one location to other', async (assert) => {
    const driveDriver = new GoogleDriver(config)
    await driveDriver.with(token).put('dummy-file3.txt', {
      media: {
        body: 'Hello'
      },
      metadata: {
        mimeType: 'text/plain',
        description: 'a test simple txt file'
      }
    })
    const file = await driveDriver.with(token).move('dummy-file3.txt', 'dummy-file4.txt')
    const exists = await driveDriver.with(token).exists('dummy-file3.txt')

    assert.equal(file.name, `dummy-file4.txt`)
    assert.isNull(exists)
  }).timeout(10 * 1000)
})
