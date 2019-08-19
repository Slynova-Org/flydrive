/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Readable } from 'stream';
import { isAbsolute, join, resolve } from 'path';
import fs from 'fs-extra';
import createOutputStream from 'create-output-stream';
import Storage from '../Storage';
import { FileNotFound, UnknownException, PermissionMissing } from '../Exceptions';
import { isReadableStream, pipeline } from '../utils';
import { Response, ExistsResponse, ContentResponse, SizeResponse } from '../types';

function handleError(err: Error & { code: string; path?: string }, fullPath: string): never {
	switch (err.code) {
		case 'ENOENT':
			throw new FileNotFound(err, err.path || fullPath);
		case 'EPERM':
			throw new PermissionMissing(err, err.path || fullPath);
		default:
			throw new UnknownException(err, err.path || fullPath);
	}
}

export class LocalFileSystem extends Storage {
	private $root: string;

	constructor(config: LocalFileSystemConfig) {
		super();
		this.$root = resolve(config.root);
	}

	/**
	 * Returns full path to the storage root directory.
	 */
	private _fullPath(relativePath: string): string {
		return isAbsolute(relativePath) ? relativePath : join(this.$root, relativePath);
	}

	/**
	 * Appends content to a file.
	 */
	public async append(
		location: string,
		content: Buffer | Readable | string,
		options?: fs.WriteFileOptions
	): Promise<Response> {
		if (isReadableStream(content)) {
			return this.put(location, content, Object.assign({ flags: 'a' }, options));
		} else {
			const fullPath = this._fullPath(location);

			try {
				const result = await fs.appendFile(fullPath, content, options);
				return { raw: result };
			} catch (e) {
				return handleError(e, fullPath);
			}
		}
	}

	/**
	 * Copy a file to a location.
	 */
	public async copy(src: string, dest: string, options?: fs.CopyOptions): Promise<Response> {
		const srcPath = this._fullPath(src);

		try {
			const result = await fs.copy(srcPath, this._fullPath(dest), options);
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
			const result = await fs.unlink(this._fullPath(location));
			return { raw: result };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns the driver.
	 */
	public driver(): typeof fs {
		return fs;
	}

	/**
	 * Determines if a file or folder already exists.
	 */
	public async exists(location: string): Promise<ExistsResponse> {
		const fullPath = this._fullPath(location);

		try {
			const result = await fs.pathExists(fullPath);
			return { exists: result, raw: result };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns the file contents as string.
	 */
	public async get(location: string, encoding = 'utf8'): Promise<ContentResponse<string>> {
		const fullPath = this._fullPath(location);

		try {
			const result = await fs.readFile(fullPath, encoding);
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
			const result = await fs.readFile(fullPath);
			return { content: result, raw: result };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns file size in bytes.
	 */
	public async getSize(location: string): Promise<SizeResponse> {
		const fullPath = this._fullPath(location);

		try {
			const stat = await fs.stat(fullPath);
			return { size: stat.size, raw: stat };
		} catch (e) {
			return handleError(e, fullPath);
		}
	}

	/**
	 * Returns a read stream for a file location.
	 */
	public getStream(location: string, options?: ReadStreamOptions | string): fs.ReadStream {
		return fs.createReadStream(this._fullPath(location), options);
	}

	/**
	 * Move file to a new location.
	 */
	public async move(src: string, dest: string): Promise<Response> {
		const srcPath = this._fullPath(src);

		try {
			const result = await fs.move(src, this._fullPath(dest));
			return { raw: result };
		} catch (e) {
			return handleError(e, srcPath);
		}
	}

	/**
	 * Prepends content to a file.
	 */
	public async prepend(location: string, content: Buffer | string, options?: fs.WriteFileOptions): Promise<Response> {
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
		options?: fs.WriteFileOptions
	): Promise<Response> {
		const fullPath = this._fullPath(location);

		try {
			if (isReadableStream(content)) {
				const ws = createOutputStream(fullPath, options);
				await pipeline(content, ws);
				return { raw: undefined };
			}

			const result = await fs.outputFile(fullPath, content, options);
			return { raw: result };
		} catch (e) {
			return handleError(e, fullPath);
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
