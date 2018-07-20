const test = require('japa')

const { ftp: FTPDriver } = require('../../src/Drivers')

const FtpSrv = require('ftp-srv');
const ftpServer = new FtpSrv("ftp://127.0.0.1:9000");
ftpServer.on('login', (data, resolve, reject) => { resolve() });
ftpServer.on('client-error', ({connection, context, error}) => { console.log("Error!", error) });

const ftpServerListen = ftpServer.listen()

require('dotenv').load()

const config = {
  host: process.env.FTP_HOST,
  port: process.env.FTP_PORT,
  user: process.env.FTP_USER,
  pass: process.env.FTP_PASS,
}
const ftpDriver = new FTPDriver(config)

test.group('FTP Driver', () => {
  test('return true when file exists', async (assert) => {
    await ftpDriver.put('some-file.txt', 'Hello')
    const exists = await ftpDriver.exists('some-file.txt')
    assert.isTrue(exists)
  }).timeout(20000)

  test('get and put file content', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    console.log("PUT FTP file")
    const content = await ftpDriver.get('dummy-file.txt')
    console.log("Got contents")
    console.log(content)
    assert.equal(content, 'Hello')
    console.log("Asserted Equals")
  }).timeout(20000)

  test('append file content', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    await ftpDriver.append('dummy-file.txt', ', World!')
    const content = await ftpDriver.get('dummy-file.txt')
    assert.equal(content, 'Hello, World!')
  }).timeout(20000)

  test('prepend file content', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'World!')
    await ftpDriver.prepend('dummy-file.txt', 'Hello, ')
    const content = await ftpDriver.get('dummy-file.txt')
    assert.equal(content, 'Hello, World!')
  }).timeout(20000)

  test('delete file', async () => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    await ftpDriver.delete('dummy-file.txt')
  }).timeout(20000)

  test('move file', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    await ftpDriver.move('dummy-file.txt', 'dummy-file2.txt')
    const content = await ftpDriver.get('dummy-file2.txt')
    assert.equal(content, 'Hello')
  }).timeout(20000)

  test('copy file', async (assert) => {
    await ftpDriver.put('dummy-file.txt', 'Hello')
    const firstContent = await ftpDriver.get('dummy-file.txt')
    await ftpDriver.copy('dummy-file.txt', 'dummy-file2.txt')
    const secondContent = await ftpDriver.get('dummy-file2.txt')

    assert.equal(firstContent, secondContent)
  }).timeout(20000)
})
