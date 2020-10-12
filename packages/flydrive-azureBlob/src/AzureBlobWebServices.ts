import {
	Storage,
	UnknownException,
	NoSuchBucket,
	FileNotFound,
	PermissionMissing,
	SignedUrlOptions,
	Response,
	ExistsResponse,
	ContentResponse,
	SignedUrlResponse,
	StatResponse,
	FileListResponse,
	DeleteResponse,
    isReadableStream,
} from '@slynova/flydrive';

import {BlobServiceClient, BlobSASSignatureValues, ContainerClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, ContainerSASPermissions} from '@azure/storage-blob'
import { Readable } from 'stream';


function handleError(err: Error, path: string): Error {
    return new UnknownException(err, err.name, path);
}

export class AzureBlobWebServicesStorage extends Storage {
    protected $client: BlobServiceClient;
    protected $containerClient: ContainerClient;
    protected $signedCredentials: StorageSharedKeyCredential;
    
    constructor(config: AzureBlobWebServicesStorageConfig) {
        super();

        this.$signedCredentials = new StorageSharedKeyCredential(config.accountName, config.accountKey);
        this.$client = new BlobServiceClient(`https://${config.accountName}.blob.core.windows.net`, this.$signedCredentials);
        this.$containerClient = this.$client.getContainerClient(config.containerName);

    } 

    /**
     * Copy a file to a location.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async copy(src: string, dest: string): Promise<Response> {
        try {
            const source = this.$containerClient.getBlockBlobClient(src);
            const target = this.$containerClient.getBlockBlobClient(dest);
    
            const poller = await target.beginCopyFromURL(source.url);
            const result = await poller.pollUntilDone();
    
            return {raw: result};
        } catch(e) {
            throw handleError(e, src);
        }

    }
    /**
     * Delete existing file.
     * The value returned by this method will have a `wasDeleted` property that
     * can be either a boolean (`true` if a file was deleted, `false` if there was
     * no file to delete) or `null` (if no information about the file is available).
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async delete(location: string): Promise<DeleteResponse> {
        try {
            const result = await this.$containerClient.getBlockBlobClient(location).deleteIfExists();
            return {raw: result, wasDeleted: result.succeeded};
        } catch(e) {
            throw handleError(e, location);
        }

    }
    /**
     * Returns the driver.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public driver(): BlobServiceClient {
        return this.$client;
    }

    /**
     * Determines if a file or folder already exists.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async exists(location: string): Promise<ExistsResponse> {
        try {
            const result = await this.$containerClient.getBlockBlobClient(location).exists();
            return {exists: result, raw: result};
        } catch(e) {
            throw handleError(e, location);
        }
    }
    /**
     * Returns the file contents as a string.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async get(location: string, encoding: BufferEncoding = 'utf-8'): Promise<ContentResponse<string>> {
        
        try {
            const bufferResult = await this.getBuffer(location);
            return {
                content: bufferResult.content.toString(encoding),
                raw: bufferResult.raw,
            };
        } catch(e) {
            throw new FileNotFound(e, location);
        }
    }
    /**
     * Returns the file contents as a Buffer.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
        try {
            const client = this.$containerClient.getBlobClient(location);
            return {content: await client.downloadToBuffer(), raw: client};
        } catch(e) {
            throw handleError(e, location);
        }
    }
    /**
     * Returns signed url for an existing file.
     *
     * Supported drivers: "s3", "gcs"
     */
    public async getSignedUrl(location: string, options: SignedUrlOptions = {}): Promise<SignedUrlResponse> {
		const { expiry = 900 } = options;
        
        try {
            const client = this.$containerClient.getBlobClient(location);
            const blobSAS = generateBlobSASQueryParameters({
                containerName: this.$containerClient.containerName,
                blobName: location,
                permissions: ContainerSASPermissions.parse("racwdl"),
                startsOn: new Date(),
                expiresOn: new Date(new Date().valueOf() + expiry)
            }, this.$signedCredentials).toString();

            const sasUrl = client.url + "?" + blobSAS;
            return {signedUrl: sasUrl, raw: client};
        } catch(e) {

            throw handleError(e, location);
        }
    }
    /**
     * Returns file's size and modification date.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async getStat(location: string): Promise<StatResponse> {
        try {
            const props = await this.$containerClient.getBlobClient(location).getProperties();
            return {
                size: props.contentLength as number,
                modified: props.lastModified as Date,
                raw: props
            };
        } catch(e) {
            throw handleError(e, location);
        }
    }
    /**
     * Returns the stream for the given file.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    // public getStream(location: string): NodeJS.ReadableStream {
    //     const stream = this.$containerClient.getBlobClient(location).download();
    //     return stream as NodeJS.ReadableStream;
    // }
    /**
     * Returns url for a given key. Note this method doesn't
     * validates the existence of file or it's visibility
     * status.
     *
     * Supported drivers: "s3", "gcs"
     */
    public getUrl(location: string): string {
        return this.$containerClient.getBlobClient(location).url
    }
    /**
     * Move file to a new location.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async move(src: string, dest: string): Promise<Response> {
        const source = this.$containerClient.getBlockBlobClient(src);
        const target = this.$containerClient.getBlockBlobClient(dest);

        const poller = await target.beginCopyFromURL(source.url);
        const result = await poller.pollUntilDone();

        await source.deleteIfExists();

        return {raw: result};
    }
    /**
     * Creates a new file.
     * This method will create missing directories on the fly.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async put(location: string, content: Buffer | NodeJS.ReadableStream | string): Promise<Response> {
        const blockBlobClient = this.$containerClient.getBlockBlobClient(location);
        try {
            if(isReadableStream(content)) {

                const result = await blockBlobClient.uploadStream(content as Readable);
                return {raw: result};
            }

            const result = await blockBlobClient.upload(content, content.length);
            return {raw: result}
        } catch(e) {
            throw handleError(e, location);
        }
    }
    /**
     * List files with a given prefix.
     *
     * Supported drivers: "local", "s3", "gcs"
     */
    public async *flatList(prefix=''): AsyncIterable<FileListResponse> {
        try {
            const blobs = await this.$containerClient.listBlobsFlat();
            
            for await(const blob of blobs) {
                yield {
                    raw: blob,
                    path: blob.name as string
                };
            }
        } catch(e) {
            throw handleError(e, prefix);
        }
    }
}

export interface AzureBlobWebServicesStorageConfig {
    containerName: string;
    accountName: string;
    accountKey: string;
}