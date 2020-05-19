/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import test from 'japa';
import fs from 'fs-extra';

import { AmazonWebServicesS3Storage, AmazonWebServicesS3StorageConfig } from '../src/AmazonWebServicesS3Storage';
import { NoSuchBucket, FileNotFound } from '@slynova/flydrive';
import { streamToString } from '../../../test/utils';
import S3 from 'aws-sdk/clients/s3';

const config: AmazonWebServicesS3StorageConfig = {
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
	const s3Driver = new AmazonWebServicesS3Storage(config);
	const fileURL = (KEY) => `http://${(s3Driver.driver() as S3).endpoint.host}/${process.env.S3_BUCKET}/${KEY}`;

	group.before(async () => {
		// Create test bucket
		await (s3Driver.driver() as S3)
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
	}).timeout(5000);

	test('create a new file', async (assert) => {
		await s3Driver.put('some-file.txt', 'This is the text file');
		const { content } = await s3Driver.get('some-file.txt');

		assert.strictEqual(content, 'This is the text file');
	}).timeout(5000);

	test('create a new file from buffer', async (assert) => {
		await s3Driver.put('buffer-file.txt', Buffer.from('This is the text file', 'utf-8'));
		const { content } = await s3Driver.get('some-file.txt');

		assert.strictEqual(content, 'This is the text file');
	}).timeout(5000);

	test('create a new file from stream', async (assert) => {
		const readStream = fs.createReadStream(__filename);

		await s3Driver.put('stream-file.txt', readStream);
		const { exists } = await s3Driver.exists('stream-file.txt');

		assert.isTrue(exists);
	}).timeout(5000);

	test('throw exception when unable to put file', async (assert) => {
		assert.plan(1);
		try {
			const s3Driver = new AmazonWebServicesS3Storage({ ...config, bucket: 'wrong' });
			await s3Driver.put('dummy-file.txt', 'Hello');
		} catch (error) {
			assert.instanceOf(error, NoSuchBucket);
		}
	}).timeout(5000);

	test('delete existing file', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const { wasDeleted } = await s3Driver.delete('dummy-file.txt');
		assert.isNull(wasDeleted);

		const { exists } = await s3Driver.exists('dummy-file.txt');

		assert.isFalse(exists);
	}).timeout(5000);

	test('get file contents as string', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const { content } = await s3Driver.get('dummy-file.txt');
		assert.equal(content, 'Hello');
	}).timeout(5000);

	test('get file contents as Buffer', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const { content } = await s3Driver.getBuffer('dummy-file.txt');
		assert.instanceOf(content, Buffer);
		assert.equal(content.toString(), 'Hello');
	}).timeout(5000);

	test('get file that does not exist', async (assert) => {
		assert.plan(1);
		try {
			await s3Driver.get('bad.txt');
		} catch (e) {
			assert.instanceOf(e, FileNotFound);
		}
	}).timeout(5000);

	test('get the stat of a file', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const { size, modified } = await s3Driver.getStat('dummy-file.txt');
		assert.strictEqual(size, 5);
		assert.instanceOf(modified, Date);
	}).timeout(5000);

	test('get file as stream', async (assert) => {
		await s3Driver.put('dummy-file.txt', 'Hello');
		const stream = s3Driver.getStream('dummy-file.txt');
		const content = await streamToString(stream);
		assert.equal(content, 'Hello');
	}).timeout(5000);

	test('get public url to a file', (assert) => {
		const url = s3Driver.getUrl('dummy-file1.txt');
		assert.equal(url, fileURL('dummy-file1.txt'));
	}).timeout(5000);

	test('get public url to a file when region is not defined', (assert) => {
		const s3Driver = new AmazonWebServicesS3Storage({ ...config, region: undefined });
		const url = s3Driver.getUrl('dummy-file1.txt');
		assert.equal(url, fileURL('dummy-file1.txt'));
	}).timeout(5000);
});
