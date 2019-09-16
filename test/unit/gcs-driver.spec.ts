import { Readable } from 'stream';

import test from 'japa';
import uuid from 'uuid/v4';
import { Storage } from '@google-cloud/storage';

import { GoogleCloudStorage } from '../../src/Drivers/GoogleCloudStorage';
import { PermissionMissing, FileNotFound } from '../../src/Exceptions';

function streamToString(stream: Readable): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: any[] = [];

		stream.on('data', (chunk) => chunks.push(chunk));
		stream.on('error', reject);
		stream.on('end', () => resolve(chunks.join('')));
	});
}

const testBucket = 'flydrive-test';
const storage = new GoogleCloudStorage({
	...(process.env.GCS_KEYFILENAME && { keyFilename: process.env.GCS_KEYFILENAME }),
	...(process.env.GCS_KEY && { credentials: JSON.parse(process.env.GCS_KEY) }),
	bucket: testBucket,
});

// used to isolate tests in case of failures or other sessions running at the same time
let folder;
let testFile;
let otherFile;

const testString = 'test-data';

test.group('GCS Driver', (group) => {
	group.beforeEach(async () => {
		folder = uuid();
		testFile = `${folder}/test.txt`;
		otherFile = `${folder}/sub/dir/other.txt`;
		await storage.put(testFile, testString);
	});
	group.afterEach(async () => {
		try {
			await storage.delete(testFile);
		} catch (e) {}
		try {
			await storage.delete(otherFile);
		} catch (e) {}
	});

	test('change of bucket', async (assert) => {
		assert.plan(1);
		const newStorage = storage.bucket('other-bucket');
		try {
			await newStorage.put(testFile, testString);
		} catch (error) {
			assert.instanceOf(error, PermissionMissing);
		}
	});

	test('copy a file', async (assert) => {
		await storage.copy(testFile, otherFile);

		const { content } = await storage.get(otherFile, 'utf-8');
		assert.strictEqual(content, testString);

		const { exists } = await storage.exists(testFile);
		assert.isTrue(exists);
	}).timeout(5000);

	test('delete a file', async (assert) => {
		await storage.delete(testFile);

		const { exists } = await storage.exists(testFile);
		assert.isFalse(exists);
	}).timeout(5000);

	test('get driver instance', (assert) => {
		const driver = storage.driver();
		assert.instanceOf(driver, Storage);
	});

	test('get file content as Buffer', async (assert) => {
		const { content } = await storage.getBuffer(testFile);
		assert.instanceOf(content, Buffer);
		assert.strictEqual(content.toString(), testString);
	}).timeout(5000);

	test('get file content as a string', async (assert) => {
		const { content } = await storage.get(testFile, 'utf-8');
		assert.strictEqual(content, testString);
	}).timeout(5000);

	test('get file that does not exist', async (assert) => {
		assert.plan(1);
		try {
			await storage.get('bad.txt');
		} catch (e) {
			assert.instanceOf(e, FileNotFound);
		}
	}).timeout(5000);

	test('get a signed URL', async (assert) => {
		const { signedUrl } = await storage.getSignedUrl(testFile);
		assert.isTrue(signedUrl.startsWith(`https://storage.googleapis.com/${testBucket}/${folder}`));
	}).timeout(5000);

	test('get the stat of a file', async (assert) => {
		const { size, modified } = await storage.getStat(testFile);
		assert.strictEqual(size, testString.length);
		assert.instanceOf(modified, Date);
	}).timeout(5000);

	test('get a readable stream', async (assert) => {
		const stream = await storage.getStream(testFile);
		const result = await streamToString(stream);
		assert.strictEqual(result, testString);
	}).timeout(5000);

	test('get a public URL', (assert) => {
		const url = storage.getUrl(testFile);
		assert.strictEqual(url, `https://storage.cloud.google.com/${testBucket}/${testFile}`);
	}).timeout(5000);

	test('move a file', async (assert) => {
		await storage.move(testFile, otherFile);

		const { content } = await storage.get(otherFile, 'utf-8');
		assert.strictEqual(content, testString);

		const { exists } = await storage.exists(testFile);
		assert.isFalse(exists);
	}).timeout(5000);

	test('put a file from a string', async (assert) => {
		const str = 'this-is-a-test';

		await storage.put(testFile, str);
		const { content } = await storage.get(testFile, 'utf-8');
		assert.strictEqual(content, str);
	}).timeout(5000);

	test('put a file from a Buffer', async (assert) => {
		const str = 'this-is-a-test';
		const buffer = Buffer.from(str);

		await storage.put(testFile, buffer);
		const { content } = await storage.get(testFile, 'utf-8');
		assert.strictEqual(content, str);
	}).timeout(5000);

	test('put a file from a stream', async (assert) => {
		const stream = storage.getStream(testFile);

		await storage.put(otherFile, stream);
		const { content } = await storage.get(otherFile, 'utf-8');
		assert.strictEqual(content, testString);
	}).timeout(5000);
});
