/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { MethodNotSupported } from './exceptions';
import {
	Response,
	SignedUrlResponse,
	ContentResponse,
	ExistsResponse,
	SignedUrlOptions,
	StatResponse,
	FileListResponse,
	DeleteResponse,
} from './types';

export default abstract class Storage {
	/**
	 * Appends content to a file.
	 *
	 * Supported drivers: "local"
	 */
	append(location: string, content: Buffer | string): Promise<Response> {
		throw new MethodNotSupported('append', this.constructor.name);
	}

	/**
	 * Copy a file to a location.
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	copy(src: string, dest: string): Promise<Response> {
		throw new MethodNotSupported('copy', this.constructor.name);
	}

	/**
	 * Delete existing file.
	 * The value returned by this method will have a `wasDeleted` property that
	 * can be either a boolean (`true` if a file was deleted, `false` if there was
	 * no file to delete) or `null` (if no information about the file is available).
	 *
	 * Supported drivers: "local", "s3", "gcs"
	 */
	delete(location: string): Promise<DeleteResponse> {
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
	getStream(location: string): NodeJS.ReadableStream {
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
	put(location: string, content: Buffer | NodeJS.ReadableStream | string): Promise<Response> {
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
