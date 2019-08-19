/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

export interface Response {
	raw: any;
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

export interface SizeResponse extends Response {
	size: number;
}
