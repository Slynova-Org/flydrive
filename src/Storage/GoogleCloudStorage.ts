/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream';
import {StorageOptions, Bucket, File, CreateWriteStreamOptions} from '@google-cloud/storage';
import { Storage } from './Storage';
import { isReadableStream, pipeline } from '../utils';
import {
	Response,
	ExistsResponse,
	ContentResponse,
	SignedUrlResponse,
	SignedUrlOptions,
	PropertiesResponse,
	FileListResponse, PutOptions, DeleteResponse
} from '../types';
import { FileNotFound, PermissionMissing, UnknownException, AuthorizationRequired, WrongKeyPath } from '../Exceptions';
import {MetadataConverter} from "../utils/MetadataConverter";
import {InvalidInput} from "../Exceptions/InvalidInput";

function handleError(err: Error & { code?: number | string }, path: string): Error {
	switch (err.code) {
		case 401:
			return new AuthorizationRequired(err, path);
		case 403:
			return new PermissionMissing(err, path);
		case 404:
			return new FileNotFound(err, path);
		case 'ENOENT':
			return new WrongKeyPath(err, path);
		default:
			return new UnknownException(err, String(err.code), path);
	}
}

export class GoogleCloudStorage extends Storage {
	public constructor(private readonly $bucket: Bucket) {
		super();
	}

	static fromConfig(config: GoogleCloudStorageConfig): GoogleCloudStorage {
		const GCSStorage = require('@google-cloud/storage').Storage;

		return new GoogleCloudStorage(new GCSStorage(config).bucket(config.bucket))
	}

	private _file(path: string): File {
		return this.$bucket.file(path);
	}

	/**
	 * Copy a file to a location.
	 */
	public async copy(src: string, dest: string): Promise<Response> {
		const srcFile = this._file(src);
		const destFile = this._file(dest);

		try {
			const result = await srcFile.copy(destFile);
			return { raw: result };
		} catch (e) {
			throw handleError(e, src);
		}
	}

	/**
	 * Delete existing file.
	 */
	public async delete(location: string): Promise<DeleteResponse> {
		let raw;
		let wasDeleted = true;

		try {
			raw = await this._file(location).delete();
		} catch (e) {
			raw = e;
			e = handleError(e, location);

			if (e instanceof FileNotFound) {
				wasDeleted = false;
			} else {
				throw e;
			}
		}
		return {raw, wasDeleted}
	}

	/**
	 * Determines if a file or folder already exists.
	 */
	public async exists(location: string): Promise<ExistsResponse> {
		try {
			const result = await this._file(location).exists();
			return { exists: result[0], raw: result };
		} catch (e) {
			throw handleError(e, location);
		}
	}

	/**
	 * Returns the file contents as Buffer.
	 */
	public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
		try {
			const file = await this._file(location);
			const result = await file.download();

			return {
				content: result[0],
				properties: this.convertProperties(file.metadata),
				raw: result,
			};
		} catch (e) {
			throw handleError(e, location);
		}
	}

	/**
	 * Returns signed url for an existing file.
	 */
	public async getSignedUrl(location: string, options: SignedUrlOptions = {}): Promise<SignedUrlResponse> {
		const { expiry = 900 } = options;
		try {
			const result = await this._file(location).getSignedUrl({
				action: 'read',
				expires: Date.now() + expiry * 1000,
			});
			return { signedUrl: result[0], raw: result };
		} catch (e) {
			throw handleError(e, location);
		}
	}

	/**
	 * Returns file's size and modification date.
	 */
	public async getProperties(location: string): Promise<PropertiesResponse> {
		try {
			return this.convertProperties((await this._file(location).getMetadata())[0]);
		} catch (e) {
			throw handleError(e, location);
		}
	}

	/**
	 * Returns the stream for the given file.
	 */
	public getStream(location: string): Readable {
		return this._file(location).createReadStream();
	}

	/**
	 * Returns URL for a given location. Note this method doesn't
	 * validates the existence of file or it's visibility
	 * status.
	 */
	public getUrl(location: string): string {
		return `https://storage.cloud.google.com/${this.$bucket.name}/${location}`;
	}

	/**
	 * Move file to a new location.
	 */
	public async move(src: string, dest: string): Promise<Response> {
		const srcFile = this._file(src);
		const destFile = this._file(dest);

		try {
			const result = await srcFile.move(destFile);
			return { raw: result };
		} catch (e) {
			throw handleError(e, src);
		}
	}

	/**
	 * Creates a new file.
	 * This method will create missing directories on the fly.
	 */
	public async put(location: string, content: Buffer | Readable | string, options?: PutOptions): Promise<Response> {
		if (options && options.metadata) {
			if (!MetadataConverter.checkKeys(options.metadata)) {
				throw new InvalidInput(
					'options.metadata',
					'put',
					'Metadata keys must start with lower-case latin letter, and consist only of latin letters',
				);
			}
		}

		let result;
		const file = this._file(location);
		const uploadOptions: CreateWriteStreamOptions = {
			contentType: options && options.contentType || 'application/octet-stream',
			metadata: {
				metadata: (options && options.metadata || {}),
				contentLanguage: options && options.contentLanguage,
			}
		};

		try {
			if (isReadableStream(content)) {
				const destStream = file.createWriteStream(uploadOptions);
				await pipeline(content, destStream);
				result = { raw: undefined };
			} else if (Buffer.isBuffer(content) || typeof(content) === 'string') {
				result = {
					raw: await file.save(content, {resumable: false, ...uploadOptions})
				};
			}
		} catch (e) {
			throw handleError(e, location);
		}

		if (!result) {
			throw new InvalidInput(
				'content',
				'AzureBlobStorage#put',
				'only Buffers, ReadableStreams and strings are supported'
			);
		}

		return result;
	}

	private convertProperties(metadata: any): PropertiesResponse {
		return {
			contentType: metadata.contentType || 'application/octet-stream',
			contentLength: metadata.size && Number(metadata.size),
			contentLanguage: metadata.contentLanguage || null,
			lastModified: metadata.updated && new Date(metadata.updated),
			eTag: metadata.etag,
			metadata: metadata.metadata,
			raw: metadata,
		};
	}

	async *flatList(prefix: string): AsyncIterable<FileListResponse> {
		let nextQuery: {} = {
			prefix: prefix,
			autoPaginate: false,
		};

		do {
			const response = await this.$bucket.getFiles(nextQuery);
			const files = response[0];
			nextQuery = response[1];

			for (const file of files) {
				yield {
					path: file.name,
					properties: this.convertProperties(file.metadata),
				}
			}
		} while(nextQuery)
	}
}

export interface GoogleCloudStorageConfig extends StorageOptions {
	bucket: string;
}
