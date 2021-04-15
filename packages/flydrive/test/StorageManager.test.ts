/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import Storage from '../src/Storage';
import StorageManager from '../src/StorageManager';
import { LocalFileSystemStorage } from '../src/LocalFileSystemStorage';

describe('Storage Manager', () => {
	test('throw exception when no disk name is defined', () => {
		const storageManager = new StorageManager({});
		const fn = (): Storage => storageManager.disk();
		expect(fn).toThrow('E_INVALID_CONFIG: Make sure to define a default disk name inside config file');
	});

	test('throw exception when disk config is missing', () => {
		const storageManager = new StorageManager({
			default: 'local',
		});
		const fn = (): Storage => storageManager.disk();

		expect(fn).toThrow('E_INVALID_CONFIG: Make sure to define config for local disk');
	});

	test('throw exception when disk config doesnt have driver', () => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				// @ts-expect-error Check wrong config case
				local: {},
			},
		});
		const fn = (): Storage => storageManager.disk();

		expect(fn).toThrow('E_INVALID_CONFIG: Make sure to define driver for local disk');
	});

	test('throw exception when driver is invalid', () => {
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
		const fn = (): Storage => storageManager.disk();

		expect(fn).toThrow('Driver foo is not supported');
	});

	test('return storage instance for a given driver', () => {
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

		expect(localDriver).toBeInstanceOf(LocalFileSystemStorage);
	});

	test('extend and add new drivers', () => {
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

		expect(storageManager.disk('local')).toBeInstanceOf(FooDriver);
	});

	test('get disk with custom config', () => {
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
		expect(localWithDefaultConfig).toBeInstanceOf(LocalFileSystemStorage);
	});
});
