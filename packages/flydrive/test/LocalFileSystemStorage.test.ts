/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import path from 'path';
import fs from 'fs-extra';

import * as CE from '../src/exceptions';
import { LocalFileSystemStorage } from '../src/LocalFileSystemStorage';
import { streamToString, getFlatList } from '../../../test/utils';

const storage = new LocalFileSystemStorage({ root: path.join(__dirname, 'storage') });

function isWindowsDefenderError(error: { code: string }): boolean {
	return error.code === 'EPERM';
}

function realFsPath(relativePath: string): string {
	return path.join(__dirname, 'storage', relativePath);
}

const testString = 'test-data';

beforeAll(async () => {
	await fs.ensureDir(path.join(__dirname, 'storage'));
});

afterEach(async () => {
	await fs.emptyDir(path.join(__dirname, 'storage'));
});

describe('Local Driver', () => {
	test('find if a file exists', async () => {
		await fs.outputFile(realFsPath('i_exist'), testString);
		const { exists } = await storage.exists('i_exist');

		expect(exists).toBe(true);
	});

	test(`find if a file doesn't exist`, async () => {
		const { exists } = await storage.exists('i_dont_exist');

		expect(exists).toBe(false);
	});

	test('find if a folder exists', async () => {
		await fs.ensureDir(realFsPath('test_dir'));
		const { exists } = await storage.exists('test_dir');

		expect(exists).toBe(true);
	});

	test('create a file', async () => {
		await storage.put('im_new', testString);
		const { content } = await storage.get('im_new');

		expect(content).toStrictEqual(testString);
	});

	test('create a file in a deep directory', async () => {
		await storage.put('deep/directory/im_new', testString);
		const { content } = await storage.get('deep/directory/im_new');

		expect(content).toStrictEqual(testString);
	});

	test('delete a file', async () => {
		await fs.outputFile(realFsPath('i_will_be_deleted'), '');

		try {
			const { wasDeleted } = await storage.delete('i_will_be_deleted');
			expect(wasDeleted).toBe(true);

			const { exists } = await storage.exists('i_will_be_deleted');
			expect(exists).toBe(false);
		} catch (error) {
			if (!isWindowsDefenderError(error)) {
				throw error;
			}
		}
	});

	test('delete a file that does not exist', async () => {
		const { wasDeleted } = await storage.delete('i_dont_exist');
		expect(wasDeleted).toBe(false);
	});

	test('move a file', async () => {
		await fs.outputFile(realFsPath('i_will_be_renamed'), '');
		await storage.move('i_will_be_renamed', 'im_renamed');

		const { exists: newExists } = await storage.exists('im_renamed');
		expect(newExists).toBe(true);

		const { exists: oldExists } = await storage.exists('i_will_be_renamed');
		expect(oldExists).toBe(false);
	});

	test('copy a file', async () => {
		await fs.outputFile(realFsPath('i_will_be_copied'), '');
		await storage.copy('i_will_be_copied', 'im_copied');

		const { exists: newExists } = await storage.exists('im_copied');
		expect(newExists).toBe(true);

		const { exists: oldExists } = await storage.exists('i_will_be_copied');
		expect(oldExists).toBe(true);
	});

	test('prepend to a file', async () => {
		await fs.outputFile(realFsPath('i_have_content'), 'world');
		await storage.prepend('i_have_content', 'hello ');

		const { content } = await storage.get('i_have_content');
		expect(content).toStrictEqual('hello world');
	});

	test('append to a file', async () => {
		await fs.outputFile(realFsPath('i_have_content'), 'hello');
		await storage.append('i_have_content', ' universe');

		const { content } = await storage.get('i_have_content');
		expect(content).toStrictEqual('hello universe');
	});

	test('prepend to new file', async () => {
		await storage.prepend('i_have_content', testString);

		const { content } = await storage.get('i_have_content', 'utf-8');
		expect(content).toStrictEqual(testString);
	});

	test('throw file not found exception when unable to find file', async () => {
		expect.assertions(1);

		try {
			await storage.get('non_existing', 'utf-8');
		} catch (error) {
			expect(error).toBeInstanceOf(CE.FileNotFound);
		}
	});

	test('do not get out of root path when path is absolute', async () => {
		const dummyFile = '/dummy_file';
		await storage.put(dummyFile, testString);

		const content = fs.readFileSync(realFsPath(dummyFile), 'utf-8');
		expect(content).toStrictEqual(testString);
	});

	test('ignore extraneous double dots ..', async () => {
		await storage.put('../../../dummy_file', testString);

		const content = fs.readFileSync(realFsPath('dummy_file'), 'utf-8');
		expect(content).toStrictEqual(testString);
	});

	test('do not ignore valid double dots ..', async () => {
		await storage.put('fake_dir/../dummy_file', testString);

		const content = fs.readFileSync(realFsPath('dummy_file'), 'utf-8');
		expect(content).toStrictEqual(testString);
	});

	test('create file from stream', async () => {
		await storage.put('foo', testString);

		const readStream = fs.createReadStream(realFsPath('foo'));
		await storage.put('bar', readStream);

		const { content } = await storage.get('bar');
		expect(content).toStrictEqual(testString);
	});

	test('throw exception when unable to find file', async () => {
		expect.assertions(1);

		const readStream = storage.getStream('foo');

		try {
			await streamToString(readStream);
		} catch ({ code }) {
			expect(code).toStrictEqual('ENOENT');
		}
	});

	test('get stream of a given file', async () => {
		await storage.put('foo', testString);

		const readStream = storage.getStream('foo');
		const content = await streamToString(readStream);
		expect(content).toStrictEqual(testString);
	});

	test('get the stat of a given file', async () => {
		await storage.put('foo', testString);

		const { size, modified } = await storage.getStat('foo');
		expect(size).toEqual(testString.length);
		// It seems that the Date constructor used in fs-extra is not the global one.
		expect(modified.constructor.name).toStrictEqual('Date');
	});

	test('list files with no prefix and empty directory', async () => {
		const result = await getFlatList(storage);
		expect(result).toStrictEqual([]);
	});

	test('list files with prefix that does not exist', async () => {
		const result = await getFlatList(storage, '/dummy/path');
		expect(result).toStrictEqual([]);
	});

	test('list files with no prefix', async () => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);

		const result = await getFlatList(storage);
		expect(result.sort()).toStrictEqual(['foo.txt', path.normalize('foo/bar'), path.normalize('other/dir/file.txt')]);
	});

	test('list files with folder prefix', async () => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);

		const result = await getFlatList(storage, 'other');
		expect(result).toStrictEqual([path.normalize('other/dir/file.txt')]);
	});

	test('list files with subfolder prefix', async () => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);

		const result = await getFlatList(storage, `other/dir/`);
		expect(result).toStrictEqual([path.normalize('other/dir/file.txt')]);
	});

	test('list files with filename prefix', async () => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);

		const result = await getFlatList(storage, 'other/dir/fil');
		expect(result).toStrictEqual([path.normalize('other/dir/file.txt')]);
	});

	test('list files with double dots in prefix', async () => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);

		const result = await getFlatList(storage, 'other/../');
		expect(result.sort()).toStrictEqual(['foo.txt', path.normalize('foo/bar'), path.normalize('other/dir/file.txt')]);
	});
});
