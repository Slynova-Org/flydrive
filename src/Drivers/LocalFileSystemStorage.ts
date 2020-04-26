/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream';
import { dirname, join, resolve, relative } from 'path';
import { promises as fs } from 'fs';
import fse from 'fs-extra';
import Storage from '../Storage';
import { FileNotFound, UnknownException, PermissionMissing } from '../Exceptions';
import { isReadableStream, pipeline } from '../utils';
import { Response, ExistsResponse, ContentResponse, StatResponse, FileListResponse } from '../types';

function handleError(err: Error & { code: string; path?: string }, fullPath: string): never {
	switch (err.code) {
		case 'ENOENT':
			throw new FileNotFound(err, err.path || fullPath);
		case 'EPERM':
			throw new PermissionMissing(err, err.path || fullPath);
		default:
			throw new UnknownException(err, err.code, err.path || fullPath);
	}
}

export class LocalFileSystemStorage extends Storage {
	private $root: string;

	constructor(config: LocalFileSystemConfig) {
		super();
		this.$root = resolve(config.root);
	}

	/**
	 * Returns full path relative to the storage's root directory.
	 */
	private _fullPath(relativePath: string): string {
		return join(this.$root, join('/', relativePath));
	}

	/**
	 * Appends content to a file.
	 */
	public async append(
		location: string,
		content: Buffer | Readable | string,
		options?: fse.WriteFileOptions
	): Promise<Response> {
		if (isReadableStream(content)) {
			return this.put(location, content, Object.assign({ flags: 'a' }, options));
		} else {
			const fullPath = this._fullPath(location);

			try {
				const result = await fse.appendFile(fullPath, content, options);
				return { raw: result };
			} catch (e) {
				return handleError(e, fullPath);
			}
		}
	}

	/**
	 * Copy a file to a location.
	 */
	public async copy(src: string, dest: string, options?: fse.CopyOptions): Promise<Response> {
		const srcPath = this._fullPath(src);

		try {
			const result = await fse.copy(srcPath, this._fullPath(dest), options);
			return { raw: result };
		} catch (e) {
			return handleError(e, srcPath);
		}
	}

	/**
	 * Delete existing file.
	 */
	public async delete(location: string): Promise<Response> {
		const fullPath = this._fullPath(location);

		try {
			const result = await fse.unlink(this._fullPath(location));
			return { raw: result };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns the driver.
	 */
	public driver(): typeof fse {
		return fse;
	}

	/**
	 * Determines if a file or folder already exists.
	 */
	public async exists(location: string): Promise<ExistsResponse> {
		const fullPath = this._fullPath(location);

		try {
			const result = await fse.pathExists(fullPath);
			return { exists: result, raw: result };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns the file contents as string.
	 */
	public async get(location: string, encoding = 'utf-8'): Promise<ContentResponse<string>> {
		const fullPath = this._fullPath(location);

		try {
			const result = await fse.readFile(fullPath, encoding);
			return { content: result, raw: result };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns the file contents as Buffer.
	 */
	public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
		const fullPath = this._fullPath(location);

		try {
			const result = await fse.readFile(fullPath);
			return { content: result, raw: result };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns file size in bytes.
	 */
	public async getStat(location: string): Promise<StatResponse> {
		const fullPath = this._fullPath(location);

		try {
			const stat = await fse.stat(fullPath);
			return {
				size: stat.size,
				modified: stat.mtime,
				raw: stat,
			};
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns a read stream for a file location.
	 */
	public getStream(location: string, options?: ReadStreamOptions | string): fse.ReadStream {
		return fse.createReadStream(this._fullPath(location), options);
	}

	/**
	 * Move file to a new location.
	 */
	public async move(src: string, dest: string): Promise<Response> {
		const srcPath = this._fullPath(src);

		try {
			const result = await fse.move(srcPath, this._fullPath(dest));
			return { raw: result };
		} catch (e) {
			return handleError(e, srcPath);
		}
	}

	/**
	 * Prepends content to a file.
	 */
	public async prepend(location: string, content: Buffer | string, options?: fse.WriteFileOptions): Promise<Response> {
		try {
			const { content: actualContent } = await this.get(location, 'utf-8');

			return this.put(location, `${content}${actualContent}`, options);
		} catch {
			return this.put(location, content, options);
		}
	}

	/**
	 * Creates a new file.
	 * This method will create missing directories on the fly.
	 */
	public async put(
		location: string,
		content: Buffer | Readable | string,
		options?: fse.WriteFileOptions
	): Promise<Response> {
		const fullPath = this._fullPath(location);

		try {
			if (isReadableStream(content)) {
				const dir = dirname(fullPath);
				await fse.ensureDir(dir);
				const ws = fse.createWriteStream(fullPath, options);
				await pipeline(content, ws);
				return { raw: undefined };
			}

			const result = await fse.outputFile(fullPath, content, options);
			return { raw: result };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * List files with a given prefix.
	 */
	public flatList(prefix = ''): AsyncIterable<FileListResponse> {
		const fullPrefix = this._fullPath(prefix);
		return this._flatDirIterator(fullPrefix);
	}

	private async *_flatDirIterator(prefix: string): AsyncIterable<FileListResponse> {
		const prefixDirectory = prefix[prefix.length - 1] === '/' ? prefix : dirname(prefix);

		try {
			const dir = await fs.opendir(prefixDirectory);

			for await (const file of dir) {
				const fileName = join(prefixDirectory, file.name);
				if (fileName.startsWith(prefix)) {
					if (file.isDirectory()) {
						yield* this._flatDirIterator(fileName + '/');
					} else if (file.isFile()) {
						const path = relative(this.$root, fileName);
						yield {
							raw: null,
							path,
						};
					}
				}
			}
		} catch (e) {
			if (e.code !== 'ENOENT') {
				return handleError(e, prefix);
			}
		}
	}
}

export type LocalFileSystemConfig = {
	root: string;
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
