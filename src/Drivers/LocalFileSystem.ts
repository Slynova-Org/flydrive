/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { Stream } from 'stream';
import { isAbsolute, join } from 'path';
import fs from 'fs-extra';
import createOutputStream from 'create-output-stream';
import Storage from '../Storage';
import { FileNotFound } from '../Exceptions';
import { isReadableStream, pipeline } from '../utils';
import { Response, ExistsResponse, ContentResponse, SizeResponse } from '../types';

export class LocalFileSystem extends Storage {
	constructor(protected $config: LocalFileSystemConfig) {
		super();
	}

	/**
	 * Returns full path to the storage root directory.
	 */
	private _fullPath(relativePath: string): string {
		return isAbsolute(relativePath) ? relativePath : join(this.$config.root, relativePath);
	}

	/**
	 * Appends content to a file.
	 */
	public async append(
		location: string,
		content: Buffer | Stream | string,
		options?: fs.WriteFileOptions
	): Promise<Response> {
		if (isReadableStream(content)) {
			return this.put(location, content, Object.assign({ flags: 'a' }, options));
		} else {
			const result = await fs.appendFile(this._fullPath(location), content, options);
			return { raw: result };
		}
	}

	/**
	 * Copy a file to a location.
	 */
	public async copy(src: string, dest: string, options?: fs.CopyOptions): Promise<Response> {
		const result = await fs.copy(this._fullPath(src), this._fullPath(dest), options);

		return { raw: result };
	}

	/**
	 * Delete existing file.
	 * This method will not throw an exception if file doesn't exists.
	 */
	public async delete(location: string): Promise<Response> {
		const result = await fs.remove(this._fullPath(location));

		return { raw: result };
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
		const result = await fs.pathExists(this._fullPath(location));
		return { exists: true, raw: result };
	}

	/**
	 * Returns the file contents.
	 */
	get(location: string, encoding?: string): Promise<ContentResponse<string>>;
	get(location: string, encoding: null): Promise<ContentResponse<Buffer>>;
	public async get(location: string, encoding: string | null = 'utf8'): Promise<ContentResponse<Buffer | string>> {
		const fullPath = this._fullPath(location);

		try {
			if (typeof encoding === 'string') {
				const result = await fs.readFile(fullPath, encoding);
				return { content: result, raw: result };
			} else {
				const result = await fs.readFile(fullPath);
				return { content: result, raw: result };
			}
		} catch (e) {
			if (e.code === 'ENOENT') {
				throw new FileNotFound(fullPath);
			}

			throw e;
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
			if (e.code === 'ENOENT') {
				throw new FileNotFound(fullPath);
			}

			throw e;
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
		const result = await fs.move(this._fullPath(src), this._fullPath(dest));

		return { raw: result };
	}

	/**
	 * Prepends content to a file.
	 */
	public async prepend(location: string, content: Buffer | string, options?: fs.WriteFileOptions): Promise<Response> {
		if (await this.exists(location)) {
			const actualContent = await this.get(location, 'utf-8');

			return this.put(location, `${content}${actualContent}`, options);
		}

		return this.put(location, content, options);
	}

	/**
	 * Creates a new file.
	 * This method will create missing directories on the fly.
	 */
	public async put(
		location: string,
		content: Buffer | Stream | string,
		options?: fs.WriteFileOptions
	): Promise<Response> {
		const fullPath = this._fullPath(location);

		if (isReadableStream(content)) {
			const ws = createOutputStream(fullPath, options);
			await pipeline(content, ws);

			return { raw: undefined };
		}

		const result = await fs.outputFile(fullPath, content, options);

		return { raw: result };
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
