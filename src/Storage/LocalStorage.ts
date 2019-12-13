/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream';
import { dirname, join, resolve, relative } from 'path';
import fse from 'fs-extra';
import fs from 'fs';

import { Storage } from './Storage';
import { FileNotFound, UnknownException, PermissionMissing } from '../Exceptions';
import { isReadableStream, pipeline } from '../utils';
import {
	Response,
	ExistsResponse,
	ContentResponse,
	PropertiesResponse,
	PutOptions,
	FileListResponse,
	DeleteResponse
} from '../types';
import {promisify} from "util";
import {MetadataConverter} from "../utils/MetadataConverter";
import {InvalidInput} from "../Exceptions/InvalidInput";

function handleError(err: Error & { code: string; path?: string }, fullPath: string): Error {
	switch (err.code) {
		case 'E_FILE_NOT_FOUND':
		case 'ENOENT':
			return new FileNotFound(err, err.path || fullPath);
		case 'EPERM':
			return new PermissionMissing(err, err.path || fullPath);
		default:
			return new UnknownException(err, err.code, err.path || fullPath);
	}
}

export class LocalStorage extends Storage {
	private readonly $root: string;
	private readonly $dataDirectory: string;
	private readonly $metaDirectory: string;

	constructor(config: LocalFileSystemConfig) {
		super();
		this.$root = resolve(config.root);
		this.$dataDirectory = config.dataDirectory || join(this.$root, 'data');
		this.$metaDirectory = config.metadataDirectory || join(this.$root, 'meta');
	}

	static fromConfig(config: LocalFileSystemConfig): Storage {
		return new LocalStorage(config);
	}

	/**
	 * Returns full path to the storage root directory.
	 */
	private dataPath(relativePath: string): string {
		return join(this.$dataDirectory, join('/', relativePath));
	}

	/**
	 * Returns full path to the storage root directory.
	 */
	private metaPath(relativePath: string): string {
		return join(this.$metaDirectory, join('/', relativePath));
	}

	/**
	 * Copy a file to a location.
	 */
	public async copy(src: string, dest: string): Promise<Response> {
		const srcPath = this.dataPath(src);

		try {
			const [result] = await Promise.all([
				fse.copy(srcPath, this.dataPath(dest)),
				fse.copy(this.metaPath(src), this.metaPath(dest)),
			]);
			return { raw: result };
		} catch (e) {
			throw handleError(e, srcPath);
		}
	}

	/**
	 * Delete existing file.
	 */
	public async delete(location: string): Promise<DeleteResponse> {
		const fullPath = this.dataPath(location);
		let wasDeleted: boolean = true;

		try {
			await Promise.all([
				await fse.unlink(fullPath),
				await this.deleteMeta(location),
			]);

			await Promise.all([
				this.cleanUpEmptyDirectories(dirname(fullPath)),
				this.cleanUpEmptyDirectories(dirname(this.metaPath(location))),
			]);
		} catch (e) {
			e = handleError(e, location);

			if (e instanceof FileNotFound) {
				wasDeleted = false;
			} else {
				throw e;
			}
		}

		return {
			raw: undefined,
			wasDeleted,
		};
	}

	/**
	 * Determines if a file or folder already exists.
	 */
	public async exists(location: string): Promise<ExistsResponse> {
		const fullPath = this.dataPath(location);

		try {
			const result = await fse.pathExists(fullPath);
			return { exists: result, raw: result };
		} catch (e) {
			throw handleError(e, location);
		}
	}

	/**
	 * Returns the file contents as Buffer.
	 */
	public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
		const fullPath = this.dataPath(location);

		try {
			const [content, properties] = await Promise.all([
				fse.readFile(fullPath),
				this.getProperties(location),
			]);

			return {
				raw: undefined,
				content,
				properties,
			};
		} catch (e) {
			throw handleError(e, location);
		}
	}

	/**
	 * Returns file size in bytes.
	 */
	public async getProperties(location: string): Promise<PropertiesResponse> {
		const fullPath = this.dataPath(location);

		try {
			const [stat, meta] = await Promise.all([fse.stat(fullPath), this.retrieveMeta(location)]);
			return Object.assign(
				meta,
				{
					contentLength: stat.size,
					lastModified: stat.mtime,
					raw: stat,
				},
			);
		} catch (e) {
			throw handleError(e, location);
		}
	}

	/**
	 * Returns a read stream for a file location.
	 */
	public getStream(location: string, options?: ReadStreamOptions | string): fse.ReadStream {
		return fse.createReadStream(this.dataPath(location), options);
	}

	/**
	 * Move file to a new location.
	 */
	public async move(src: string, dest: string): Promise<Response> {
		const srcPath = this.dataPath(src);

		try {
			const [result] = await Promise.all([
				fse.move(srcPath, this.dataPath(dest)),
				fse.move(this.metaPath(src), this.metaPath(dest)),
			]);

			await Promise.all([
				this.cleanUpEmptyDirectories(dirname(srcPath)),
				this.cleanUpEmptyDirectories(dirname(this.metaPath(src))),
			]);

			return { raw: result };
		} catch (e) {
			throw handleError(e, src);
		}
	}

	/**
	 * Creates a new file.
	 * This method will create missing directories on the fly.
	 */
	public async put(
		location: string,
		content: Buffer | Readable | string,
		options?: PutOptions,
	): Promise<Response> {
		if (!MetadataConverter.checkKeys(options && options.metadata || {})) {
			throw new InvalidInput(
				'options.metadata',
				'put',
				'Metadata keys must start with lower-case latin letter, and consist only of latin letters',
			);
		}

		let result;
		const fullPath = this.dataPath(location);
		const meta = {
			contentType: options && options.contentType || 'application/octet-stream',
			contentLanguage: options && options.contentLanguage,
			metadata: options && options.metadata,
			raw: undefined,
		};

		try {
			if (isReadableStream(content)) {
				await fse.ensureDir(dirname(fullPath));
				const ws = fse.createWriteStream(fullPath);
				await Promise.all([
					pipeline(content, ws),
					this.saveMeta(location, meta),
				]);

				result = { raw: undefined };
			} else if (Buffer.isBuffer(content) || typeof(content) === 'string') {
				await fse.ensureDir(dirname(fullPath));
				await Promise.all([
					fse.writeFile(fullPath, content),
					this.saveMeta(location, meta),
				]);

				result = { raw: undefined };
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

	flatList(prefix: string): AsyncIterable<FileListResponse> {
		// no dots, empty path should end with '/', and end '/' is preserved
		return this.flatListAbsolute(this.dataPath(prefix))
	}

	private async *flatListAbsolute(prefix: string): AsyncGenerator<FileListResponse> {
		let prefixDirectory = (prefix[prefix.length-1] === '/') ? prefix : dirname(prefix);

		try {
			for (const file of await promisify(fs.readdir)(prefixDirectory, {withFileTypes: true, encoding: 'utf-8'})) {
				const fileName = join(prefixDirectory, file.name);

				if (fileName.substr(0, prefix.length) === prefix) {
					if (file.isDirectory()) {
						for await (const subFile of this.flatListAbsolute(fileName + '/')) {
							yield subFile;
						}
					} else if (file.isFile()) {
						const path = relative(this.$dataDirectory, fileName);

						yield {
							path,
							properties: await this.getProperties(path),
						}
					}
				}
			}
		} catch (e) {
			e = handleError(e, e.path);

			if (!(e instanceof FileNotFound)) {
				throw e;
			}
		}
	}

	private async cleanUpEmptyDirectories(directoryRealPath: string): Promise<void> {
		if (
			!join(this.$dataDirectory, '/').startsWith(directoryRealPath)
			&& directoryRealPath.startsWith(join(this.$dataDirectory, '/'))
		) {
			if (!(await promisify(fs.readdir)(directoryRealPath)).length) {
				// TODO: handle error if there was a race, and dir is not empty
				await fse.rmdir(directoryRealPath);
				await this.cleanUpEmptyDirectories(dirname(directoryRealPath));
			}
		}
	}

	private async retrieveMeta(location: string): Promise<PropertiesResponse> {
		try {
			return await fse.readJson(this.metaPath(location));
		} catch (e) {
			if (e.code !== 'ENOENT' && e.code !== 'E_FILE_NOT_FOUND') {
				throw e;
			}

			return { contentType: 'application/octet-stream', raw: undefined};
		}
	}

	private async saveMeta(location: string, meta: PropertiesResponse): Promise<void> {
		const metaPath = this.metaPath(location);

		await fse.mkdirp(dirname(metaPath));
		await fse.writeJson(metaPath, meta);
	}

	private async deleteMeta(location: string): Promise<void> {
		const metaPath = this.metaPath(location);

		try {
			await fse.unlink(metaPath);
		} catch (e) {
			if (e.code !== 'ENOENT' && e.code !== 'E_FILE_NOT_FOUND') {
				throw e;
			}
		}
	}
}

export type LocalFileSystemConfig = {
	root: string;
	metadataDirectory?: string;
	dataDirectory?: string;
};

export type ReadStreamOptions = {
	flags?: string;
	encoding?: string;
	fd?: number;
	mode?: number;
	autoClose?: boolean;
	start?: number;
	end?: number;
	highWaterMark?: number;
};
