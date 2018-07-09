const test = require('japa')

const { ftp: FTPDriver } = require('../../src/Drivers')

require('dotenv').load()

const config = {
  host: process.env.FTP_HOST,
  port: process.env.FTP_PORT,
  user: process.env.FTP_USER,
  pass: process.env.FTP_PASS,
}

test.group('FTP Driver', (group) => {

  const ftpDriver = new FTPDriver(config)

  test('return false when file doesn\'t exists', async (assert) => {
    const exists = await ftpDriver.exists('some-file.jpg')
    assert.isFalse(exists)
  }).timeout(5000)

  test('return true when file exists', async (assert) => {
    await ftpDriver.put('some-file.txt', 'Hello')
    const exists = await ftpDriver.exists('some-file.txt')
    assert.isTrue(exists)
  }).timeout(5000)

  test('get and put file content', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    const content = await ftpDriver.get('dummy-file.txt')
    assert.equal(content, 'Hello')
  }).timeout(5000)

  test('append file content', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    await ftpDriver.append('dummy-file.txt', ', World!')
    const content = await ftpDriver.get('dummy-file.txt')
    assert.equal(content, 'Hello, World!')
  }).timeout(5000)

  test('prepend file content', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'World!')
    await ftpDriver.prepend('dummy-file.txt', 'Hello, ')
    const content = await ftpDriver.get('dummy-file.txt')
    assert.equal(content, 'Hello, World!')
  }).timeout(5000)

  test('delete file', async () => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    await ftpDriver.delete('dummy-file.txt')
  }).timeout(5000)

  test('copy file', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    const firstContent = await ftpDriver.get('dummy-file.txt')
    await ftpDriver.copy('dummy-file.txt', 'dummy-file2.txt')
    const secondContent = await ftpDriver.get('dummy-file2.txt')
    assert.equal(firstContent, secondContent)
  }).timeout(5000)

  test('move file', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    await ftpDriver.move('dummy-file.txt', 'dummy-file2.txt')
    const content = await ftpDriver.get('dummy-file2.txt')
    assert.equal(content, 'Hello')
  }).timeout(5000)
})
