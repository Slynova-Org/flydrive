/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import Drivers from './Drivers';
import Storage from './Storage';
import { InvalidConfig, DriverNotSupported } from './Exceptions';
import { StorageManagerConfig, StorageManagerDiskConfig } from './types';

export default class StorageManager {
	/**
	 * Configuration of the storage manager.
	 */
	private _config: StorageManagerConfig;

	private _disks: StorageManagerDiskConfig;

	/**
	 * List of drivers extended
	 */
	private _extendedDrivers: Map<string, () => Storage> = new Map();

	constructor(config: StorageManagerConfig) {
		this._config = config;
		this._disks = config.disks || {};
	}

	/**
	 * Get a disk instance.
	 */
	disk<T extends Storage>(name?: string, config?: unknown): T {
		name = name || this._config.default;

		/**
		 * No name is defined and neither there
		 * are any defaults.
		 */
		if (!name) {
			throw InvalidConfig.missingDiskName();
		}

		const diskConfig = this._disks[name];

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

		/**
		 * Call the custom driver constructor.
		 */
		const customDriver = this._extendedDrivers.get(diskConfig.driver);
		if (customDriver) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
			// @ts-ignore
			return customDriver();
		}

		const Driver = Drivers[diskConfig.driver];

		/**
		 * Unable to pull driver from the drivers list
		 */
		if (!Driver) {
			throw DriverNotSupported.driver(diskConfig.driver);
		}

		return new Driver({ ...diskConfig, ...config });
	}

	/**
	 * Register a custom driver.
	 */
	public extend<T extends Storage>(name: string, handler: () => T): void {
		this._extendedDrivers.set(name, handler);
	}
}
