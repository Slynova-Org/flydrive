import crypto from 'crypto';
import test from 'japa';
import fs from 'fs';
import fetch from 'node-fetch';
import uuid from 'uuid';

import {AzureBlockBlobStorage} from "../../src/Drivers/AzureBlockBlobStorage";
import {InvalidInput} from "../../src/Exceptions/InvalidInput";
import {BlobServiceClient} from "@azure/storage-blob";
import {streamToString} from "../../src/utils/streamToString";
import {AuthorizationRequired, FileNotFound} from "../../src/Exceptions";

const container = `flysystem-test-${(new Date()).toISOString().replace(/[:\.]/g,'-').toLowerCase()}`;
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_TEST_CONNECTION_STRING as string);
const containerClient = blobServiceClient.getContainerClient(container);

const storage: AzureBlockBlobStorage = new AzureBlockBlobStorage({
    connectionString: process.env.AZURE_TEST_CONNECTION_STRING as string,
    container,
});

const unicodeTestString = `test string.
Zwölf große Boxkämpfer jagen Viktor quer über den Sylter Deich.
Pchnąć w tę łódź jeża lub ośm skrzyń fig.
돌솥 비빔밥
דג סקרן שט בים מאוכזב ולפתע מצא חברה
Jámbor célú, öv ügyű ex-qwan ki dó-s főz, puhít.
😹️🤑️🥉️
a̵͕̟̓̈́s̶̯̯̀d̷͝ͅ`;

test.group('Azure Block Blob Storage Driver', (group) => {
    let pathPrefix = '';
    // japa does not have nested groups or anything like that, while still having working triggers
    // so everything is in a big nice group
    group.before(async (): Promise<void> => {
        await blobServiceClient.createContainer(container);
    });

    group.after(async (): Promise<void> => {
        await blobServiceClient.deleteContainer(container);
    });

    group.beforeEach(() => {
        pathPrefix = uuid.v4();
    });

    // ################
    // # copy         #
    // ################
    test('copy', async (assert) => {
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
        assert.isTrue(srcBuffer.equals(targetBuffer));
        assert.isTrue(srcBuffer.equals(newSourceBuffer));
    });

    // ################
    // # delete       #
    // ################
    test('delete', async (assert) => {
        // setup
        const targetPath = `${pathPrefix}/source-file`;
        const targetBuffer = Buffer.from('asdasd');
        const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
        await blockBlobClient.upload(targetBuffer, targetBuffer.length);

        // test
        await storage.delete(targetPath);

        // check
        const exists = await containerClient.getBlockBlobClient(targetPath).exists();
        assert.isNotTrue(exists);
    });

    // ################
    // # driver       #
    // ################
    test('driver', async(assert) => {
        assert.instanceOf(storage.driver(), BlobServiceClient);
    });

    // ################
    // # exists       #
    // ################
    test('exists', async (assert) => {
        // setup
        const existingPath = `${pathPrefix}/existing-file`;
        const nonExistingPath = `${pathPrefix}/non-existing-file`;
        const targetBuffer = Buffer.from('asdasd');
        const blockBlobClient = containerClient.getBlockBlobClient(existingPath);

        // test
        await blockBlobClient.upload(targetBuffer, targetBuffer.length);

        // check
        assert.isTrue(await containerClient.getBlockBlobClient(existingPath).exists());
        assert.isNotTrue(await containerClient.getBlockBlobClient(nonExistingPath).exists());
    });

    test('exists - 403', async (assert) => {
        // setup
        const realAccountName = (process.env.AZURE_TEST_CONNECTION_STRING as string).match(/(?<=AccountName=)\w+/);
        const fakeStorage: AzureBlockBlobStorage = new AzureBlockBlobStorage({
            connectionString: `DefaultEndpointsProtocol=https;AccountName=${realAccountName};AccountKey=absolutelyNotAValidAccountKey;EndpointSuffix=core.windows.net`,
            container,
        });

        assert.plan(1);

        try {
            // test
            await fakeStorage.exists('/non-existant-file');
        } catch (e) {
            // check
            assert.instanceOf(e, AuthorizationRequired);
        }
    });

    // ################
    // # get          #
    // ################
    test('get', async (assert) => {
        // setup
        const targetPath = `${pathPrefix}/uploaded-file`;
        const targetBuffer = Buffer.from(unicodeTestString);
        const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
        await blockBlobClient.upload(targetBuffer, targetBuffer.length);

        // check
        assert.equal((await storage.get(targetPath, 'utf-8')).content, unicodeTestString);
    });

    // ################
    // # getBuffer    #
    // ################
    test('getBuffer', async (assert) => {
        // setup
        const targetPath = `${pathPrefix}/uploaded-file`;
        const targetBuffer = Buffer.from(unicodeTestString);
        const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
        await blockBlobClient.upload(targetBuffer, targetBuffer.length);

        // check
        assert.equal((await storage.getBuffer(targetPath)).content.toString('utf-8'), unicodeTestString);
    });

    // ################
    // # getStream    #
    // ################
    test('getStream', async (assert) => {
        // setup
        const targetPath = `${pathPrefix}/uploaded-file`;
        const targetBuffer = Buffer.from(unicodeTestString);
        const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
        await blockBlobClient.upload(targetBuffer, targetBuffer.length);

        // check
        const stream = storage.getStream(targetPath);
        const response = await streamToString(stream);

        assert.equal(response, unicodeTestString);
    });

    test('getStream - 404', async (assert) => {
        // setup
        const targetPath = `${pathPrefix}/non-existent-file`;

        // check
        assert.plan(1);
        try {
            const stream = storage.getStream(targetPath);
            await streamToString(stream);
        } catch (e) {
            assert.instanceOf(e, FileNotFound);
        }
    });

    // ################
    // # getSignedUrl #
    // ################
    test('getSignedUrl', async (assert) => {
        // setup
        const srcPath = `${pathPrefix}/source-file`;
        const srcBuffer = Buffer.from('Zwölf große Boxkämpfer jagen Viktor quer über den Sylter Deich. 돌솥 비빔밥');
        const blockBlobClient = containerClient.getBlockBlobClient(srcPath);
        await blockBlobClient.upload(srcBuffer, srcBuffer.length);

        // test
        const url = (await storage.getSignedUrl(srcPath)).signedUrl;

        // check
        const targetBuffer = await ((await fetch(url)).buffer());
        assert.isTrue(srcBuffer.equals(targetBuffer));

    });

    // ################
    // # move         #
    // ################
    test('move', async (assert) => {
        // setup
        const srcPath = `${pathPrefix}/source-file`;
        const targetPath = `${pathPrefix}/target-file`;
        const srcBuffer = Buffer.from('Zwölf große Boxkämpfer jagen Viktor quer über den Sylter Deich. 돌솥 비빔밥');
        const blockBlobClient = containerClient.getBlockBlobClient(srcPath);
        await blockBlobClient.upload(srcBuffer, srcBuffer.length);

        // test
        await storage.move(srcPath, targetPath);

        // check
        assert.plan(2);
        const targetBuffer = Buffer.alloc(srcBuffer.length);
        const newSourceBuffer = Buffer.alloc(srcBuffer.length);

        await containerClient.getBlockBlobClient(targetPath).downloadToBuffer(targetBuffer);
        assert.isTrue(srcBuffer.equals(targetBuffer));

        try {
            await containerClient.getBlockBlobClient(srcPath).downloadToBuffer(newSourceBuffer);
        } catch (e) {
            assert.equal(e.response.parsedHeaders.errorCode, 'BlobNotFound')
        }
    });

    // ################
    // # put         #
    // ################
    test('put(:string)', async(assert) => {
        // setup
        const testPath = `${pathPrefix}/string-file`;

        // test
        await storage.put(testPath, unicodeTestString);

        // check
        const resultBuffer = Buffer.alloc(Buffer.byteLength(unicodeTestString));
        await containerClient.getBlockBlobClient(testPath).downloadToBuffer(resultBuffer);
        assert.strictEqual(resultBuffer.toString('utf-8'), unicodeTestString);
    });

    test('put(:buffer)', async(assert) => {
        // setup
        const testPath = `${pathPrefix}/buffer-file`;
        const testBuffer = crypto.pseudoRandomBytes(4 * 1024);

        // test
        await storage.put(testPath, testBuffer);

        // check
        const resultBuffer = Buffer.alloc(testBuffer.byteLength);
        await containerClient.getBlockBlobClient(testPath).downloadToBuffer(resultBuffer);
        assert.isTrue(testBuffer.equals(resultBuffer));
    });

    test('put(:stream)', async(assert) => {
        // setup
        const testPath = `${pathPrefix}/stream-file`;
        const inputHash = crypto.createHash('sha1');
        const downloadedHash = crypto.createHash('sha1');
        const testSize = 4 * 1024;
        const testStream = fs.createReadStream('/dev/urandom', {end: testSize-1});
        testStream.on('data', (d) => inputHash.update(d));
        // test
        await storage.put(testPath, testStream);

        // check
        const resultBuffer = Buffer.alloc(testSize);
        await containerClient.getBlockBlobClient(testPath).downloadToBuffer(resultBuffer);

        downloadedHash.update(resultBuffer);
        assert.strictEqual(downloadedHash.digest().toString(), inputHash.digest().toString());
    });

    test('put(:unknown) - fail',  async (assert) => {
        // setup
        assert.plan(1);

        try {
            // test
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await storage.put(`failed-file`, {} as any);
        } catch (e) {
            // check
            assert.instanceOf(e, InvalidInput);
        }
    });
});
