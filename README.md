<p align="center">
  <img src="https://user-images.githubusercontent.com/2793951/28023500-5cb4b28c-658e-11e7-8c56-8ec4e94be74b.png" alt="node-flydrive">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@slynova/flydrive"><img src="https://img.shields.io/npm/v/@slynova/flydrive.svg?style=flat-square" alt="Version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@slynova/flydrive.svg?style=flat-square" alt="License"></a>
</p>

<br>

`node-flydrive` is a framework-agnostic package which provides a powerful wrapper to manage Storage in [Node.js](https://nodejs.org).<br>

<hr>
<br>

## Getting Started

This package is available in the Node Package Repository.<br>
It can easily be installed with `npm` or `yarn`.

```bash
$ npm i --save @slynova/flydrive
# or
$ yarn add @slynova/flydrive
```

When you require the package in your file, it will give you access to the `StorageManager` class.<br>
This class is a facade for the package and should be instantiated with a [configuration object](https://github.com/Slynova-Org/node-flydrive/blob/master/tests/stubs/config.js).

```javascript
const StorageManager = require('@slynova/flydrive')
const storage = new StorageManager(config)
```

There's currently 4 drivers available:

* Local
* Amazon S3 (You need to install `aws-sdk` package to be able to use this driver)
* Digital Ocean Spaces (You need to install `aws-sdk` package to be able to use this driver)
* FTP (You need to install `jsftp` package to be able to use this driver)

:point_right: [Read the Official Documentation](https://github.com/Slynova-Org/node-flydrive/wiki)

<br>

## Contribution Guidelines

Any pull requests or discussions are welcome.<br>
Note that every pull request providing new feature or correcting a bug should be created with appropriate unit tests.
