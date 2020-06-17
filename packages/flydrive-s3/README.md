<p align="center">
  <img src="https://user-images.githubusercontent.com/2793951/54391096-418f4500-46a4-11e9-8d0c-b00ff7ba4198.png" alt="flydrive">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@slynova/flydrive-s3"><img src="https://img.shields.io/npm/dm/@slynova/flydrive-s3.svg?style=flat-square" alt="Download"></a>
  <a href="https://www.npmjs.com/package/@slynova/flydrive-s3"><img src="https://img.shields.io/npm/v/@slynova/flydrive-s3.svg?style=flat-square" alt="Version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@slynova/flydrive-s3.svg?style=flat-square" alt="License"></a>
</p>

`flydrive` is a framework-agnostic package which provides a powerful wrapper to manage file Storage in [Node.js](https://nodejs.org).

This package is the driver for Amazon S3 and other compatible services.

---

## Getting Started

This package is available in the npm registry.
It can easily be installed with `npm` or `yarn`.

```bash
$ npm i @slynova/flydrive-s3
# or
$ yarn add @slynova/flydrive-s3
```

```javascript
const { AmazonWebServicesS3Storage } = require('@slynova/flydrive-s3');
const { StorageManager } = require('@slynova/flydrive');
const storage = new StorageManager({
  // ...

  s3: {
    driver: 's3',
    config: {
      key: process.env.S3_KEY,
      endpoint: process.env.S3_ENDPOINT,
      secret: process.env.S3_SECRET,
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
    },
  },
});

storage.registerDriver('s3', AmazonWebServicesS3Storage);
```
