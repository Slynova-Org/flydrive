import crypto from 'crypto';
import fs from 'fs';
import uuid from 'uuid';

import { AzureBlockBlobStorage } from "../../src/Storage/AzureBlockBlobStorage";
import { BlobServiceClient } from "@azure/storage-blob";
import { streamToString } from "../../src/utils/streamToString";
import { AuthorizationRequired } from "../../src/Exceptions";
import { cleanPrefixedFiles, runGenericStorageSpec } from "../stubs/storage.generic";
import { unicodeTestString } from '../stubs/assets';

const container = process.env.AZURE_TEST_CONTAINER as string;
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_TEST_CONNECTION_STRING as string);
const containerClient = blobServiceClient.getContainerClient(container);

const storage: AzureBlockBlobStorage = AzureBlockBlobStorage.fromConfig({
    connectionString: process.env.AZURE_TEST_CONNECTION_STRING as string,
    container,
});

describe('Azure Block Blob Storage Driver', () => {
    let pathPrefix = '';
    beforeEach(() => {
        pathPrefix = uuid.v4();
    });
    afterEach(() => cleanPrefixedFiles(storage, pathPrefix));

    describe('.copy', () => {
        test('copies file contents', async () => {
            // setup
            const srcPath = `${pathPrefix}/source-file`;
            const targetPath = `${pathPrefix}/target-file`;
            const srcBuffer = Buffer.from('Zwölf große Boxkämpfer jagen Viktor quer über den Sylter Deich. 돌솥 비빔밥');
            const blockBlobClient = containerClient.getBlockBlobClient(srcPath);
            await blockBlobClient.upload(srcBuffer, srcBuffer.length);

            // test
            await storage.copy(srcPath, targetPath);

            // check
            const targetBuffer = Buffer.alloc(srcBuffer.length);
            const newSourceBuffer = Buffer.alloc(srcBuffer.length);

            await containerClient.getBlockBlobClient(targetPath).downloadToBuffer(targetBuffer);
            await containerClient.getBlockBlobClient(srcPath).downloadToBuffer(newSourceBuffer);
            expect(srcBuffer.equals(targetBuffer)).toBeTruthy();
            expect(srcBuffer.equals(newSourceBuffer)).toBeTruthy();
        });
    });

    describe('.delete', () => {
        test('deletes file from storage', async () => {
            // setup
            const targetPath = `${pathPrefix}/source-file`;
            const targetBuffer = Buffer.from('asdasd');
            const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
            await blockBlobClient.upload(targetBuffer, targetBuffer.length);

            // test
            await storage.delete(targetPath);

            // check
            expect(await containerClient.getBlockBlobClient(targetPath).exists()).toBeFalsy();
        });
    });

    describe('.exists', () => {
        test('returns true if file exists', async () => {
            // setup
            const existingPath = `${pathPrefix}/existing-file`;
            const targetBuffer = Buffer.from('asdasd');
            const blockBlobClient = containerClient.getBlockBlobClient(existingPath);
            await blockBlobClient.upload(targetBuffer, targetBuffer.length);

            // test
            expect(await containerClient.getBlockBlobClient(existingPath).exists()).toBeTruthy();
        });

        test('returns false if file does not exist', async () => {
            // setup
            const nonExistingPath = `${pathPrefix}/non-existing-file`;

            // test
            expect(await containerClient.getBlockBlobClient(nonExistingPath).exists()).toBeFalsy();
        });

        test('throws AuthorizationRequired error if account key is invalid', async () => {
            // setup
            const realAccountName = (process.env.AZURE_TEST_CONNECTION_STRING as string).match(/(?<=AccountName=)\w+/);
            const fakeStorage = AzureBlockBlobStorage.fromConfig({
                connectionString: `DefaultEndpointsProtocol=https;AccountName=${realAccountName};AccountKey=absolutelyNotAValidAccountKey;EndpointSuffix=core.windows.net`,
                container,
            });

            await expect(fakeStorage.exists('/non-existant-file')).rejects.toThrowError(AuthorizationRequired);
        });
    });

    describe('.getBuffer', () => {
        test('gets valid file content', async () => {
            // setup
            const targetPath = `${pathPrefix}/uploaded-file`;
            const targetBuffer = Buffer.from(unicodeTestString);
            const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
            await blockBlobClient.upload(targetBuffer, targetBuffer.length);

            // check
            expect((await storage.getBuffer(targetPath)).content.toString('utf-8')).toStrictEqual(unicodeTestString);
        });
    });

    describe('.getStream', () => {
        test('gets valid file content', async () => {
            // setup
            const targetPath = `${pathPrefix}/uploaded-file`;
            const targetBuffer = Buffer.from(unicodeTestString);
            const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
            await blockBlobClient.upload(targetBuffer, targetBuffer.length);

            // check
            const stream = storage.getStream(targetPath);

            expect(await streamToString(stream)).toStrictEqual(unicodeTestString);
        });
    });

    describe('.move', () => {
        test('moves valid file content', async () => {
            // setup
            const srcPath = `${pathPrefix}/source-file`;
            const targetPath = `${pathPrefix}/target-file`;
            const srcBuffer = Buffer.from('Zwölf große Boxkämpfer jagen Viktor quer über den Sylter Deich. 돌솥 비빔밥');
            const blockBlobClient = containerClient.getBlockBlobClient(srcPath);
            await blockBlobClient.upload(srcBuffer, srcBuffer.length);

            // test
            await storage.move(srcPath, targetPath);

            // check
            const targetBuffer = Buffer.alloc(srcBuffer.length);
            await containerClient.getBlockBlobClient(targetPath).downloadToBuffer(targetBuffer);
            expect(srcBuffer.equals(targetBuffer)).toBeTruthy();
        });

        test('leaves no source file behind', async () => {
            // setup
            const srcPath = `${pathPrefix}/source-file`;
            const targetPath = `${pathPrefix}/target-file`;
            const srcBuffer = Buffer.from('Zwölf große Boxkämpfer jagen Viktor quer über den Sylter Deich. 돌솥 비빔밥');
            const blockBlobClient = containerClient.getBlockBlobClient(srcPath);
            await blockBlobClient.upload(srcBuffer, srcBuffer.length);

            // test
            await storage.move(srcPath, targetPath);

            // check
            expect(await blockBlobClient.exists()).toBeFalsy();
        });
    });


    describe('.put', () => {
        test('puts valid file content from string', async () => {
            // setup
            const testPath = `${pathPrefix}/string-file`;

            // test
            await storage.put(testPath, unicodeTestString);

            // check
            const resultBuffer = Buffer.alloc(Buffer.byteLength(unicodeTestString));
            await containerClient.getBlockBlobClient(testPath).downloadToBuffer(resultBuffer);
            expect(resultBuffer.toString('utf-8')).toStrictEqual(unicodeTestString);
        });

        test('puts valid file content from 4KiB buffer', async () => {
            // setup
            const testPath = `${pathPrefix}/buffer-file`;
            const testBuffer = crypto.pseudoRandomBytes(4 * 1024);

            // test
            await storage.put(testPath, testBuffer);

            // check
            const resultBuffer = Buffer.alloc(testBuffer.byteLength);
            await containerClient.getBlockBlobClient(testPath).downloadToBuffer(resultBuffer);
            expect(testBuffer.equals(resultBuffer)).toBeTruthy();
        });

        test('puts valid file content from 4KiB stream', async () => {
            // setup
            const testPath = `${pathPrefix}/stream-file`;
            const inputHash = crypto.createHash('sha1');
            const downloadedHash = crypto.createHash('sha1');
            const testSize = 4 * 1024;
            const testStream = fs.createReadStream('/dev/urandom', {end: testSize - 1});
            testStream.on('data', (d) => inputHash.update(d));
            // test
            await storage.put(testPath, testStream);

            // check
            const resultBuffer = Buffer.alloc(testSize);
            await containerClient.getBlockBlobClient(testPath).downloadToBuffer(resultBuffer);

            downloadedHash.update(resultBuffer);
            expect(downloadedHash.digest().toString()).toStrictEqual(inputHash.digest().toString());
        });
    });
});

runGenericStorageSpec({storage, name: "Azure Block Blob Storage Driver"});
