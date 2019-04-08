import * as dotenv from 'dotenv'
import * as path from 'path'
import * as _ from 'lodash'
import * as fs from 'fs'

const envFile = path.resolve(path.join(__dirname, '..', '.env.testing'))
const envFileExample = path.resolve(path.join(__dirname, '..', '.env.testing.example'))
dotenv.config({
  path: envFile
})
const example = dotenv.parse(fs.readFileSync(envFileExample))

const HOSTNAME = _.defaultTo(process.env.HOSTNAME, _.defaultTo(example.HOSTNAME, ''))
const SERVICES = _.defaultTo(process.env.SERVICES, _.defaultTo(example.SERVICES, ''))
const DEFAULT_REGION = _.defaultTo(process.env.DEFAULT_REGION, _.defaultTo(example.DEFAULT_REGION, ''))

const S3_KEY = _.defaultTo(process.env.S3_KEY, _.defaultTo(example.S3_KEY, ''))
const S3_SECRET = _.defaultTo(process.env.S3_SECRET, _.defaultTo(example.S3_SECRET, ''))
const S3_ENDPOINT = _.defaultTo(process.env.S3_ENDPOINT, _.defaultTo(example.S3_ENDPOINT, ''))
const S3_BUCKET = _.defaultTo(process.env.S3_BUCKET, _.defaultTo(example.S3_BUCKET, ''))
const S3_REGION = _.defaultTo(process.env.S3_REGION, _.defaultTo(example.S3_REGION, ''))

const SPACES_KEY = _.defaultTo(process.env.SPACES_KEY, _.defaultTo(example.SPACES_KEY, ''))
const SPACES_SECRET = _.defaultTo(process.env.SPACES_SECRET, _.defaultTo(example.SPACES_SECRET, ''))
const SPACES_ENDPOINT = _.defaultTo(process.env.SPACES_ENDPOINT, _.defaultTo(example.SPACES_ENDPOINT, ''))
const SPACES_BUCKET = _.defaultTo(process.env.SPACES_BUCKET, _.defaultTo(example.SPACES_BUCKET, ''))
const SPACES_REGION = _.defaultTo(process.env.SPACES_REGION, _.defaultTo(example.SPACES_REGION, ''))

const GCS_BUCKET = _.defaultTo(process.env.GCS_BUCKET, _.defaultTo(example.GCS_BUCKET, ''))
const GCS_KEYFILE = _.defaultTo(process.env.GCS_KEYFILE, _.defaultTo(example.GCS_KEYFILE, ''))
const GCS_PROJECT_ID = _.defaultTo(process.env.GCS_PROJECT_ID, _.defaultTo(example.GCS_PROJECT_ID, ''))

export default {
    HOSTNAME,
    SERVICES,
    DEFAULT_REGION,

    S3_KEY,
    S3_SECRET,
    S3_ENDPOINT,
    S3_BUCKET,
    S3_REGION,

    SPACES_KEY,
    SPACES_SECRET,
    SPACES_ENDPOINT,
    SPACES_BUCKET,
    SPACES_REGION,

    GCS_BUCKET,
    GCS_KEYFILE,
    GCS_PROJECT_ID,
}