/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */
import {StorageConstructor} from "./Storage/Storage";

export interface StorageManagerDiskConfig {
	driver: string | StorageConstructor;
	[key: string]: unknown;
}

export interface StorageManagerConfig {
	/**
	 * The default disk returned by `disk()`.
	 */
	default?: string;
	disks: {[key: string]: StorageManagerDiskConfig};
}

export interface PutOptions {
	contentType?: string,
	contentLanguage?: string;
	// key should match /^[a-zA-Z]+$/ for interoperability
	metadata?: {[key: string]: string},
}

export interface SignedUrlOptions {
	/**
	 * Expiration time of the URL.
	 * It should be a number of seconds from now.
	 * @default `900` (15 minutes)
	 */
	expiry?: number;
}

export interface Response {
	raw: unknown;
}

export interface DeleteResponse extends Response{
	wasDeleted: boolean,
}

export interface ExistsResponse extends Response {
	exists: boolean;
}

export interface ContentResponse<T> extends Response {
	content: T;
	properties: PropertiesResponse;
}

export interface SignedUrlResponse extends Response {
	signedUrl: string;
}

export interface PropertiesResponse extends Response{
	contentType: string;
	contentLanguage?: string,
	contentLength?: number;
	lastModified?: Date;
	eTag?: string,
	// key should match /^[a-z]+([A-Z][a-z]+)*$/ for interoperability
	metadata?: {[key: string]: string},
}

export interface FileListResponse {
	path: string,
	properties: PropertiesResponse,
}
