/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import test from 'japa';

import Storage from '../../src/Storage';
import StorageManager from '../../src/StorageManager';
import { LocalFileSystemStorage } from '../../src/Drivers/LocalFileSystemStorage';

test.group('Storage Manager', () => {
	test('throw exception when no disk name is defined', (assert) => {
		const storageManager = new StorageManager({});
		const fn = () => storageManager.disk();
		assert.throw(fn, 'E_INVALID_CONFIG: Make sure to define a default disk name inside config file');
	});

	test('throw exception when disk config is missing', (assert) => {
		const storageManager = new StorageManager({
			default: 'local',
		});
		const fn = () => storageManager.disk();
		assert.throw(fn, 'E_INVALID_CONFIG: Make sure to define config for local disk');
	});

	test('throw exception when disk config doesnt have driver', (assert) => {
		const storageManager = new StorageManager({
			default: 'local',
			// @ts-ignore
			disks: {
				// @ts-ignore
				local: {},
			},
		});
		const fn = () => storageManager.disk();
		assert.throw(fn, 'E_INVALID_CONFIG: Make sure to define driver for local disk');
	});

	test('throw exception when driver is invalid', (assert) => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				local: {
					driver: 'foo',
					config: {
						root: '',
					},
				},
			},
		});
		const fn = () => storageManager.disk();
		assert.throw(fn, 'Driver foo is not supported');
	});

	test('return storage instance for a given driver', (assert) => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				local: {
					driver: 'local',
					config: {
						root: '',
					},
				},
			},
		});
		const localDriver = storageManager.disk('local');
		assert.instanceOf(localDriver, LocalFileSystemStorage);
	});

	test('extend and add new drivers', async (assert) => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				local: {
					driver: 'foo',
					config: {},
				},
			},
		});

		class FooDriver extends Storage {}
		storageManager.registerDriver('foo', FooDriver);

		assert.instanceOf(storageManager.disk('local'), FooDriver);
	});

	test('get disk with custom config', async (assert) => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				local: {
					driver: 'local',
					config: {
						root: '',
					},
				},
			},
		});
		const localWithDefaultConfig = storageManager.disk('local');
		assert.instanceOf(localWithDefaultConfig, LocalFileSystemStorage);
	});
});
