<p align="center">
  <h1>node-flydrive</h1>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/node-flydrive"><img src="https://img.shields.io/npm/v/node-flydrive.svg?style=flat-square" alt="Version"></a>
  <a href="https://www.npmjs.com/package/node-flydrive"><img src="https://img.shields.io/npm/dt/node-flydrive.svg?style=flat-square" alt="Downloads"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/node-flydrive.svg?style=flat-square" alt="License"></a>
</p>

<br>

`node-flydrive` is a framework-agnostic package which provides a powerful wrapper to manage Storage in [Node.js](https://nodejs.org).<br>

> :pray: This package is under active development, some breaking changes may occur before the first release.

<br>
<hr>
<br>

## Getting Started

This package is available in the Node Package Repository.<br>
It can easily be installed with `npm` or `yarn`.

```bash
$ npm i --save node-flydrive
# or
$ yarn add node-flydrive
```

When you require the package in your file, it will give you access to the `StorageManager` class.<br>
This class is a facade for the package and should be instantiated with a [configuration object](https://github.com/Slynova-Org/node-flydrive/blob/master/tests/stubs/config.js).
<br>

```javascript
const StorageManager = require('node-flydrive')
const storage = new StorageManager(config)
```

<br>

There's currently 2 available drivers:

* Local
* Amazon S3 (You need to install `aws-sdk` package to be able to use this driver)

<br>

## Contribution Guidelines

Any pull requests or discussions are welcome.<br>
Note that every pull request providing new feature or correcting a bug should be created with appropriate unit tests.
