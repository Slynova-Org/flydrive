/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import S3 from "aws-sdk/clients/s3";
import { AmazonWebServicesS3Storage, AWSS3Config } from '../../src/Storage/AmazonWebServicesS3Storage';
import { runGenericStorageSpec } from "../stubs/storage.generic";

const config: AWSS3Config = {
	key: process.env.S3_KEY || '',
	secret: process.env.S3_SECRET || '',
	bucket: process.env.S3_BUCKET || '',
	region: process.env.S3_REGION || '',
	// endpoint: process.env.S3_ENDPOINT,
};
const driver = new S3({
	accessKeyId: config.key,
	secretAccessKey: config.secret,
	...config,
});
const storage = new AmazonWebServicesS3Storage(driver, config.bucket);

describe('Amazon Web Services S3 Storage', () => {
	describe('.getUrl', () => {
		test('get public url to a file', () => {
			const url = storage.getUrl('dummy-file1.txt');
			expect(url).toStrictEqual(`https://${driver.endpoint.host}/${config.bucket}/dummy-file1.txt`);
		});

		test('get public url to a file when region is not defined', () => {
			const s3Driver = AmazonWebServicesS3Storage.fromConfig({ ...config, region: undefined });
			const url = s3Driver.getUrl('dummy-file1.txt');
			expect(url).toStrictEqual(`https://${config.bucket}.s3.amazonaws.com/dummy-file1.txt`);
		});
	});
});

runGenericStorageSpec({
	storage,
	name: 'Amazon Web Services S3 Storage',
});
