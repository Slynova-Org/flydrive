/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import {Storage as GenericStorage, StorageConstructor} from './Storage/Storage';
import {InvalidConfig, DriverNotSupported} from './Exceptions';
import {StorageManagerConfig, StorageManagerDiskConfig} from './types';
import {AmazonWebServicesS3Storage} from "./Storage/AmazonWebServicesS3Storage";
import {LocalStorage} from "./Storage/LocalStorage";
import {AzureBlockBlobStorage} from "./Storage/AzureBlockBlobStorage";
import {GoogleCloudStorage} from "./Storage/GoogleCloudStorage";

export class StorageManager {
	/**
	 * Configuration of the storage manager.
	 */
	private readonly _config: StorageManagerConfig;

	/**
	 * Created disk instances
	 */
	private readonly _diskInstances: Map<string, GenericStorage>;

	/**
	 * List of available storages
	 */
	private _storages: Map<string, StorageConstructor> = new Map();

	constructor(config: StorageManagerConfig) {
		this._config = Object.assign({disks: {}}, config);
		this._diskInstances = new Map();
		this.registerStorage('azureBlob', AzureBlockBlobStorage);
		this.registerStorage('gcs', GoogleCloudStorage);
		this.registerStorage('local', LocalStorage);
		this.registerStorage('s3', AmazonWebServicesS3Storage);
	}

	addDisk(name: string, config: StorageManagerDiskConfig) {
		if (this._config.disks.hasOwnProperty(name)) {
			throw InvalidConfig.duplicateDiskName(name);
		}

		this._config.disks[name] = config;
	}

	/**
	 * Get a disk instance.
	 */
	disk(name?: string): GenericStorage {
		name = name || this._config.default;

		/**
		 * No name is defined and neither there
		 * are any defaults.
		 */
		if (name === undefined || name === null) {
			throw InvalidConfig.missingDiskName();
		}

		if (!this._diskInstances.has(name)) {
			const diskConfig = this._config.disks[name];

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

			const Driver = (typeof diskConfig.driver === 'string')
				? this._storages.get(diskConfig.driver)
				: diskConfig.driver
			;

			/**
			 * Unable to pull driver from the drivers list
			 */
			if (!Driver) {
				throw DriverNotSupported.driver(diskConfig.driver as string);
			}

			this._diskInstances.set(name, Driver.fromConfig(diskConfig));
		}

		return this._diskInstances.get(name) as GenericStorage;
	}

	/**
	 * Register storage.
	 */
	public registerStorage<T extends GenericStorage>(name: string, constructor: StorageConstructor<T>): void {
		this._storages.set(name, constructor);
	}
}
