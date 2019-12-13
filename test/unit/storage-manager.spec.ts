/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { resolve } from 'path';

import { StorageManager } from '../../src/StorageManager';
import { LocalStorage } from '../../src/Storage/LocalStorage';
import { Storage } from "../../src/Storage/Storage";

describe('Storage Manager', () => {
	test('throw exception when no disk name is defined', () => {
		const storageManager = new StorageManager({disks: {}});
		const fn = () => storageManager.disk();
		expect(fn).toThrow('E_INVALID_CONFIG: Make sure to define a default disk name inside config file');
	});

	test('throw exception when disk config is missing', () => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {},
		});
		const fn = () => storageManager.disk();
		expect(fn).toThrow('E_INVALID_CONFIG: Make sure to define config for local disk');
	});

	test('throw exception when disk config doesnt have driver', () => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				// @ts-ignore
				local: {
					root: '',
				},
			},
		});
		const fn = () => storageManager.disk();
		expect(fn).toThrow('E_INVALID_CONFIG: Make sure to define driver for local disk');
	});

	test('throw exception when driver is invalid', () => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				local: {
					root: '',
					driver: 'foo',
				},
			},
		});
		const fn = () => storageManager.disk();
		expect(fn).toThrow( 'Driver foo is not supported');
	});

	test('return storage instance for a given driver', () => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				local: {
					root: '',
					driver: 'local',
				},
			},
		});
		const localDriver = storageManager.disk('local');
		expect(localDriver).toBeInstanceOf(LocalStorage);
	});

	test('extend and add new drivers', async () => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				local: {
					driver: 'foo',
				},
			},
		});

		// @ts-ignore
		class FooDriver extends Storage {
			static fromConfig(config: object){
				return new FooDriver();
			}
		}

		// @ts-ignore
		storageManager.registerStorage('foo', FooDriver);

		expect(storageManager.disk('local')).toBeInstanceOf(FooDriver);
	});

	test('add disk with custom config', async () => {
		const storageManager = new StorageManager({
			default: 'local',
			disks: {
				local: {
					root: '',
					driver: 'local',
				},
			},
		});
		storageManager.addDisk('local2', {
			root: '/test',
			driver: 'local',
		});
		const localWithCustomConfig = storageManager.disk('local2');

		expect(localWithCustomConfig).toBeInstanceOf(LocalStorage);
		// @ts-ignore
		expect(localWithCustomConfig.$root).toEqual(resolve('/test'));
	});

	test('add disk with custom config and unregistered driver', async () => {
		const storageManager = new StorageManager({disks: {}});
		// @ts-ignore
		class FooDriver extends Storage {
			static fromConfig(config: object){
				return new FooDriver(config);
			}

			constructor(public readonly config: object) { super(); }
		}

		storageManager.addDisk('foo', {
			foo: 'bar',
			driver: FooDriver,
		});
		const localWithCustomConfig = storageManager.disk('foo');

		expect(localWithCustomConfig).toBeInstanceOf(FooDriver);
		// @ts-ignore
		expect(localWithCustomConfig.config.foo).toEqual('bar');
	});
});
