import {AzureBlobWebServicesStorageConfig, AzureBlobWebServicesStorage} from '../src/AzureBlobWebServices';

import fs from 'fs-extra';

import { FileNotFound, UnknownException } from '@slynova/flydrive';
import { BlobServiceClient } from '@azure/storage-blob';

const config: AzureBlobWebServicesStorageConfig = {
    accountName: process.env.AZURE_ACCOUNT || '',
    accountKey: process.env.AZURE_ACCOUNT_KEY || '',
    containerName: process.env.AZURE_CONTAINER_NAME || ''
}
const storage = new AzureBlobWebServicesStorage(config);

function fileURL(KEY: string): string {
	return `${(storage.driver() as BlobServiceClient).url}${config.containerName}/${KEY}`;
}

const testString = 'test-data';

describe('Azure Driver', () => {
	test(`return false when file doesn't exists`, async () => {
		const { exists } = await storage.exists('some-file.jpg');
		expect(exists).toBe(false);
	});

	test('create a new file', async () => {
		await storage.put('some-file.txt', testString);

		const { content } = await storage.get('some-file.txt');
		expect(content).toStrictEqual(testString);
	});

	test('create a new file from buffer', async () => {
		await storage.put('buffer-file.txt', Buffer.from(testString, 'utf-8'));

		const { content } = await storage.get('some-file.txt');
		expect(content).toStrictEqual(testString);
	});
	

	test('create a new file in a subdir', async () => {
		await storage.put('subdir/some-file.txt', testString);

		const {content} = await storage.get('subdir/some-file.txt');
		expect(content).toStrictEqual(testString);
	});

	test('create a new file from stream', async () => {
		const readStream = fs.createReadStream(__filename);

		await storage.put('stream-file.txt', readStream);
		const { exists } = await storage.exists('stream-file.txt');

		expect(exists).toBe(true);
	});

	test('throw exception when unable to put file', async () => {
		expect.assertions(1);

		try {
			const storage = new AzureBlobWebServicesStorage({ ...config, containerName: 'wrong' });
			await storage.put('dummy-file.txt', testString);
		} catch (error) {
			expect(error).toBeInstanceOf(UnknownException);
		}
	});

	test('delete existing file', async () => {
		await storage.put('dummy-file.txt', testString);

		const { wasDeleted } = await storage.delete('dummy-file.txt');
		expect(wasDeleted).toBe(true);

		const { exists } = await storage.exists('dummy-file.txt');
		expect(exists).toBe(false);
	});

	test('get file contents as string', async () => {
		await storage.put('dummy-file.txt', testString);

		const { content } = await storage.get('dummy-file.txt');
		expect(content).toStrictEqual(testString);
	});

	test('get file contents as Buffer', async () => {
		await storage.put('dummy-file.txt', testString);

		const { content } = await storage.getBuffer('dummy-file.txt');
		expect(content).toBeInstanceOf(Buffer);
		expect(content.toString()).toEqual(testString);
	});

	test('get file that does not exist', async () => {
		expect.assertions(1);

		try {
			await storage.get('bad.txt');
		} catch (error) {
			expect(error).toBeInstanceOf(FileNotFound);
		}
	});

	test('get the stat of a file', async () => {
		await storage.put('dummy-file.txt', testString);

		const { size, modified } = await storage.getStat('dummy-file.txt');
		expect(size).toStrictEqual(testString.length);
		expect(modified).toBeInstanceOf(Date);
	});

	test('get public url to a file', () => {
		const url = storage.getUrl('dummy-file1.txt');
		expect(url).toStrictEqual(fileURL('dummy-file1.txt'));
	});

	test('cleanup all files', () => {
		storage.delete("buffer-file.txt");
		storage.delete("dummy-file.txt");
		storage.delete("some-file.txt");
		storage.delete("subdir/some-file.txt");
		storage.delete("stream-file.txt");
	});
});