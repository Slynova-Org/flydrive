/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream';
import S3, { ClientConfiguration } from 'aws-sdk/clients/s3';
import {UnknownException, NoSuchBucket, FileNotFound, InvalidInput, PermissionMissing} from '../Exceptions';
import {
	ContentResponse,
	DeleteResponse,
	ExistsResponse,
	FileListResponse,
	PropertiesResponse,
	PutOptions ,
	Response,
	SignedUrlOptions,
	SignedUrlResponse,
} from '../types';
import { MetadataConverter } from '../utils/MetadataConverter'
import { isReadableStream } from "../utils";
import { Storage } from "./Storage";

function handleError(err: Error, path: string, bucket: string): Error {
	switch (err.name) {
		case 'NoSuchBucket':
			return new NoSuchBucket(err, bucket);
		case 'NoSuchKey':
			return new FileNotFound(err, path);
		case 'AllAccessDisabled':
			return new PermissionMissing(err, path);
		default:
			return new UnknownException(err, err.name, path);
	}
}

export class AmazonWebServicesS3Storage extends Storage {
	constructor(protected readonly $driver: S3, protected readonly $bucket: string) {
		super();
	}

	/**
	 * @param config
	 */
	static fromConfig(config: AWSS3Config): AmazonWebServicesS3Storage {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const S3 = require('aws-sdk/clients/s3');

		return new AmazonWebServicesS3Storage(
			new S3({
				accessKeyId: config.key,
				secretAccessKey: config.secret,
				...config,
			}),
			config.bucket,
		);
	}

	/**
	 * Copy a file to a location.
	 */
	public async copy(src: string, dest: string): Promise<Response> {
		const params = {
			Key: dest,
			Bucket: this.$bucket,
			CopySource: `/${this.$bucket}/${src}`,
		};

		try {
			const result = await this.$driver.copyObject(params).promise();
			return { raw: result };
		} catch (e) {
			throw handleError(e, src, this.$bucket);
		}
	}

	/**
	 * Delete existing file.
	 */
	public async delete(location: string): Promise<DeleteResponse> {
		const params = { Key: location, Bucket: this.$bucket };
		let result: any;
		let wasDeleted = true;

		try {
			result = await this.$driver.deleteObject(params).promise();
		} catch (e) {
			result = e;
			e = handleError(e, location, this.$bucket);

			if (e instanceof FileNotFound) {
				wasDeleted = false;
			} else {
				throw e;
			}
		}

		return {
			raw: result,
			wasDeleted,
		};
	}

	/**
	 * Determines if a file or folder already exists.
	 */
	public async exists(location: string): Promise<ExistsResponse> {
		const params = { Key: location, Bucket: this.$bucket };

		try {
			const result = await this.$driver.headObject(params).promise();
			return { exists: true, raw: result };
		} catch (e) {
			if (e.statusCode === 404) {
				return { exists: false, raw: e };
			} else {
				throw handleError(e, location, this.$bucket);
			}
		}
	}

	/**
	 * Returns the file contents as Buffer.
	 */
	public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
		try {
			const result = await this.$driver.getObject({ Key: location, Bucket: this.$bucket }).promise();
			// S3.getObject returns a Buffer in Node.js
			const body = result.Body as Buffer;

			return {
				content: body,
				raw: result,
				properties: this.convertHeaders(result),
			};
		} catch (e) {
			throw handleError(e, location, this.$bucket);
		}
	}

	/**
	 * Returns signed url for an existing file
	 */
	public async getSignedUrl(location: string, options: SignedUrlOptions = {}): Promise<SignedUrlResponse> {
		const { expiry = 900 } = options;

		try {
			const params = {
				Key: location,
				Bucket: this.$bucket,
				Expires: expiry,
			};
			const result = await this.$driver.getSignedUrlPromise('getObject', params);

			return { signedUrl: result, raw: result };
		} catch (e) {
			throw handleError(e, location, this.$bucket);
		}
	}

	/**
	 * Returns file's size and modification date.
	 */
	public async getProperties(location: string): Promise<PropertiesResponse> {
		try {
			const result = await this.$driver.headObject({ Key: location, Bucket: this.$bucket }).promise();

			return this.convertHeaders(result);
		} catch (e) {
			throw handleError(e, location, this.$bucket);
		}
	}

	/**
	 * Returns the stream for the given file.
	 */
	public getStream(location: string): Readable {
		const params = { Key: location, Bucket: this.$bucket };

		return this.$driver.getObject(params).createReadStream();
	}

	/**
	 * Returns url for a given key.
	 */
	public getUrl(location: string): string {
		const { href } = this.$driver.endpoint;

		if (href.startsWith('https://s3.amazonaws')) {
			return `https://${this.$bucket}.s3.amazonaws.com/${location}`;
		}

		return `${href}${this.$bucket}/${location}`;
	}

	/**
	 * Moves file from one location to another. This
	 * method will call `copy` and `delete` under
	 * the hood.
	 */
	public async move(src: string, dest: string): Promise<Response> {
		await this.copy(src, dest);
		await this.delete(src);
		return { raw: undefined };
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

		if (!isReadableStream(content) && !Buffer.isBuffer(content) && typeof(content) !== "string") {
			throw new InvalidInput(
				'content',
				'put',
				'only Buffers, ReadableStreams and strings are supported'
			);
		}

		const params = {
			Key: location,
			Body: content,
			Bucket: this.$bucket,
			ContentType: options && options.contentType,
			ContentLanguage:  options && options.contentLanguage,
			Metadata: options && options.metadata && MetadataConverter.camelToKebab(options.metadata)
		};

		try {
			const result = await this.$driver.upload(params).promise();
			return { raw: result };
		} catch (e) {
			throw handleError(e, location, this.$bucket);
		}
	}

	public async *flatList(prefix: string): AsyncIterable<FileListResponse> {
		let marker: string|undefined = undefined;

		do {
			const response = await this.$driver.listObjects({
				Bucket: this.$bucket,
				Prefix: prefix,
				Marker: marker,
				MaxKeys: 1000,
			}).promise();

			marker = response.NextMarker;

			for (const file of response.Contents) {
				yield {
					path: file.Key,
					properties: await this.getProperties(file.Key),
				}
			}
		} while (marker);
	}

	private convertHeaders(headers: S3.HeadObjectOutput): PropertiesResponse {
		return {
			contentType: headers.ContentType || 'application/octet-stream',
			contentLength: headers.ContentLength && Number(headers.ContentLength),
			contentLanguage: headers.ContentLanguage,
			lastModified: headers.LastModified,
			eTag: headers.ETag,
			metadata: MetadataConverter.kebabToCamel(headers.Metadata || {}),
			raw: headers,
		};
	}
}

export interface AWSS3Config extends ClientConfiguration {
	key: string;
	secret: string;
	bucket: string;
}
