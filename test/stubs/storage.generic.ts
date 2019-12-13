import crypto from "crypto";
import fetch from "node-fetch";
import randomStream from "random-bytes-readable-stream";
import uuid from "uuid";

import { unicodeTestString } from './assets';
import { Storage } from "../../src/Storage/Storage";
import { InvalidInput } from "../../src/Exceptions/InvalidInput";
import { PropertiesResponse, PutOptions } from "../../src";
import { streamToString } from "../../src/utils/streamToString";

type testSpec = {
    name: string,
    storage: Storage,
    skip?: Array<'getUrl'|'getSignedUrl'>,
}

export async function cleanPrefixedFiles(storage: Storage, prefix: string): Promise<void> {
    const deletePromises: Array<Promise<any>> = [];

    for await (const file of storage.flatList(prefix)) {
        deletePromises.push(storage.delete(file.path));
    }

    await Promise.all(deletePromises);
}

export function runGenericStorageSpec({name, storage, skip}: testSpec) {
    function checkProperties(properties: PropertiesResponse, uploadOptions: PutOptions): void {
        expect(properties.contentType).toStrictEqual(uploadOptions.contentType);
        expect(properties.contentLanguage).toStrictEqual(uploadOptions.contentLanguage);

        for(const key in uploadOptions.metadata) {
            if (uploadOptions.metadata.hasOwnProperty(key)) {
                expect(properties.metadata![key]).toStrictEqual(uploadOptions.metadata[key]);
            }
        }
    }

    const pathPrefix = uuid.v4() + '/';
    const randomFilePath = (): string => `${pathPrefix}${uuid.v4()}`;

    const skipable = (feature: 'getUrl'|'getSignedUrl', func: () => void): void => {
        if (!skip || skip.indexOf(feature) === -1) {
            func();
        }
    };

    describe(name, () => {
        afterEach(() => cleanPrefixedFiles(storage, pathPrefix));

        describe('.copy', () => {
            test('copies file contents (checked with .put and .getBuffer)', async () => {
                // setup
                const srcPath = randomFilePath();
                const targetPath = randomFilePath();
                const srcBuffer = Buffer.from(unicodeTestString);
                await storage.put(srcPath, srcBuffer);

                // test
                await storage.copy(srcPath, targetPath);

                // check
                const targetBuffer = (await storage.getBuffer(targetPath)).content;
                expect(srcBuffer.equals(targetBuffer)).toBeTruthy();
            });

            test('leaves old file intact (checked with .put and .getBuffer)', async () => {
                // setup
                const srcPath = randomFilePath();
                const targetPath = randomFilePath();
                const srcBuffer = Buffer.from(unicodeTestString);
                await storage.put(srcPath, srcBuffer);

                // test
                await storage.copy(srcPath, targetPath);

                // check
                const newSourceBuffer = (await storage.getBuffer(srcPath)).content;
                expect(srcBuffer.equals(newSourceBuffer)).toBeTruthy();
            });

            test('copies file properties (checked with .put and .getProperties)', async () => {
                // setup
                const srcPath = randomFilePath();
                const targetPath = randomFilePath();
                const srcBuffer = Buffer.from(unicodeTestString);
                const uploadOptions = {
                    contentType: 'image/jpeg',
                    contentLanguage: 'kr',
                    metadata: {
                        foo: 'foo',
                        fooBar: 'fooBar',
                    },
                };
                await storage.put(srcPath, srcBuffer, uploadOptions);

                // test
                await storage.copy(srcPath, targetPath);

                // check
                const targetProperty = await storage.getProperties(targetPath);
                checkProperties(targetProperty, uploadOptions);
            });
        });

        describe('.delete', () => {
            test('deletes file from storage (set-up with .put, checked with .exists)', async () => {
                // setup
                const targetPath = randomFilePath();
                const targetBuffer = Buffer.from('asdasd');
                await storage.put(targetPath, targetBuffer);

                // test
                await storage.delete(targetPath);

                // check
                expect((await storage.exists(targetPath)).exists).toStrictEqual(false);
            });

            test('silently ignores not existing files', async () => {
                // setup
                const targetPath = randomFilePath();

                // test
                await storage.delete(targetPath);
            });
        });

        describe(".exists", () => {
           test("returns false when file does not exist", async () => {
               expect((await storage.exists(randomFilePath())).exists).toStrictEqual(false);
           });

            test("returns true when empty file does exist", async () => {
                const path = randomFilePath();
                await storage.put(path, '');
                expect((await storage.exists(path)).exists).toStrictEqual(true);
            });
        });

        describe('.getBuffer', () => {
            test('gets valid file content (set-up with .put)', async () => {
                // setup
                const targetPath = randomFilePath();
                const targetBuffer = Buffer.from(unicodeTestString);
                await storage.put(targetPath, targetBuffer);

                // check
                expect((await storage.getBuffer(targetPath)).content.toString('utf-8')).toStrictEqual(unicodeTestString);
            });

            test('gets valid properties (set-up with .put)', async () => {
                // setup
                const uploadOptions = {
                    contentType: 'image/jpeg',
                    contentLanguage: 'kr',
                    metadata: {
                        foo: 'foo',
                        fooBar: 'fooBar',
                    },
                };
                const targetPath = randomFilePath();
                const targetBuffer = Buffer.from(unicodeTestString);
                await storage.put(targetPath, targetBuffer, uploadOptions);

                // check
                checkProperties((await storage.getBuffer(targetPath)).properties, uploadOptions);
            });
        });

        describe('.getProperties', () => {
            test('gets valid properties (set-up with .put)', async () => {
                // setup
                const uploadOptions = {
                    contentType: 'image/jpeg',
                    contentLanguage: 'kr',
                    metadata: {
                        foo: 'foo',
                        fooBar: 'fooBar',
                    },
                };
                const targetPath = randomFilePath();
                const targetBuffer = Buffer.from(unicodeTestString);
                await storage.put(targetPath, targetBuffer, uploadOptions);

                // check
                checkProperties((await storage.getProperties(targetPath)), uploadOptions);
            });
        });

        describe('.getStream', () => {
            test('gets valid file content (set-up with .put)', async () => {
                // setup
                const targetPath = randomFilePath();
                const targetBuffer = Buffer.from(unicodeTestString);
                await storage.put(targetPath, targetBuffer);

                // check
                const stream = storage.getStream(targetPath);

                expect(await streamToString(stream)).toStrictEqual(unicodeTestString);
            });
        });

        describe('.flatList', () => {
            test('get a flat list of files with directory-like prefix', async () => {
                const paths = [
                    randomFilePath(),
                    randomFilePath(),
                    `${randomFilePath()}/${uuid.v4()}`,
                    `${randomFilePath()}/${uuid.v4()}`,
                    `${randomFilePath()}/${uuid.v4()}/${uuid.v4()}`,
                    `${randomFilePath()}/${uuid.v4()}/${uuid.v4()}`,
                ];

                await Promise.all(paths.map((path) => storage.put(path, '')));

                const downloadedPaths: string[] = [];

                for await (const file of storage.flatList(pathPrefix)) {
                    downloadedPaths.push(file.path);
                }

                downloadedPaths.sort();
                paths.sort();

                downloadedPaths.forEach((v, i) => {
                    expect(v).toStrictEqual(paths[i]);
                });
            });

            test('get a flat list of files with name prefix', async () => {
                const prefix = uuid.v4();

                // use pathPrefix, so that files are cleaned up after the test
                const paths = [
                    `${pathPrefix}${uuid.v4()}`,
                    `${pathPrefix}${uuid.v4()}`,
                    `${pathPrefix}${prefix}-${uuid.v4()}`,
                    `${pathPrefix}${prefix}-${uuid.v4()}`,
                ];

                await Promise.all(paths.map((path) => storage.put(path, '')));

                const downloadedPaths: string[] = [];

                for await (const file of storage.flatList(`${pathPrefix}${prefix}`)) {
                    downloadedPaths.push(file.path);
                }

                downloadedPaths.sort();
                const expectedPaths = paths.filter((p) => p.startsWith(`${pathPrefix}${prefix}`)).sort();

                downloadedPaths.forEach((v, i) => {
                    expect(v).toStrictEqual(expectedPaths[i]);
                });
            });

            test('get file metadata', async () => {
                const path = randomFilePath();
                const uploadOptions = {
                    contentType: 'image/jpeg',
                    contentLanguage: 'kr',
                    metadata: {
                        foo: 'foo',
                        fooBar: 'fooBar',
                    },
                };

                await storage.put(path, Buffer.from([]), uploadOptions);
                let counter = 0;

                for await (const file of storage.flatList(pathPrefix)) {
                    checkProperties(file.properties, uploadOptions);
                    ++counter;
                }

                expect(counter).toStrictEqual(1);
            });
        });

        skipable("getUrl", () => {
            // test('getUrl');
        });

        skipable("getSignedUrl", () => {
            describe(".getSignedUrl", () => {
                test('returns a downloadable link to file with a read-signed url', async () => {
                    // setup
                    const srcPath = randomFilePath();
                    const srcBuffer = Buffer.from(unicodeTestString);
                    await storage.put(srcPath, srcBuffer, {contentType: 'plain/text; charset=utf-8'});

                    // test
                    const url = (await storage.getSignedUrl(srcPath)).signedUrl;

                    // check
                    const targetBuffer = await ((await fetch(url)).buffer());
                    expect(srcBuffer.equals(targetBuffer)).toBeTruthy();
                })
            });
        });

        describe('.move', () => {
            test('moves file contents (checked with .put and .getBuffer)', async () => {
                // setup
                const srcPath = randomFilePath();
                const targetPath = randomFilePath();
                const srcBuffer = Buffer.from(unicodeTestString);
                await storage.put(srcPath, srcBuffer);

                // test
                await storage.move(srcPath, targetPath);

                // check
                const targetBuffer = (await storage.getBuffer(targetPath)).content;
                expect(srcBuffer.equals(targetBuffer)).toBeTruthy();
            });

            test('deletes old file (checked with .put and .exists)', async () => {
                // setup
                const srcPath = randomFilePath();
                const targetPath = randomFilePath();
                const srcBuffer = Buffer.from(unicodeTestString);
                await storage.put(srcPath, srcBuffer);

                // test
                await storage.move(srcPath, targetPath);

                // check
                expect((await storage.exists(srcPath)).exists).toStrictEqual(false);
            });

            test('copies file properties (checked with .put and .getProperties)', async () => {
                // setup
                const srcPath = randomFilePath();
                const targetPath = randomFilePath();
                const srcBuffer = Buffer.from(unicodeTestString);
                const uploadOptions = {
                    contentType: 'image/jpeg',
                    contentLanguage: 'kr',
                    metadata: {
                        foo: 'foo',
                        fooBar: 'fooBar',
                    },
                };
                await storage.put(srcPath, srcBuffer, uploadOptions);

                // test
                await storage.move(srcPath, targetPath);

                // check
                const targetProperty = await storage.getProperties(targetPath);
                checkProperties(targetProperty, uploadOptions);
            });
        });

        describe(".put", () => {
            test("puts 1MiB stream with unmangled content (checked with .getBuffer)", async () => {
                const file = randomFilePath();
                const uploadHash = crypto.createHash('sha1');
                const downloadHash = crypto.createHash('sha1');
                const stream = randomStream({size: 1024*1024});
                stream.on('data', (d) => uploadHash.update(d));
                await storage.put(file, stream);

                const download = await storage.getBuffer(file);
                downloadHash.update(download.content);

                expect(downloadHash.digest().toString('hex')).toStrictEqual(uploadHash.digest().toString('hex'));
            });

            test("puts 1 KiB buffer with unmangled content (checked with .getBuffer)", async () => {
                const filePath = randomFilePath();
                const uploadBuffer = crypto.pseudoRandomBytes(1024);
                await storage.put(filePath, uploadBuffer);

                const downloadBuffer = (await storage.getBuffer(filePath)).content;

                expect(uploadBuffer.equals(downloadBuffer)).toBeTruthy();
            });

            test("puts buffer with unmangled properties (checked with .getProperties)", async () => {
                const filePath = randomFilePath();
                const uploadOptions = {
                    contentType: 'image/jpeg',
                    contentLanguage: 'fr',
                    metadata: {
                        foo: 'foo',
                        fooBar: 'fooBar',
                    }
                };
                const uploadBuffer = crypto.pseudoRandomBytes(1024);
                await storage.put(
                    filePath,
                    uploadBuffer,
                    uploadOptions,
                );

                const downloadProperties = await storage.getProperties(filePath);
                checkProperties(downloadProperties, uploadOptions);
            });

            test("puts stream with unmangled properties (checked with .getProperties)", async () => {
                const filePath = randomFilePath();
                const uploadOptions = {
                    contentType: 'image/jpeg',
                    contentLanguage: 'fr',
                    metadata: {
                        foo: 'foo',
                        fooBar: 'fooBar',
                    }
                };
                const uploadStream = randomStream({size: 1024});
                await storage.put(
                    filePath,
                    uploadStream,
                    uploadOptions,
                );

                const downloadProperties = await storage.getProperties(filePath);
                checkProperties(downloadProperties, uploadOptions);
            });

            test('rejects with InvalidInput if upload is not a valid upload type',  async () => {
                // setup
                await expect(storage.put(`${pathPrefix}/failed-file`, {} as any)).rejects.toThrowError(InvalidInput);
            });

            test("rejects 'foo-bar' as invalid metadata key", async () => {
                const filePath = randomFilePath();
                const uploadOptions = {
                    metadata: {
                        'foo-bar': 'foo-bar',
                    }
                };
                const uploadBuffer = crypto.pseudoRandomBytes(10);

                await expect(storage.put(
                    filePath,
                    uploadBuffer,
                    uploadOptions,
                )).rejects.toThrowError(InvalidInput);
            });

            test("rejects 'Foobar' as invalid metadata key", async () => {
                const filePath = randomFilePath();
                const uploadOptions = {
                    metadata: {
                        Foobar: 'Foobar',
                    }
                };
                const uploadBuffer = crypto.pseudoRandomBytes(10);

                await expect(storage.put(
                    filePath,
                    uploadBuffer,
                    uploadOptions,
                )).rejects.toThrowError(InvalidInput);
            });
        });
    });
}
