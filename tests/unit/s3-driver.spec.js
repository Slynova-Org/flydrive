/**
 * node-flydrive
 *
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

const { s3: S3Driver } = require('../../src/Drivers')

require('dotenv').load()
const config = {
  key: process.env.SES_KEY,
  secret: process.env.SES_SECRET,
  bucket: process.env.SES_BUCKET,
  region: process.env.SES_REGION
}
console.log(config)

test.group('S3 Driver', () => {
  test('return false when file doesn\'t exists', async (assert) => {
    const s3Driver = new S3Driver(config)
    const exists = await s3Driver.exists('some-file.jpg')
    assert.isFalse(exists)
  }).timeout(0)

  test('create a new file', async (assert) => {
    const s3Driver = new S3Driver(config)

    const url = await s3Driver.put('some-file.txt', 'This is the text file')
    const exists = await s3Driver.exists('some-file.txt')

    assert.equal(url, `https://${process.env.SES_BUCKET}.s3-us-west-2.amazonaws.com/some-file.txt`)
    assert.isTrue(exists)
  }).timeout(0)

  test('create a new file from buffer', async (assert) => {
    const s3Driver = new S3Driver(config)

    const url = await s3Driver.put('buffer-file.txt', Buffer.from('This is the text file', 'utf-8'))
    const exists = await s3Driver.exists('buffer-file.txt')

    assert.isTrue(exists)
    assert.equal(url, `https://${process.env.SES_BUCKET}.s3-us-west-2.amazonaws.com/buffer-file.txt`)
  }).timeout(0)

  test('create a new file from stream', async (assert) => {
    const dummyFile = path.join(__dirname, 'stream-file.txt')
    await fs.outputFile(dummyFile, 'Some dummy content')

    const s3Driver = new S3Driver(config)
    const readStream = fs.createReadStream(dummyFile)

    const url = await s3Driver.put('stream-file.txt', readStream)
    const exists = await s3Driver.exists('stream-file.txt')
    await fs.remove(dummyFile)

    assert.isTrue(readStream.closed)
    assert.equal(url, `https://${process.env.SES_BUCKET}.s3-us-west-2.amazonaws.com/stream-file.txt`)
    assert.isTrue(exists)
  }).timeout(0)

  test('throw exception when unable to put file', async (assert) => {
    assert.plan(1)
    try {
      const s3Driver = new S3Driver(Object.assign({}, config, { secret: '2020' }))
      await s3Driver.put('dummy-file.txt', 'Hello')
    } catch (error) {
      assert.equal(error.message, 'The request signature we calculated does not match the signature you provided. Check your key and signing method.')
    }
  }).timeout(0)

  test('delete existing file', async (assert) => {
    const s3Driver = new S3Driver(config)
    await s3Driver.put('dummy-file.txt', 'Hello')
    await s3Driver.delete('dummy-file.txt')
  }).timeout(0)

  test('get file contents', async (assert) => {
    const s3Driver = new S3Driver(config)
    await s3Driver.put('dummy-file.txt', 'Hello')
    const content = await s3Driver.get('dummy-file.txt')
    assert.equal(content, 'Hello')
  }).timeout(0)

  test('get file as stream', async (assert) => {
    const s3Driver = new S3Driver(config)
    await s3Driver.put('dummy-file.txt', 'Hello')
    const stream = s3Driver.getStream('dummy-file.txt')
    const content = await readStream(stream)
    assert.equal(content, 'Hello')
  }).timeout(0)

  test('get public url to a file', (assert) => {
    const s3Driver = new S3Driver(config)
    const url = s3Driver.getUrl('dummy-file1.txt')
    assert.equal(url, `https://${process.env.SES_BUCKET}.s3.amazonaws.com/dummy-file1.txt`)
  })

  test('get public url to a file when region is defined', (assert) => {
    const s3Driver = new S3Driver(Object.assign({}, config, { region: 'us-west-2' }))
    const url = s3Driver.getUrl('dummy-file1.txt')
    assert.equal(url, `https://s3-us-west-2.amazonaws.com/${process.env.SES_BUCKET}/dummy-file1.txt`)
  })

  test('throw exception when getting stream for non-existing file', async (assert) => {
    assert.plan(1)
    const s3Driver = new S3Driver(config)
    const stream = s3Driver.getStream('non-existing.txt')

    try {
      await readStream(stream)
    } catch (error) {
      assert.equal(error.message, 'The specified key does not exist.')
    }
  }).timeout(10 * 1000)

  test('copy file from one location to other', async (assert) => {
    const s3Driver = new S3Driver(config)
    await s3Driver.put('dummy-file1.txt', 'Hello')
    const url = await s3Driver.copy('dummy-file1.txt', 'dummy-file2.txt')
    assert.equal(url, `https://${process.env.SES_BUCKET}.s3.amazonaws.com/dummy-file2.txt`)
  }).timeout(10 * 1000)

  test('move file from one location to other', async (assert) => {
    const s3Driver = new S3Driver(config)
    await s3Driver.put('dummy-file1.txt', 'Hello')
    const url = await s3Driver.move('dummy-file1.txt', 'dummy-file2.txt')
    const exists = await s3Driver.exists('dummy-file1.txt')

    assert.equal(url, `https://${process.env.SES_BUCKET}.s3.amazonaws.com/dummy-file2.txt`)
    assert.isFalse(exists)
  }).timeout(10 * 1000)

  test('get signed url to an existing file', async (assert) => {
    const s3Driver = new S3Driver(config)
    const url = await s3Driver.getSignedUrl('dummy-file1.txt')
    assert.isDefined(url)
  }).timeout(10 * 1000)
})
