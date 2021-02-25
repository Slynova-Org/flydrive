<p align="center">
  <img src="https://user-images.githubusercontent.com/2793951/54391096-418f4500-46a4-11e9-8d0c-b00ff7ba4198.png" alt="flydrive">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@slynova/flydrive-azureBlob"><img src="https://img.shields.io/npm/dm/@slynova/flydrive-azureBlob.svg?style=flat-square" alt="Download"></a>
  <a href="https://www.npmjs.com/package/@slynova/flydrive-azureBlob"><img src="https://img.shields.io/npm/v/@slynova/flydrive-azureBlob.svg?style=flat-square" alt="Version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@slynova/flydrive-azureBlob.svg?style=flat-square" alt="License"></a>
</p>

`flydrive` is a framework-agnostic package which provides a powerful wrapper to manage file Storage in [Node.js](https://nodejs.org).

This package is the driver for Azure Blob Storage.

---

## Getting Started

This package is available in the npm registry.
It can easily be installed with `npm` or `yarn`.

```bash
$ npm i @slynova/flydrive-azureBlob
# or
$ yarn add @slynova/flydrive-azureBlob
```

```javascript
const { AzureBlobWebServicesStorage } = require('@slynova/flydrive-azureBlob');
const { StorageManager } = require('@slynova/flydrive');
const storage = new StorageManager({
  // ...

  azureBlob: {
    driver: 'azureBlob',
    config: {
        accountName: process.env.AZURE_ACCOUNT,
        accountKey: process.env.AZURE_ACCOUNT_KEY,
        containerName: process.env.AZURE_CONTAINER_NAME
    },
  },
});

storage.registerDriver('azureBlob', AzureBlobWebServicesStorage);
```
