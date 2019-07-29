import { Readable } from 'stream'

import test from 'japa'
import uuid from 'uuid/v4'
import { Storage } from '@google-cloud/storage'

import { GoogleCloudStorage } from '../../src/Drivers/GoogleCloudStorage'

function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = []

    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(chunks.join('')))
  })
}

const testBucket = 'flydrive-test'
const storage = new GoogleCloudStorage({
  ...(process.env.GCS_KEYFILNAME && { keyFilename: process.env.GCS_KEYFILNAME }),
  bucket: testBucket
})

// used to isolate tests in case of failures or other sessions running at the same time
let folder
let testFile
let otherFile

const testString = 'test-data'

test.group('GCS Driver', group => {
  group.beforeEach(async () => {
    folder = uuid()
    testFile = `${folder}/test.txt`
    otherFile = `${folder}/sub/dir/other.txt`
    await storage.put(testFile, testString)
  })
  group.afterEach(async () => {
    try {
      await storage.delete(testFile)
    } catch (e) {}
    try {
      await storage.delete(otherFile)
    } catch (e) {}
  })

  test('change of bucket', async assert => {
    assert.plan(1)
    const newStorage = storage.bucket('other-bucket')
    try {
      await newStorage.put(testFile, testString)
    } catch (error) {
      assert.match(error, /does not have storage\.objects\.create access to other-bucket\/[^/]+\/test/)
    }
  })

  test('copy a file', async assert => {
    await storage.copy(testFile, otherFile)

    const content = await storage.get(otherFile, 'utf8')
    assert.strictEqual(content, testString)

    const exists = await storage.exists(testFile)
    assert.isTrue(exists)
  })

  test('delete a file', async assert => {
    await storage.delete(testFile)
    assert.isFalse(await storage.exists(testFile))
  })

  test('get driver instance', assert => {
    const driver = storage.driver()
    assert.instanceOf(driver, Storage)
  })

  test('get file content as Buffer', async assert => {
    const data = await storage.get(testFile)
    assert.instanceOf(data, Buffer)
    assert.strictEqual(data.toString(), testString)
  })

  test('get file content as a string', async assert => {
    const data = await storage.get(testFile, 'utf8')
    assert.strictEqual(data, testString)
  })

  test('get a signed URL', async assert => {
    const signedUrl = await storage.getSignedUrl(testFile)
    assert.isTrue(signedUrl.startsWith(`https://storage.googleapis.com/${testBucket}/${folder}`))
  })

  test('get the size of a file', async assert => {
    const size = await storage.getSize(testFile)
    assert.strictEqual(size, testString.length)
  })

  test('get a readable stream', async assert => {
    const stream = await storage.getStream(testFile)
    const result = await streamToString(stream)
    assert.strictEqual(result, testString)
  })

  test('get a public URL', assert => {
    const url = storage.getUrl(testFile)
    assert.strictEqual(url, `https://storage.cloud.google.com/${testBucket}/${testFile}`)
  })

  test('move a file', async assert => {
    await storage.move(testFile, otherFile)

    const content = await storage.get(otherFile, 'utf8')
    assert.strictEqual(content, testString)

    const exists = await storage.exists(testFile)
    assert.isFalse(exists)
  })

  test('put a file from a string', async assert => {
    const str = 'this-is-a-test'

    await storage.put(testFile, str)
    const content = await storage.get(testFile, 'utf8')
    assert.strictEqual(content, str)
  })

  test('put a file from a Buffer', async assert => {
    const str = 'this-is-a-test'
    const buffer = Buffer.from(str)

    await storage.put(testFile, buffer)
    const content = await storage.get(testFile, 'utf8')
    assert.strictEqual(content, str)
  })

  test('put a file from a stream', async assert => {
    const stream = storage.getStream(testFile)

    await storage.put(otherFile, stream)
    const content = await storage.get(otherFile, 'utf8')
    assert.strictEqual(content, testString)
  })
})