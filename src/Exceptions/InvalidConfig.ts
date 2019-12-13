/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { RuntimeException } from 'node-exceptions';

export class InvalidConfig extends RuntimeException {
	public static missingDiskName() {
		return new this('Make sure to define a default disk name inside config file', 500, 'E_INVALID_CONFIG');
	}

	public static missingDiskConfig(name: string) {
		return new this(`Make sure to define config for ${name} disk`, 500, 'E_INVALID_CONFIG');
	}

	public static missingDiskDriver(name: string) {
		return new this(`Make sure to define driver for ${name} disk`, 500, 'E_INVALID_CONFIG');
	}

	public static duplicateDiskName(name: string) {
		return new this(`Disk with name ${name} is already defined`, 500, 'E_INVALID_CONFIG');
	}
}
