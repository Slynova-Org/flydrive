/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

export interface StorageManagerDiskConfig {
	[key: string]: {
		driver: string;
		[key: string]: unknown;
	};
}

export interface StorageManagerConfig {
	/**
	 * The default disk returned by `disk()`.
	 */
	default?: string;
	disks?: StorageManagerDiskConfig;
}

export interface Response {
	raw: unknown;
}

export interface ExistsResponse extends Response {
	exists: boolean;
}

export interface ContentResponse<ContentType> extends Response {
	content: ContentType;
}

export interface SignedUrlOptions {
	/**
	 * Expiration time of the URL.
	 * It should be a number of seconds from now.
	 * @default `900` (15 minutes)
	 */
	expiry?: number;
}

export interface SignedUrlResponse extends Response {
	signedUrl: string;
}

export interface StatResponse extends Response {
	size: number;
	modified: Date;
}
