/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { GoogleCloudStorage } from './GoogleCloudStorage'
import { LocalFileSystem } from './LocalFileSystem'
import { S3Storage } from './S3Storage'

export default {
  gcs: GoogleCloudStorage,
  local: LocalFileSystem,
  s3: S3Storage,
}
