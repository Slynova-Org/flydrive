/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import test from 'japa';
import path from 'path';
import fs from 'fs-extra';

import * as CE from '../../src/Exceptions';
import { LocalFileSystemStorage } from '../../src/Drivers/LocalFileSystemStorage';
import { streamToString, getFlatList } from '../utils';

let storage: LocalFileSystemStorage;

function isWindowsDefenderError(error: { code: string }): boolean {
	return error.code === 'EPERM';
}

function realFsPath(relativePath: string): string {
	return path.join(__dirname, 'storage', relativePath);
}

test.group('Local Driver', (group) => {
	group.before(async () => {
		await fs.ensureDir(path.join(__dirname, 'storage'));
		storage = new LocalFileSystemStorage({ root: path.join(__dirname, 'storage') });
	});

	group.afterEach(async () => {
		await fs.emptyDir(path.join(__dirname, 'storage'));
	});

	test('find if a file exists', async (assert) => {
		await fs.outputFile(realFsPath('i_exist'), '');
		const { exists } = await storage.exists('i_exist');
		assert.isTrue(exists);
	});

	test(`find if a file doesn't exist`, async (assert) => {
		const { exists } = await storage.exists('i_dont_exist');
		assert.isFalse(exists);
	});

	test('find if a folder exists', async (assert) => {
		await fs.ensureDir(realFsPath('test_dir'));
		const { exists } = await storage.exists('test_dir');
		assert.isTrue(exists);
	});

	test('create a file', async (assert) => {
		await storage.put('im_new', 'text_data');
		const { content } = await storage.get('im_new');
		assert.equal(content, 'text_data');
	});

	test('create a file in a deep directory', async (assert) => {
		await storage.put('deep/directory/im_new', 'text_data');
		const { content } = await storage.get('deep/directory/im_new');
		assert.equal(content, 'text_data');
	});

	test('delete a file', async (assert) => {
		await fs.outputFile(realFsPath('i_will_be_deleted'), '');

		try {
			const { wasDeleted } = await storage.delete('i_will_be_deleted');
			assert.isTrue(wasDeleted);
			const { exists } = await storage.exists('i_will_be_deleted');
			assert.isFalse(exists);
		} catch (error) {
			if (!isWindowsDefenderError(error)) {
				throw error;
			}
		}
	});

	test('delete a file that does not exist', async (assert) => {
		const { wasDeleted } = await storage.delete('i_dont_exist');
		assert.isFalse(wasDeleted);
	});

	test('move a file', async (assert) => {
		await fs.outputFile(realFsPath('i_will_be_renamed'), '');

		await storage.move('i_will_be_renamed', 'im_renamed');

		const { exists: newExists } = await storage.exists('im_renamed');
		assert.isTrue(newExists);

		const { exists: oldExists } = await storage.exists('i_will_be_renamed');
		assert.isFalse(oldExists);
	});

	test('copy a file', async (assert) => {
		await fs.outputFile(realFsPath('i_will_be_copied'), '');

		await storage.copy('i_will_be_copied', 'im_copied');

		const { exists: newExists } = await storage.exists('im_copied');
		assert.isTrue(newExists);

		const { exists: oldExists } = await storage.exists('i_will_be_copied');
		assert.isTrue(oldExists);
	});

	test('prepend to a file', async (assert) => {
		await fs.outputFile(realFsPath('i_have_content'), 'world');

		await storage.prepend('i_have_content', 'hello ');
		const { content } = await storage.get('i_have_content');
		assert.equal(content, 'hello world');
	});

	test('append to a file', async (assert) => {
		await fs.outputFile(realFsPath('i_have_content'), 'hello');

		await storage.append('i_have_content', ' universe');
		const { content } = await storage.get('i_have_content');
		assert.equal(content, 'hello universe');
	});

	test('prepend to new file', async (assert) => {
		await storage.prepend('i_have_content', 'hello');
		const { content } = await storage.get('i_have_content', 'utf-8');
		assert.equal(content, 'hello');
	});

	test('throw file not found exception when unable to find file', async (assert) => {
		assert.plan(1);
		try {
			await storage.get('non_existing', 'utf-8');
		} catch (error) {
			assert.instanceOf(error, CE.FileNotFound);
		}
	});

	test('do not get out of root path when path is absolute', async (assert) => {
		const dummyFile = '/dummy_file';

		await storage.put(dummyFile, 'dummy content');

		const content = fs.readFileSync(realFsPath(dummyFile), 'utf-8');
		assert.equal(content, 'dummy content');
	});

	test('ignore extraneous double dots ..', async (assert) => {
		await storage.put('../../../dummy_file', 'dummy content');

		const content = fs.readFileSync(realFsPath('dummy_file'), 'utf-8');
		assert.equal(content, 'dummy content');
	});

	test('don not ignore valid double dots ..', async (assert) => {
		await storage.put('fake_dir/../dummy_file', 'dummy content');

		const content = fs.readFileSync(realFsPath('dummy_file'), 'utf-8');
		assert.equal(content, 'dummy content');
	});

	test('create file from stream', async (assert) => {
		await storage.put('foo', 'Foo related content');
		const readStream = fs.createReadStream(realFsPath('foo'));

		await storage.put('bar', readStream);

		const { content } = await storage.get('bar');
		assert.equal(content, 'Foo related content');
	});

	test('throw exception when unable to find file', async (assert) => {
		assert.plan(1);

		const readStream = storage.getStream('foo');
		try {
			await streamToString(readStream);
		} catch ({ code }) {
			assert.equal(code, 'ENOENT');
		}
	});

	test('get stream of a given file', async (assert) => {
		await storage.put('foo', 'Foo');
		const readStream = storage.getStream('foo');
		const content = await streamToString(readStream);
		assert.equal(content, 'Foo');
	});

	test('get the stat of a given file', async (assert) => {
		await storage.put('foo', 'Foo content');
		const { size, modified } = await storage.getStat('foo');
		assert.equal(size, 11);
		assert.instanceOf(modified, Date);
	});

	test('list files with no prefix and empty directory', async (assert) => {
		const result = await getFlatList(storage);
		assert.deepStrictEqual(result, []);
	});

	test('list files with prefix that does not exist', async (assert) => {
		const result = await getFlatList(storage, '/dummy/path');
		assert.deepStrictEqual(result, []);
	});

	test('list files with no prefix', async (assert) => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);
		const result = await getFlatList(storage);
		assert.deepStrictEqual(result.sort(), ['foo.txt', path.normalize('foo/bar'), path.normalize('other/dir/file.txt')]);
	});

	test('list files with folder prefix', async (assert) => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);
		const result = await getFlatList(storage, 'other');
		assert.deepStrictEqual(result, [path.normalize('other/dir/file.txt')]);
	});

	test('list files with subfolder prefix', async (assert) => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);
		const result = await getFlatList(storage, `other/dir/`);
		assert.deepStrictEqual(result, [path.normalize('other/dir/file.txt')]);
	});

	test('list files with filename prefix', async (assert) => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);
		const result = await getFlatList(storage, 'other/dir/fil');
		assert.deepStrictEqual(result, [path.normalize('other/dir/file.txt')]);
	});

	test('list files with double dots in prefix', async (assert) => {
		await Promise.all([
			storage.put('foo.txt', 'bar'),
			storage.put('foo/bar', 'baz'),
			storage.put('other/dir/file.txt', 'hello'),
		]);
		const result = await getFlatList(storage, 'other/../');
		assert.deepStrictEqual(result.sort(), ['foo.txt', path.normalize('foo/bar'), path.normalize('other/dir/file.txt')]);
	});
});
