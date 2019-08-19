/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { RuntimeException } from 'node-exceptions';

export class FileNotFound extends RuntimeException {
	raw: Error;
	constructor(err: Error, path: string) {
		super(`The file ${path} doesn't exist`, 500, 'E_FILE_NOT_FOUND');
		this.raw = err;
	}
}
