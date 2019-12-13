/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */
import path from 'path';

import { LocalStorage } from "../../src/Storage/LocalStorage";
import { runGenericStorageSpec } from "../stubs/storage.generic";
import { MethodNotSupported } from "../../src/Exceptions";

const storage = new LocalStorage({ root: path.join(__dirname, '../../var/local-storage') });

runGenericStorageSpec({
    storage,
    name: 'Local filesystem storage',
    skip: ['getUrl', 'getSignedUrl'],
});

describe('Local filesystem storage', function () {
    describe('.getUrl', function () {
        expect(() => storage.getUrl('anything')).toThrowError(MethodNotSupported);
    });

    describe('.getSignedUrl', function () {
        expect(() => storage.getSignedUrl('anything')).toThrowError(MethodNotSupported);
    });
});
