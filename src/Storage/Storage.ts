/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream';
import { MethodNotSupported } from '../Exceptions';
import {
	Response,
	SignedUrlResponse,
	ContentResponse,
	ExistsResponse,
	SignedUrlOptions,
	PropertiesResponse,
	PutOptions, FileListResponse, DeleteResponse
} from '../types';

export interface StorageConstructor<T extends Storage = Storage> {
	new(...args: any[]): T;
	fromConfig(config: object): T;
}

export abstract class Storage {

	/**
	 * This should be implemented in all Storage classes, but Typescript does not support abstract static methods
	 */
	/*abstract*/ static fromConfig(config: object): Storage {
		throw new MethodNotSupported('fromConfig', arguments.callee.name);
	}

	/**
	 * Delete existing file.
	 * This method will not throw an exception if file doesn't exists.
	 */
	abstract delete(location: string): Promise<DeleteResponse>;

	/**
	 * Determines if a file or folder already exists.
	 */
	abstract exists(location: string): Promise<ExistsResponse>;

	/**
	 * List files with given prefix
	 * @param prefix
	 */
	abstract flatList(prefix: string): AsyncIterable<FileListResponse>;

	/**
	 * Returns the file contents as a Buffer.
	 */
	abstract getBuffer(location: string): Promise<ContentResponse<Buffer>>;

	/**
	 * Returns file's size and modification date.
	 */
	abstract getProperties(location: string): Promise<PropertiesResponse>;

	/**
	 * Returns the stream for the given file.
	 */
	abstract getStream(location: string): Readable;

	/**
	 * Creates a new file.
	 * This method will create missing directories on the fly.
	 */
	abstract put(location: string, content: Buffer | Readable | string, options?: PutOptions): Promise<Response>;

	/**
	 * Copy a file to a location.
	 */
	abstract copy(src: string, dest: string): Promise<Response>;

	/**
	 * Move file to a new location.
	 */
	abstract move(src: string, dest: string): Promise<Response>;

	/**
	 * Returns url for a given key. Note this method doesn't
	 * validates the existence of file or it's visibility
	 * status.
	 */
	getUrl(location: string): string {
		throw new MethodNotSupported('getUrl', this.constructor.name);
	}

	/**
	 * Returns signed url for an existing file.
	 */
	getSignedUrl(location: string, options?: SignedUrlOptions): Promise<SignedUrlResponse> {
		throw new MethodNotSupported('getUrl', this.constructor.name);
	};
}
