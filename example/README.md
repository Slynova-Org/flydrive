# Storage Abstraction Test
This is a demonstration of how to use [`@slynova/flydrive`](https://www.npmjs.com/package/@slynova/flydrive) to add files to local file system or upload to Digital Ocean Spaces depending on the configuration.

## Install Dependencies
```
npm install
```

## Local File System
To save a cat to the local file system

```
nodejs index.js --disk local
```

## Digital Ocean Space
To save a cat to Digital Ocean Spaces you'll first need to setup a [space](https://cloud.digitalocean.com/spaces/)

### Configuration Options
#### DIGITAL_OCEAN_SPACE_KEY, DIGITAL_OCEAN_SPACE_SECRET
You'll be able to create these in the [Spaces Access Keys](https://cloud.digitalocean.com/settings/api/tokens) section of the API tab on the Digital Ocean Dashboard

#### DIGITAL_OCEAN_ENDPOINT, DIGITAL_OCEAN_BUCKET_NAME
Digital Ocean showed me this Space URL `https://cat-space.nyc3.digitaloceanspaces.com/`

From which I can extract:  
DIGITAL_OCEAN_ENDPOINT - The region I deployed to `nyc3.digitaloceanspaces.com`  
DIGITAL_OCEAN_BUCKET_NAME - The bucket name I choose `cat-space`

### Uploading a cat to Digital Ocean Spaces
To upload a cat to Digital Ocean Spaces run this command replacing the configuration options.

```
nodejs index.js --disk spaces --key DIGITAL_OCEAN_SPACE_KEY --secret DIGITAL_OCEAN_SPACE_SECRET --endpoint DIGITAL_OCEAN_ENDPOINT --bucket DIGITAL_OCEAN_BUCKET_NAME
```
