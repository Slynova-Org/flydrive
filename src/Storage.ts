/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream';
import { MethodNotSupported } from './Exceptions';
import {
	Response,
	SignedUrlResponse,
	ContentResponse,
	ExistsResponse,
	SignedUrlOptions,
	StatResponse,
	FileListResponse,
} from './types';

export default abstract class Storage {
	/**
	 * Appends content to a file.
	 *
	 * Supported drivers: "local"
	 */
	append(location: string, content: Buffer | Readable | string, options: object): Promise<Response> {
		throw new MethodNotSupported('append', this.constructor.name);
	}

	/**
	 * Use a different bucket at runtime.
	 *
	 * Supported drivers: "s3", "gcs"
	 */
	bucket(name: string): void {
		throw new MethodNotSupported('bucket', this.constructor.name);
	}

	/**
	 * Copy a file to a location.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	copy(src: string, dest: string, options: object): Promise<Response> {
		throw new MethodNotSupported('copy', this.constructor.name);
	}

	/**
	 * Delete existing file.
	 * This method will not throw an exception if file doesn't exists.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	delete(location: string): Promise<Response> {
		throw new MethodNotSupported('delete', this.constructor.name);
	}

	/**
	 * Returns the driver.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	public driver(): unknown {
		throw new MethodNotSupported('driver', this.constructor.name);
	}

	/**
	 * Determines if a file or folder already exists.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	exists(location: string): Promise<ExistsResponse> {
		throw new MethodNotSupported('exists', this.constructor.name);
	}

	/**
	 * Returns the file contents as a string.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	get(location: string, encoding?: string): Promise<ContentResponse<string>> {
		throw new MethodNotSupported('get', this.constructor.name);
	}

	/**
	 * Returns the file contents as a Buffer.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	getBuffer(location: string): Promise<ContentResponse<Buffer>> {
		throw new MethodNotSupported('getBuffer', this.constructor.name);
	}

	/**
	 * Returns signed url for an existing file.
	 *
	 * Supported drivers: "s3", "gcs"
	 */
	getSignedUrl(location: string, options?: SignedUrlOptions): Promise<SignedUrlResponse> {
		throw new MethodNotSupported('getSignedUrl', this.constructor.name);
	}

	/**
	 * Returns file's size and modification date.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	getStat(location: string): Promise<StatResponse> {
		throw new MethodNotSupported('getStat', this.constructor.name);
	}

	/**
	 * Returns the stream for the given file.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	getStream(location: string): Readable {
		throw new MethodNotSupported('getStream', this.constructor.name);
	}

	/**
	 * Returns url for a given key. Note this method doesn't
	 * validates the existence of file or it's visibility
	 * status.
	 *
	 * Supported drivers: "s3", "gcs"
	 */
	getUrl(location: string): string {
		throw new MethodNotSupported('getUrl', this.constructor.name);
	}

	/**
	 * Move file to a new location.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	move(src: string, dest: string): Promise<Response> {
		throw new MethodNotSupported('move', this.constructor.name);
	}

	/**
	 * Creates a new file.
	 * This method will create missing directories on the fly.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	put(location: string, content: Buffer | Readable | string): Promise<Response> {
		throw new MethodNotSupported('put', this.constructor.name);
	}

	/**
	 * Prepends content to a file.
	 *
	 * Supported drivers: "local"
	 */
	prepend(location: string, content: Buffer | string): Promise<Response> {
		throw new MethodNotSupported('prepend', this.constructor.name);
	}

	/**
	 * List files with a given prefix.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	flatList(prefix?: string): AsyncIterable<FileListResponse> {
		throw new MethodNotSupported('flatList', this.constructor.name);
	}
}
