/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 * @author Christopher Chrapka <krzysztof.chrapka gamfi pl>
 */
import Storage from "../Storage";
import {StorageOptions} from "@google-cloud/storage";
import {
    BlobSASPermissions,
    BlobServiceClient,
    BlockBlobClient,
    generateBlobSASQueryParameters, RestError, StorageSharedKeyCredential
} from "@azure/storage-blob";
import {Readable, PassThrough} from "stream";
import {ContentResponse, DeleteResponse, ExistsResponse, Response, SignedUrlOptions, SignedUrlResponse} from "../types";
import {isReadableStream} from "../utils";
import {InvalidInput} from "../Exceptions/InvalidInput";
import {streamToBuffer} from "../utils/streamToBuffer";
import {AuthorizationRequired, FileNotFound, UnknownException} from "../Exceptions";

export interface AzureBlobStorageConfig extends StorageOptions {
    container: string;
    connectionString: string;
}

export class AzureBlockBlobStorage extends Storage
{
    private readonly $driver: BlobServiceClient;
    private $container: string;

    public constructor(private readonly $config: AzureBlobStorageConfig) {
        super();
        this.$driver = BlobServiceClient.fromConnectionString(this.$config.connectionString);
        this.$container = $config.container;
    }

    bucket(name: string): void {
        this.$container = name;
    }

    async copy(src: string, dest: string): Promise<Response> {
        const destBlobClient = this.blockBlobClient(dest);
        const downloadUrl = await this.getSignedUrl(src);

        try {
            return {
                raw: await destBlobClient.syncCopyFromURL(downloadUrl.signedUrl),
            };
        } catch (e) {
            throw this.convertError(e);
        }
    }

    async delete(location: string): Promise<DeleteResponse> {
        const blockBlobClient = this.blockBlobClient(location);

        try {
            return {
                raw: await blockBlobClient.delete()
            };
        } catch (e) {
            throw this.convertError(e);
        }
    }

    driver(): BlobServiceClient {
        return this.$driver;
    }

    async exists(location: string): Promise<ExistsResponse> {
        const blockBlobClient = this.blockBlobClient(location);
        try {
            const response = await blockBlobClient.exists();

            return {
                exists: response,
                raw: response,
            };
        } catch (e) {
            throw this.convertError(e);
        }
    }

    async get(location: string, encoding?: string): Promise<ContentResponse<string>> {
        const blockBlobClient = this.blockBlobClient(location);

        try {
            const downloaded = await blockBlobClient.download();
            const buffer = Buffer.alloc(downloaded.contentLength || 0);
            await streamToBuffer(downloaded.readableStreamBody as Readable, buffer, 0, buffer.length);

            return {
                raw: downloaded,
                content: buffer.toString(encoding),
            };
        } catch (e) {
            throw this.convertError(e);
        }
    }

    async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
        const blockBlobClient = this.blockBlobClient(location);

        try {
            const downloaded = await blockBlobClient.download();
            const buffer = Buffer.alloc(downloaded.contentLength || 0);
            await streamToBuffer(downloaded.readableStreamBody as Readable, buffer, 0, buffer.length);

            return {
                raw: downloaded,
                content: buffer,
            };
        } catch (e) {
            throw this.convertError(e);
        }
    }

    getStream(location: string): Readable {
        const stream = new PassThrough();

        (async (): Promise<void> => {
            try {
                const blockBlobClient = this.blockBlobClient(location);
                const downloaded = (await blockBlobClient.download()).readableStreamBody as Readable;

                downloaded.pipe(stream);
                downloaded.on('error', (e) => stream.destroy(this.convertError(e)));
            } catch (e) {
                stream.emit('error', this.convertError(e));
            }
        })();

        return stream;
    }

    async getSignedUrl(location: string, options?: SignedUrlOptions): Promise<SignedUrlResponse> {
        const expiry = options && options.expiry || 3600;
        const container = this.$container;
        const startsOn = new Date();
        const expiresOn = new Date(new Date().valueOf() + expiry * 1000);
        const client = this.blockBlobClient(location);

        const token = await generateBlobSASQueryParameters(
            {
                containerName: container,
                blobName: location,
                permissions: BlobSASPermissions.parse("r"), // Required
                startsOn, // Required
                expiresOn, // Optional
            },
            this.$driver.credential as StorageSharedKeyCredential,
        );

        return {
            signedUrl: `${client.url}?${token.toString()}`,
            raw: token,
        }
    }

    async move(src: string, dest: string): Promise<Response> {
        const srcBlobClient = this.blockBlobClient(src);
        const destBlobClient = this.blockBlobClient(dest);

        try {
            const sourceUrl = await this.getSignedUrl(src);
            const copyResponse = await destBlobClient.syncCopyFromURL(sourceUrl.signedUrl);
            const deleteResponse = await srcBlobClient.delete();

            return {
                raw: {
                    copy: copyResponse,
                    delete: deleteResponse,
                },
            };
        } catch (e) {
            throw this.convertError(e);
        }
    }


    async put(location: string, content: Buffer | Readable | string): Promise<Response> {
        const blockBlobClient = this.blockBlobClient(location);
        let contentLength = 0;
        let result: Response|null = null;

        try {
            if (Buffer.isBuffer(content) || typeof content === "string") {
                contentLength = Buffer.byteLength(content);
                result = {
                    raw: await blockBlobClient.upload(content, contentLength),
                };
            } else if (isReadableStream(content)) {
                result = {
                    raw: await blockBlobClient.uploadStream(content),
                };
            }
        } catch (e) {
            throw this.convertError(e);
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

    private blockBlobClient(location: string): BlockBlobClient {
        const containerClient = this.$driver.getContainerClient(this.$container);
        return containerClient.getBlockBlobClient(location);
    }

    private convertError(e: RestError): Error {
        const errorCode = e.response && e.response.parsedHeaders && e.response.parsedHeaders.errorCode || e.statusCode;
        const url = e.request && e.request.url || '';

        if (errorCode === 'BlobNotFound') {
            return new FileNotFound(e, url);
        } else if (errorCode === 'AuthenticationFailed') {
            return new AuthorizationRequired(e, url);
        }

        return new UnknownException(e, errorCode, url);
    }
}
