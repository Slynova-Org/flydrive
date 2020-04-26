/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { AmazonWebServicesS3Storage } from './Drivers/AmazonWebServicesS3Storage';
import { GoogleCloudStorage } from './Drivers/GoogleCloudStorage';
import { LocalFileSystemStorage } from './Drivers/LocalFileSystemStorage';
import Storage from './Storage';
import { InvalidConfig, DriverNotSupported } from './Exceptions';
import { StorageManagerConfig, StorageManagerDiskConfig, StorageManagerSingleDiskConfig } from './types';

interface StorageConstructor<T extends Storage = Storage> {
	new (...args: any[]): T;
}

export default class StorageManager {
	/**
	 * Default disk.
	 */
	private _defaultDisk: string | undefined;

	/**
	 * Configured disks.
	 */
	private _disksConfig: StorageManagerDiskConfig;

	/**
	 * Instantiated disks.
	 */
	private _disks: Map<string, Storage> = new Map();

	/**
	 * List of available drivers.
	 */
	private _drivers: Map<string, StorageConstructor<Storage>> = new Map();

	constructor(config: StorageManagerConfig) {
		this._defaultDisk = config.default;
		this._disksConfig = config.disks || {};
		this.registerDriver('s3', AmazonWebServicesS3Storage);
		this.registerDriver('gcs', GoogleCloudStorage);
		this.registerDriver('local', LocalFileSystemStorage);
	}

	/**
	 * Get a disk instance.
	 */
	disk<T extends Storage = Storage>(name?: string): T {
		name = name || this._defaultDisk;

		/**
		 * No name is defined and neither there
		 * are any defaults.
		 */
		if (!name) {
			throw InvalidConfig.missingDiskName();
		}

		if (this._disks.has(name)) {
			return this._disks.get(name) as T;
		}

		const diskConfig = this._disksConfig[name];

		/**
		 * Configuration for the defined disk is missing
		 */
		if (!diskConfig) {
			throw InvalidConfig.missingDiskConfig(name);
		}

		/**
		 * There is no driver defined on disk configuration
		 */
		if (!diskConfig.driver) {
			throw InvalidConfig.missingDiskDriver(name);
		}

		const Driver = this._drivers.get(diskConfig.driver);
		if (!Driver) {
			throw DriverNotSupported.driver(diskConfig.driver);
		}

		const disk = new Driver(diskConfig.config);
		this._disks.set(name, disk);
		return disk as T;
	}

	addDisk(name: string, config: StorageManagerSingleDiskConfig): void {
		if (this._disksConfig[name]) {
			throw InvalidConfig.duplicateDiskName(name);
		}
		this._disksConfig[name] = config;
	}

	/**
	 * Register a custom driver.
	 */
	public registerDriver<T extends Storage>(name: string, driver: StorageConstructor<T>): void {
		this._drivers.set(name, driver);
	}
}
