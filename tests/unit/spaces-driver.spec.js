/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

const test = require('japa')
const path = require('path')
const fs = require('fs-extra')

function readStreamPromised (stream) {
  return new Promise((resolve, reject) => {
    let body = ''

    /* eslint-disable no-return-assign */
    stream
      .on('data', chunk => (body += chunk))
      .on('end', () => resolve(body))
      .on('error', reject)
  })
}

const { spaces: S3Driver } = require('../../src/Drivers')

require('dotenv').load()

const config = {
  key: process.env.S3_KEY,
  endpoint: process.env.S3_ENDPOINT,
  secret: process.env.S3_SECRET,
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION,
  // needed for docker
  s3ForcePathStyle: true,
  sslEnabled: false
}

test.group('Spaces Driver', (group) => {
  const s3Driver = new S3Driver(config)
  const fileURL = KEY => `http://${s3Driver.s3.endpoint.host}/${process.env.S3_BUCKET}/${KEY}`

  group.before(async () => {
    // Create test bucket
    await s3Driver.s3.createBucket({
      ACL: 'public-read',
      Bucket: process.env.S3_BUCKET,
      CreateBucketConfiguration: {
        LocationConstraint: process.env.S3_REGION
      }
    }, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
   })
  })

  test('return false when file doesn\'t exists', async (assert) => {
    const exists = await s3Driver.exists('some-file.jpg')
    assert.isFalse(exists)
  }).timeout(5000)

  test('create a new file', async (assert) => {

    const url = await s3Driver.put('some-file.txt', 'This is the text file')
    const exists = await s3Driver.exists('some-file.txt')

    assert.equal(url, fileURL('some-file.txt'))
    assert.isTrue(exists)
  }).timeout(5000)

  test('create a new file from buffer', async (assert) => {

    const url = await s3Driver.put('buffer-file.txt', Buffer.from('This is the text file', 'utf-8'))
    const exists = await s3Driver.exists('buffer-file.txt')

    assert.isTrue(exists)
    assert.equal(url, fileURL('buffer-file.txt'))
  }).timeout(5000)

  test('create a new file from stream', async (assert) => {
    const dummyFile = path.join(__dirname, 'stream-file.txt')
    await fs.outputFile(dummyFile, 'Some dummy content')

    const readStream = fs.createReadStream(dummyFile)

    const url = await s3Driver.put('stream-file.txt', readStream)
    const exists = await s3Driver.exists('stream-file.txt')
    await fs.remove(dummyFile)

    assert.isTrue(readStream.closed)
    assert.equal(url, fileURL('stream-file.txt'))
    assert.isTrue(exists)
  }).timeout(5000)

  test('throw exception when unable to put file', async (assert) => {
    assert.plan(2)
    try {
      // cant use a wrong "secret" because localstack ignores credentials
      const _s3Driver = new S3Driver({...config, bucket: 'wrong_bucket' })
      await _s3Driver.put('dummy-file.txt', 'Hello')
    } catch (error) {
      assert.equal(error.code, 'NoSuchBucket')
      assert.equal(error.message, 'The specified bucket does not exist')
    }
  }).timeout(5000)

  test('delete existing file', async () => {
    await s3Driver.put('dummy-file.txt', 'Hello')
    await s3Driver.delete('dummy-file.txt')
  }).timeout(5000)

  test('get file contents', async (assert) => {
    await s3Driver.put('dummy-file.txt', 'Hello')
    const content = await s3Driver.get('dummy-file.txt')
    assert.equal(content, 'Hello')
  }).timeout(5000)

  test('get file as stream', async (assert) => {
    await s3Driver.put('dummy-file.txt', 'Hello')
    const stream = s3Driver.getStream('dummy-file.txt')
    const content = await readStreamPromised(stream)
    assert.equal(content, 'Hello')
  }).timeout(5000)

  test('get public url to a file', (assert) => {
    const url = s3Driver.getUrl('dummy-file1.txt')
    assert.equal(url, fileURL('dummy-file1.txt'))
  })

  test('throw exception when getting stream for non-existing file', async (assert) => {
    assert.plan(1)
    const stream = s3Driver.getStream('non-existing.txt')

    try {
      await readStreamPromised(stream)
    } catch (error) {
      assert.equal(error.code, 'NoSuchKey')
    }
  }).timeout(5000)

  test('copy file from one location to other', async (assert) => {
    await s3Driver.put('dummy-file1.txt', 'Hello')
    const url = await s3Driver.copy('dummy-file1.txt', 'dummy-file2.txt')
    assert.equal(url, fileURL('dummy-file2.txt'))
  }).timeout(5000)

  test('move file from one location to other', async (assert) => {
    await s3Driver.put('dummy-file1.txt', 'Hello')
    const url = await s3Driver.move('dummy-file1.txt', 'dummy-file2.txt')
    const exists = await s3Driver.exists('dummy-file1.txt')

    assert.equal(url, fileURL('dummy-file2.txt'))
    assert.isFalse(exists)
  }).timeout(5000)

  test('get signed url to an existing file', async (assert) => {
    const url = await s3Driver.getSignedUrl('dummy-file1.txt')
    assert.isDefined(url)
  }).timeout(5000)
})
