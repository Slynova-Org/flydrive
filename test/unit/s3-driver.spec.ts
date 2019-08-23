/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import test from 'japa';
import fs from 'fs-extra';
import { Readable } from 'stream';

import { AWSS3, AWSS3Config } from '../../src/Drivers/AWSS3';
import { NoSuchBucket, FileNotFound } from '../../src/Exceptions';

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
		await s3Driver
			.driver()
			.createBucket({
				ACL: 'public-read',
				Bucket: process.env.S3_BUCKET || '',
				CreateBucketConfiguration: {
					LocationConstraint: process.env.S3_REGION || '',
				},
			})
			.promise();
	});

	test("return false when file doesn't exists", async (assert) => {
		const { exists } = await s3Driver.exists('some-file.jpg');
		assert.isFalse(exists);
	});

	test('create a new file', async (assert) => {
		await s3Driver.put('some-file.txt', 'This is the text file');
		const { content } = await s3Driver.get('some-file.txt');

		assert.strictEqual(content, 'This is the text file');
	});

	test('create a new file from buffer', async (assert) => {
		await s3Driver.put('buffer-file.txt', Buffer.from('This is the text file', 'utf-8'));
		const { content } = await s3Driver.get('some-file.txt');

		assert.strictEqual(content, 'This is the text file');
	});

	test('create a new file from stream', async (assert) => {
		const readStream = fs.createReadStream(__filename);

		await s3Driver.put('stream-file.txt', readStream);
		const { exists } = await s3Driver.exists('stream-file.txt');

		assert.isTrue(exists);
	});

	test('throw exception when unable to put file', async (assert) => {
		assert.plan(1);
		try {
			const s3Driver = new AWSS3({ ...config, bucket: 'wrong' });
			await s3Driver.put('dummy-file.txt', 'Hello');
		} catch (error) {
			assert.instanceOf(error, NoSuchBucket);
		}
	});

	test('delete existing file', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		await s3Driver.delete('dummy-file.txt');

		const { exists } = await s3Driver.exists('dummy-file.txt');

		assert.isFalse(exists);
	});

	test('get file contents as string', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const { content } = await s3Driver.get('dummy-file.txt');
		assert.equal(content, 'Hello');
	});

	test('get file contents as Buffer', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const { content } = await s3Driver.getBuffer('dummy-file.txt');
		assert.instanceOf(content, Buffer);
		assert.equal(content.toString(), 'Hello');
	});

	test('get file that does not exist', async (assert) => {
		assert.plan(1);
		try {
			await s3Driver.get('bad.txt');
		} catch (e) {
			assert.instanceOf(e, FileNotFound);
		}
	});

	test('get the stat of a file', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const { size, modified } = await s3Driver.getStat('dummy-file.txt');
		assert.strictEqual(size, 5);
		assert.instanceOf(modified, Date);
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
