<p align="center">
  <img src="https://user-images.githubusercontent.com/2793951/54391096-418f4500-46a4-11e9-8d0c-b00ff7ba4198.png" alt="flydrive">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@slynova/flydrive"><img src="https://img.shields.io/npm/dm/@slynova/flydrive.svg?style=flat-square" alt="Download"></a>
  <a href="https://www.npmjs.com/package/@slynova/flydrive"><img src="https://img.shields.io/npm/v/@slynova/flydrive.svg?style=flat-square" alt="Version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@slynova/flydrive.svg?style=flat-square" alt="License"></a>
</p>

`flydrive` is a framework-agnostic package which provides a powerful wrapper to manage Storage in [Node.js](https://nodejs.org).

There are currently 4 drivers available:

- Local
- Amazon S3 (You need to install `aws-sdk` package to be able to use this driver)
- Digital Ocean Spaces (You need to install `aws-sdk` package to be able to use this driver)
- Google Cloud Storage (You need to install `@google-cloud/storage` package to be able to use this driver)

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
This class is a facade for the package and should be instantiated with a [configuration object](https://github.com/Slynova-Org/flydrive/blob/master/tests/stubs/config.js).

```javascript
const { StorageManager } = require('@slynova/flydrive');
const storage = new StorageManager(config);
```

Once you instantiated the manager, you can use the `StorageManager#disk()` method to retrieve a disk an use it.

```javascript
storage.disk(); // Returns the default disk (specified in the config)
storage.disk('awsCloud'); // Returns the driver for the disk "s3"
storage.disk('awsCloud', customConfig); // Overwrite the default configuration of the disk
```

## Driver's API

Each driver extends the abstract class [`Storage`](https://github.com/Slynova-Org/flydrive/blob/master/src/Storage.ts). This class will throw an exception for each methods by default. The driver needs to overwrite the methods it supports.

The following method doesn't exists on the `LocalFileSystem` driver, therefore, it will throw an exception.

```javascript
// throws "E_METHOD_NOT_SUPPORTED: Method getSignedUrl is not supported for the driver LocalFileSystem"
storage.disk('local').getSignedUrl();
```

Since we are using TypeScript, you can make use of casting to get the real interface:

```typescript
import { LocalFileSystem } from '@slynova/flydrive';

storage.disk<LocalFileSystem>('local');
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
<summary markdown="span"><code>append(location: string, content: Buffer | Stream | string, options: object): Promise&lt;Response&gt;</code></summary>

This method will append the content to the file at the location.
If the file doesn't exist yet, it will be created.

```javascript
// Supported drivers: "local"

await storage.disk('local').append('foo.txt', 'bar');
// foo.txt now has the content `${initialContent}bar`
```

</details>

<details>
<summary markdown="span"><code>bucket(name: string): Storage</code></summary>

This method can be used to swap the bucket at runtime.
It returns a new Storage instance.

```javascript
// Supported drivers: "s3", "gcs"

storage.disk('cloud').bucket('anotherOne');
// The following chained action will use the "anotherOne" bucket instead of the original one
```

</details>

<details>
<summary markdown="span"><code>copy(src: string, dest: string, options: object): Promise&lt;Response&gt;</code></summary>

This method will copy a file to another location.

```javascript
// Supported drivers: "local", "s3", "gcs"

await storage.disk('local').copy('foo.txt', 'bar.txt');
// foo.txt was copied to bar.txt
```

</details>

<details>
<summary markdown="span"><code>delete(location: string): Promise&lt;Response&gt;</code></summary>

This method will delete the file at the given location.

```javascript
// Supported drivers: "local", "s3", "gcs"

await storage.disk('local').delete('foo.txt');
// foo.txt has been deleted
```

</details>

<details>
<summary markdown="span"><code>driver()</code></summary>

This method returns the driver used if you need to do anything specific not supported by default.

```javascript
storage.disk('local').driver(); // Returns "fs-extra"
storage.disk('awsCloud').driver(); // Returns "aws-sdk"
storage.disk('googleCloud').driver(); // Returns "@google-cloud/storage"
// ....
```

</details>

<details>
<summary markdown="span"><code>exists(location: string): Promise&lt;ExistsResponse&gt;</code></summary>

This method will determine if a file exists at the given location.

```javascript
// Supported drivers: "local", "s3", "gcs"

const { exists } = await storage.disk('local').exists('foo.txt');
// exists is true or false
```

</details>

<details>
<summary markdown="span"><code>get(location: string, encoding: string = 'utf-8'): Promise&lt;ContentResponse&lt;string&gt;&gt;</code></summary>

This methods will return the file's content as a string for the given location.

```javascript
// Supported drivers: "local", "s3", "gcs"

const { content } = await storage.disk('local').exists('foo.txt');
```

</details>

<details>
<summary markdown="span"><code>getBuffer(location: string): Promise&lt;ContentResponse&lt;Buffer&gt;&gt;</code></summary>

This methods will return the file's content as a Buffer for the given location.

```javascript
// Supported drivers: "local", "s3", "gcs"

const { content } = await storage.disk('local').exists('foo.txt');
```

</details>

<details>
<summary markdown="span"><code>getSignedUrl(location: string, options: SignedUrlOptions = { expiry: 900 }): Promise&lt;SignedUrlResponse&gt;</code></summary>

This methods will return the signed url for an existing file.

```javascript
// Supported drivers: "s3", "gcs"

const { signedUrl } = await storage.disk('awsCloud').getSignedUrl('foo.txt');
```

</details>

<details>
<summary markdown="span"><code>getStat(location: string): Promise&lt;StatResponse&gt;</code></summary>

This methods will return the file's size (in bytes) and last modification date.

```javascript
// Supported drivers: "local", "s3", "gcs"

const { size, modified } = await storage.disk('local').getStat('foo.txt');
```

</details>

<details>
<summary markdown="span"><code>getStream(location: string, options: object | string): Stream</code></summary>

This methods will return a Node.js readable stream for the given file.

```javascript
// Supported drivers: "local", "s3", "gcs"

const stream = storage.disk('local').getStream('foo.txt');
```

</details>

<details>
<summary markdown="span"><code>getUrl(location: string): string</code></summary>

This methods will return a public URL for a given file.

```javascript
// Supported drivers: "s3", "gcs"

const uri = storage.disk('awsCloud').getUrl('foo.txt');
```

</details>

<details>
<summary markdown="span"><code>move(src: string, dest: string): Promise&lt;Response&gt;</code></summary>

This methods will move the file to a new location.

```javascript
// Supported drivers: "local", "s3", "gcs"

await storage.disk('local').move('foo.txt', 'newFolder/foo.txt');
```

</details>

<details>
<summary markdown="span"><code>put(location: string, content: Buffer | Stream | string, options: object): Promise&lt;Response&gt;</code></summary>

This methods will create a new file with the provided content.

```javascript
// Supported drivers: "local", "s3", "gcs"

await storage.disk('local').put('bar.txt', 'Foobar');
```

</details>

<details>
<summary markdown="span"><code>prepend(location: string, content: Buffer | string, options: object): Promise&lt;Response&gt;</code></summary>

This methods will preprend content to a file.

```javascript
// Supported drivers: "local"

await storage.disk('local').prepend('foo.txt', 'bar');
// foo.txt now has the content `bar${initialContent}`
```

</details>

## Contribution Guidelines

Any pull requests or discussions are welcome.
Note that every pull request providing new feature or correcting a bug should be created with appropriate unit tests.
