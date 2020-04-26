/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream';
import S3, { ClientConfiguration } from 'aws-sdk/clients/s3';
import { Storage } from '..';
import { UnknownException, NoSuchBucket, FileNotFound } from '../Exceptions';
import { SignedUrlOptions, Response, ExistsResponse, ContentResponse, SignedUrlResponse, StatResponse } from '../types';

function handleError(err: Error, path: string, bucket: string): never {
	switch (err.name) {
		case 'NoSuchBucket':
			throw new NoSuchBucket(err, bucket);
		case 'NoSuchKey':
			throw new FileNotFound(err, path);
		default:
			throw new UnknownException(err, err.name, path);
	}
}

export class AmazonWebServicesS3Storage extends Storage {
	protected $driver: S3;
	protected $config: AmazonWebServicesS3Config;
	protected $bucket: string;

	constructor(config: AmazonWebServicesS3Config) {
		super();
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const S3 = require('aws-sdk/clients/s3');

		this.$driver = new S3({
			accessKeyId: config.key,
			secretAccessKey: config.secret,
			...config,
		});

		this.$config = config;
		this.$bucket = config.bucket;
	}

	/**
	 * Use a different bucket at runtime.
	 * This method returns a new instance of AmazonWebServicesS3Storage.
	 */
	public bucket(bucket: string): AmazonWebServicesS3Storage {
		return new AmazonWebServicesS3Storage({
			...this.$config,
			bucket,
		});
	}

	/**
	 * Copy a file to a location.
	 */
	public async copy(src: string, dest: string, options: object): Promise<Response> {
		const params = {
			Key: dest,
			Bucket: this.$bucket,
			CopySource: `/${this.$bucket}/${src}`,
			...options,
		};

		try {
			const result = await this.$driver.copyObject(params).promise();
			return { raw: result };
		} catch (e) {
			return handleError(e, src, this.$bucket);
		}
	}

	/**
	 * Delete existing file.
	 */
	public async delete(location: string): Promise<Response> {
		const params = { Key: location, Bucket: this.$bucket };

		try {
			const result = await this.$driver.deleteObject(params).promise();
			return { raw: result };
		} catch (e) {
			return handleError(e, location, this.$bucket);
		}
	}

	/**
	 * Returns the driver.
	 */
	public driver(): S3 {
		return this.$driver;
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
				return handleError(e, location, this.$bucket);
			}
		}
	}

	/**
	 * Returns the file contents.
	 */
	public async get(location: string, encoding = 'utf-8'): Promise<ContentResponse<string>> {
		const bufferResult = await this.getBuffer(location);
		return {
			content: bufferResult.content.toString(encoding),
			raw: bufferResult.raw,
		};
	}

	/**
	 * Returns the file contents as Buffer.
	 */
	public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
		const params = { Key: location, Bucket: this.$bucket };

		try {
			const result = await this.$driver.getObject(params).promise();

			// S3.getObject returns a Buffer in Node.js
			const body = result.Body as Buffer;

			return { content: body, raw: result };
		} catch (e) {
			return handleError(e, location, this.$bucket);
		}
	}

	/**
	 * Returns signed url for an existing file
	 */
	public async getSignedUrl(location: string, options: SignedUrlOptions = {}): Promise<SignedUrlResponse> {
		const { expiry = 900 } = options;

		try {
			const result = await new Promise((resolve: (value: string) => void, reject): void => {
				const params = {
					Key: location,
					Bucket: this.$bucket,
					Expiry: expiry,
				};

				this.$driver.getSignedUrl('getObject', params, (error, url) => {
					if (error) {
						return reject(error);
					}

					return resolve(url);
				});
			});
			return { signedUrl: result, raw: result };
		} catch (e) {
			return handleError(e, location, this.$bucket);
		}
	}

	/**
	 * Returns file's size and modification date.
	 */
	public async getStat(location: string): Promise<StatResponse> {
		const params = { Key: location, Bucket: this.$bucket };

		try {
			const result = await this.$driver.headObject(params).promise();
			return {
				size: result.ContentLength as number,
				modified: result.LastModified as Date,
				raw: result,
			};
		} catch (e) {
			return handleError(e, location, this.$bucket);
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
		await this.copy(src, dest, {});
		await this.delete(src);
		return { raw: undefined };
	}

	/**
	 * Creates a new file.
	 * This method will create missing directories on the fly.
	 */
	public async put(location: string, content: Buffer | Readable | string): Promise<Response> {
		const params = { Key: location, Body: content, Bucket: this.$bucket };
		try {
			const result = await this.$driver.upload(params).promise();
			return { raw: result };
		} catch (e) {
			return handleError(e, location, this.$bucket);
		}
	}
}

export interface AmazonWebServicesS3Config extends ClientConfiguration {
	key: string;
	secret: string;
	bucket: string;
}
