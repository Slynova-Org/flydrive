/**
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

module.exports = {
  local: require('./LocalFileSystem'),
  s3: require('./AwsS3')
}
