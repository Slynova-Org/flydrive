<p align="center">
  <img src="https://user-images.githubusercontent.com/2793951/54391096-418f4500-46a4-11e9-8d0c-b00ff7ba4198.png" alt="flydrive">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@slynova/flydrive"><img src="https://img.shields.io/npm/dm/@slynova/flydrive.svg?style=flat-square" alt="Download"></a>
  <a href="https://www.npmjs.com/package/@slynova/flydrive"><img src="https://img.shields.io/npm/v/@slynova/flydrive.svg?style=flat-square" alt="Version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@slynova/flydrive.svg?style=flat-square" alt="License"></a>
</p>

`flydrive` is a framework-agnostic package which provides a powerful wrapper to manage file Storage in [Node.js](https://nodejs.org).

There are currently 4 storage drivers available:

- `'local'`: Stores files on the local file system.
- `'s3'`: Amazon S3 and other compatible services
  - You need to install the `aws-sdk` package to be able to use this driver.
  - This driver is compatible with DigitalOcean Spaces and Scaleway Object Storage.
- `'gcs'`: Google Cloud Storage
  - You need to install the `@google-cloud/storage` package to be able to use this driver.
- `'azureBlob'`: Azure Block Blob Storage
  - You need to install the `@azure/storage-blob` package to be able to use this driver.

---

## Getting Started

This package is available in the npm registry.
It can easily be installed with `npm` or `yarn`.

```bash
$ npm i @slynova/flydrive
# or
$ yarn add @slynova/flydrive
```

When you require the package in your file, it will give you access to the `StorageManager` class.
This class is a facade for the package and should be instantiated with a [configuration object](https://github.com/Slynova-Org/flydrive/blob/master/test/stubs/config.ts).

```javascript
const { StorageManager } = require('@slynova/flydrive');
const config = {
    default: 'awsCloud',
    disks: {
		awsCloud: {
			driver: 's3',
			key: 'AWS_S3_KEY',
			secret: 'AWS_S3_SECRET',
			region: 'AWS_S3_REGION',
			bucket: 'AWS_S3_BUCKET',
		},
    },
};
const storageManager = new StorageManager(config);
```

Once you instantiated the manager, you can use the `StorageManager#disk()` method to retrieve a disk an use it.

```javascript
storageManager.disk(); // Returns the default disk (specified in the config)
storageManager.disk('awsCloud'); // Returns the driver for the disk "s3"
```

## Storages' API

You can access storage classes directly, by importing them from `@slynova/flydrive`

```javascript
const S3 = require("aws-sdk/clients/s3");
const { AmazonWebServicesS3Storage } = require('@slynova/flydrive');
const s3 = new S3(/* ... */);
const storage = new AmazonWebServicesS3Storage(s3, 'bucket');
```

Each storage extends the abstract class [`Storage`](https://github.com/Slynova-Org/flydrive/blob/master/src/Storage.ts).

The following method doesn't exist on the `LocalStorage` storage, therefore, it will throw an exception.

```javascript
// throws "E_METHOD_NOT_SUPPORTED: Method getSignedUrl is not supported for the driver LocalFileSystem"
storage.getSignedUrl();
```

### Response interface

Asynchronous methods will always return a Promise which resolves with a `Response`
object. The response object may contain relevant data in its properties (for
example, the `ExistsResponse` object for the `exists` method contains a boolean
`exists` property).

All responses additionally have a `raw` property which is driver-specific and
contains the result from the original call made by the driver.

### Exceptions

In case of runtime errors, `flydrive` will try to throw driver-agnostic exceptions.  
Exceptions also have a `raw` property which contains the original error.

### Methods

<details>
<summary markdown="span"><code>copy(src: string, dest: string): Promise&lt;Response&gt;</code></summary>

This method will copy a file within same storage and bucket to another location.

```javascript
await storage.copy('foo.txt', 'bar.txt');
// foo.txt was copied to bar.txt
```

</details>

<details>
<summary markdown="span"><code>delete(location: string): Promise&lt;Response&gt;</code></summary>

This method will delete the file at the given location.

```javascript
await storage.delete('foo.txt');
// foo.txt has been deleted
```

</details>

<details>
<summary markdown="span"><code>exists(location: string): Promise&lt;ExistsResponse&gt;</code></summary>

This method will determine if a file exists at the given location.

```javascript
const { exists } = await storage.exists('foo.txt');
// exists is true or false
```

</details>

<details>
<summary markdown="span"><code>flatList(prefix: string): AsyncIterable&lt;FileListResponse&gt;</code></summary>

This method will return a complete list of files whose path starts with the prefix.

```javascript
for await (const file of storage.disk().flatList('prefix/')) {
    console.log(`foobar of ${file.path}: ${file.metadata.foobar}');
}
```

</details>

<details>
<summary markdown="span"><code>getBuffer(location: string): Promise&lt;ContentResponse&lt;Buffer&gt;&gt;</code></summary>

This method will return the file's content as a Buffer for the given location.

```javascript
const { content, properties } = await storage.getBuffer('foo.txt');
```

</details>

<details>
<summary markdown="span"><code>getSignedUrl(location: string, options: SignedUrlOptions = { expiry: 900 }): Promise&lt;SignedUrlResponse&gt;</code></summary>

This method will return the signed url for an existing file.

```javascript

const { signedUrl } = await storage.getSignedUrl('foo.txt');
```
</details>

<details>
<summary markdown="span"><code>getProperties(location: string): Promise&lt;PropertiesResponse&gt;</code></summary>

This method will return the files properties, including content-type, length, locale and custom
metadata as set when file was saved.

```javascript

const { contentType, contentLength, metadata } = await storage.getProperties('foo.txt');
```
</details>

<details>
<summary markdown="span"><code>getStream(location: string, options: object | string): Stream</code></summary>

This method will return a Node.js readable stream for the given file.

```javascript
const stream = storage.getStream('foo.txt');
```
</details>

<details>
<summary markdown="span"><code>getUrl(location: string): string</code></summary>

This method will return a public URL for a given file.

```javascript
// Not supported by 'local' storage

const uri = storage.getUrl('foo.txt');
```

</details>

<details>
<summary markdown="span"><code>move(src: string, dest: string): Promise&lt;Response&gt;</code></summary>

This method will move the file to a new location.

```javascript
await storage.move('foo.txt', 'newFolder/foo.txt');
```

</details>

<details>
<summary markdown="span"><code>put(location: string, content: Buffer | Stream | string, options?: PutOptions): Promise&lt;Response&gt;</code></summary>

This method will create a new file with the provided content.

```javascript
await storage.put('bar.txt', 'Foobar', {contentType: 'plain/text', metadata: {customKey: 'value'}});
```

</details>

## Contribution Guidelines

Any pull requests or discussions are welcome.
Note that every pull request providing new feature or correcting a bug should be created with appropriate unit tests.
