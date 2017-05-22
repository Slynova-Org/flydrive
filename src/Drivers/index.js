module.exports = {}

module.exports.local = require('./LocalFileSystem')

try {
  require.resolve('aws-sdk')
  module.exports.s3 = require('./AwsS3')
} catch (e) {}
