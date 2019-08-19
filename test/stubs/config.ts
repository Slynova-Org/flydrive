/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

export default {
	/*
   |--------------------------------------------------------------------------
   | Default Filesystem Disk
   |--------------------------------------------------------------------------
   |
   |
   |
   */
	default: 'local',

	/*
   |--------------------------------------------------------------------------
   | Filesystem Disks
   |--------------------------------------------------------------------------
   |
   | Supported: "local", "s3"
   |
   */
	disks: {
		local: {
			driver: 'local',
			root: process.cwd(),
		},

		s3: {
			driver: 's3',
			key: 'AWS_S3_KEY',
			secret: 'AWS_S3_SECRET',
			region: 'AWS_S3_REGION',
			bucket: 'AWS_S3_BUCKET',
		},

		spaces: {
			driver: 's3',
			key: 'SPACES_KEY',
			secret: 'SPACES_SECRET',
			endpoint: 'SPACES_ENDPOINT',
			bucket: 'SPACES_BUCKET',
			region: 'SPACES_REGION',
		},

		gcs: {
			driver: 'gcs',
			keyFilename: 'GCS_KEY',
			bucket: 'GCS_BUCKET',
		},
	},
};
