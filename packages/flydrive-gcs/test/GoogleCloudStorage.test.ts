/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { v4 as uuid } from '@lukeed/uuid';
import { Storage } from '@google-cloud/storage';
import { FileNotFound } from '@slynova/flydrive';

import { GoogleCloudStorage } from '../src/GoogleCloudStorage';
import { streamToString, getFlatList } from '../../../test/utils';

const testBucket = 'flydrive-test';
const storage = new GoogleCloudStorage({
	...(process.env.GCS_KEYFILENAME && { keyFilename: process.env.GCS_KEYFILENAME }),
	...(process.env.GCS_KEY && { credentials: JSON.parse(process.env.GCS_KEY) }),
	bucket: testBucket,
});

// used to isolate tests in case of failures or other sessions running at the same time
let folder: string;
let testFile: string;
let otherFile: string;

const testString = 'test-data';

function filterAndSort(list: string[]): string[] {
	return list.filter((file) => file.startsWith(folder)).sort();
}

beforeEach(async () => {
	folder = uuid();
	testFile = `${folder}/test.txt`;
	otherFile = `${folder}/sub/dir/other.txt`;
	await storage.put(testFile, testString);
});

afterEach(async () => {
	await Promise.all([storage.delete(testFile), , storage.delete(otherFile)]);
});

describe('GCS Driver', () => {
	test('copy a file', async () => {
		await storage.copy(testFile, otherFile);

		const { content } = await storage.get(otherFile, 'utf-8');
		expect(content).toStrictEqual(testString);

		const { exists } = await storage.exists(testFile);
		expect(exists).toBe(true);
	});

	test('delete a file', async () => {
		const { wasDeleted } = await storage.delete(testFile);
		expect(wasDeleted).toBe(true);

		const { exists } = await storage.exists(testFile);
		expect(exists).toBe(false);
	});

	test('delete a file that does not exist', async () => {
		const { wasDeleted } = await storage.delete('not-exist');
		expect(wasDeleted).toBe(false);
	});

	test('get driver instance', () => {
		const driver = storage.driver();
		expect(driver).toBeInstanceOf(Storage);
	});

	test('get file content as Buffer', async () => {
		const { content } = await storage.getBuffer(testFile);

		expect(content).toBeInstanceOf(Buffer);
		expect(content.toString()).toStrictEqual(testString);
	});

	test('get file content as a string', async () => {
		const { content } = await storage.get(testFile, 'utf-8');

		expect(content).toStrictEqual(testString);
	});

	test('get file that does not exist', async () => {
		expect.assertions(1);

		try {
			await storage.get('bad.txt');
		} catch (e) {
			expect(e).toBeInstanceOf(FileNotFound);
		}
	});

	test('get a signed URL', async () => {
		const { signedUrl } = await storage.getSignedUrl(testFile);

		expect(signedUrl.startsWith(`https://storage.googleapis.com/${testBucket}/${folder}`)).toBe(true);
	});

	test('get the stat of a file', async () => {
		const { size, modified } = await storage.getStat(testFile);

		expect(size).toStrictEqual(testString.length);
		expect(modified).toBeInstanceOf(Date);
	});

	test('get a readable stream', async () => {
		const stream = await storage.getStream(testFile);
		const result = await streamToString(stream);

		expect(result).toStrictEqual(testString);
	});

	test('get a public URL', () => {
		const url = storage.getUrl(testFile);
		expect(url).toStrictEqual(`https://storage.googleapis.com/${testBucket}/${testFile}`);
	});

	test('move a file', async () => {
		await storage.move(testFile, otherFile);

		const { content } = await storage.get(otherFile, 'utf-8');
		expect(content).toStrictEqual(testString);

		const { exists } = await storage.exists(testFile);
		expect(exists).toBe(false);
	});

	test('put a file from a string', async () => {
		const str = 'this-is-a-test';
		await storage.put(testFile, str);

		const { content } = await storage.get(testFile, 'utf-8');
		expect(content).toStrictEqual(str);
	});

	test('put a file from a Buffer', async () => {
		const str = 'this-is-a-test';
		const buffer = Buffer.from(str);

		await storage.put(testFile, buffer);
		const { content } = await storage.get(testFile, 'utf-8');
		expect(content).toStrictEqual(str);
	});

	test('put a file from a stream', async () => {
		const stream = await storage.getStream(testFile);
		await storage.put(otherFile, stream);

		const { content } = await storage.get(otherFile, 'utf-8');
		expect(content).toStrictEqual(testString);
	});

	test('list files with no prefix and empty bucket', async () => {
		await storage.delete(testFile);

		const result = await getFlatList(storage);
		expect(filterAndSort(result)).toStrictEqual([]);
	});

	test('list files with prefix that does not exist', async () => {
		const result = await getFlatList(storage, '/dummy/path');

		expect(result).toStrictEqual([]);
	});

	test('list files with no prefix', async () => {
		await storage.put(otherFile, testString);

		const result = await getFlatList(storage);
		expect(filterAndSort(result)).toStrictEqual([otherFile, testFile]);
	});

	test('list files with folder prefix', async () => {
		await storage.put(otherFile, testString);

		const result = await getFlatList(storage, `${folder}/sub/`);
		expect(filterAndSort(result)).toStrictEqual([otherFile]);
	});

	test('list files with filename prefix', async () => {
		await storage.put(otherFile, testString);

		const result = await getFlatList(storage, `${folder}/te`);
		expect(filterAndSort(result)).toStrictEqual([testFile]);
	});
});
