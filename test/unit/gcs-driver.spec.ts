import uuid from 'uuid/v4';

import { GoogleCloudStorage } from '../../src/Storage/GoogleCloudStorage';
import { runGenericStorageSpec } from "../stubs/storage.generic";

const testBucket = process.env.GCS_BUCKET || 'flydrive-test';
const storage = GoogleCloudStorage.fromConfig({
	...(process.env.GCS_KEYFILENAME && { keyFilename: process.env.GCS_KEYFILENAME }),
	...(process.env.GCS_KEY && { credentials: JSON.parse(process.env.GCS_KEY) }),
	bucket: testBucket,
});

runGenericStorageSpec({
	name: 'Google Cloud Storage',
	storage,
	skip: [],
});

describe('Google Cloud Storage', () => {
	describe('.getUrl', () => {
		test('returned url matches expected url template', () => {
			const path = uuid.v4();
			const url = storage.getUrl(path);
			expect(url).toStrictEqual(`https://storage.cloud.google.com/${testBucket}/${path}`);
		});
	});
});
