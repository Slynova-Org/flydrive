/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { AmazonWebServicesS3Storage } from './AmazonWebServicesS3Storage';
import { GoogleCloudStorage } from './GoogleCloudStorage';
import { LocalFileSystemStorage } from './LocalFileSystemStorage';

export default {
	s3: AmazonWebServicesS3Storage,
	gcs: GoogleCloudStorage,
	local: LocalFileSystemStorage,
};
