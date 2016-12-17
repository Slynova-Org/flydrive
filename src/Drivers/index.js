'use strict'

module.exports = {

  local: require('./LocalFileSystem'),
  s3: require('./AwsS3')

}
