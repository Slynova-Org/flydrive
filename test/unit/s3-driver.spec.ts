/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import test from 'japa';
import path from 'path';
import fs from 'fs-extra';
import { Readable } from 'stream';

import { AWSS3, AWSS3Config } from '../../src/Drivers/AWSS3';

function streamToString(stream: Readable): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: any[] = [];

		stream.on('data', (chunk) => chunks.push(chunk));
		stream.on('error', reject);
		stream.on('end', () => resolve(chunks.join('')));
	});
}

const config: AWSS3Config = {
	key: process.env.S3_KEY || '',
	endpoint: process.env.S3_ENDPOINT || '',
	secret: process.env.S3_SECRET || '',
	bucket: process.env.S3_BUCKET || '',
	region: process.env.S3_REGION || '',

	// needed for docker

	s3ForcePathStyle: true,
	sslEnabled: false,
};

test.group('S3 Driver', (group) => {
	const s3Driver = new AWSS3(config);
	const fileURL = (KEY) => `http://${s3Driver.driver().endpoint.host}/${process.env.S3_BUCKET}/${KEY}`;

	group.before(async () => {
		// Create test bucket
		await s3Driver.driver().createBucket(
			{
				ACL: 'public-read',
				Bucket: process.env.S3_BUCKET || '',
				CreateBucketConfiguration: {
					LocationConstraint: process.env.S3_REGION || '',
				},
			},
			(err) => {
				if (err) console.log(err, err.stack);
			}
		);
	});

	test("return false when file doesn't exists", async (assert) => {
		const exists = await s3Driver.exists('some-file.jpg');
		assert.isFalse(exists);
	});

	test('create a new file', async (assert) => {
		const success = await s3Driver.put('some-file.txt', 'This is the text file');
		const exists = await s3Driver.exists('some-file.txt');

		assert.equal(success, true);
		assert.isTrue(exists);
	});

	test('create a new file from buffer', async (assert) => {
		const success = await s3Driver.put('buffer-file.txt', Buffer.from('This is the text file', 'utf-8'));
		const exists = await s3Driver.exists('buffer-file.txt');

		assert.equal(success, true);
		assert.isTrue(exists);
	});

	test('create a new file from stream', async (assert) => {
		const dummyFile = path.join(__dirname, 'stream-file.txt');
		await fs.outputFile(dummyFile, 'Some dummy content');

		const readStream = fs.createReadStream(dummyFile);

		const success = await s3Driver.put('stream-file.txt', readStream);
		const exists = await s3Driver.exists('stream-file.txt');
		await fs.remove(dummyFile);

		assert.equal(success, true);
		assert.isTrue(exists);
	});

	test('throw exception when unable to put file', async (assert) => {
		assert.plan(2);
		try {
			const s3Driver = new AWSS3({ ...config, bucket: 'wrong' });
			await s3Driver.put('dummy-file.txt', 'Hello');
		} catch (error) {
			assert.equal(error.code, 'NoSuchBucket');
			assert.equal(error.message, 'The specified bucket does not exist');
		}
	});

	test('delete existing file', async () => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		await s3Driver.delete('dummy-file.txt');
	});

	test('get file contents', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const content = await s3Driver.get('dummy-file.txt');
		assert.equal(content, 'Hello');
	});

	test('get file as stream', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const stream = s3Driver.getStream('dummy-file.txt');
		const content = await streamToString(stream);
		assert.equal(content, 'Hello');
	});

	test('get public url to a file', (assert) => {
		const url = s3Driver.getUrl('dummy-file1.txt');
		assert.equal(url, fileURL('dummy-file1.txt'));
	});

	test('get public url to a file when region is not defined', (assert) => {
		const s3Driver = new AWSS3({ ...config, region: undefined });
		const url = s3Driver.getUrl('dummy-file1.txt');
		assert.equal(url, fileURL('dummy-file1.txt'));
	});
});
