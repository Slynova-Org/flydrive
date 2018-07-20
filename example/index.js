const fetch = require('node-fetch')
const uuid = require('uuid/v1')
const argv = require('minimist')(process.argv.slice(2))
const checkRequiredArguments = require('./check-required-arguments')

const StorageManager = require('@slynova/flydrive')

// This will throw errors if the program is not provided the correct arguments
checkRequiredArguments(argv)

const storage = new StorageManager({
  default: argv.disk,
  disks: {
    local: {
      driver: 'local',
      root: `${process.cwd()}/downloads`,
    },
    spaces: {
      driver: 's3',
      key: argv.key,
      secret: argv.secret,
      endpoint: argv.endpoint,
      bucket: argv.bucket,
    },
  },
})

const saveCat = async () => {
  // Remember to use HTTPS for secure cat transfer
  const catRequest = await fetch('https://thecatapi.com/api/images/get?type=jpg&size=small')
  const catJpegData = await catRequest.buffer()

  await storage.put(`cats/${uuid()}.jpg`, catJpegData)
}

saveCat()
