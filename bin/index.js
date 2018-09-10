'use strict'

/*
 * node-flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
*/

/* eslint-disable import/no-extraneous-dependencies */
const semver = require('semver')
const { spawn } = require('child_process')

const spawnArgs = []

if (semver.lt(process.version, '8.0.0')) {
  spawnArgs.push('--harmony-async-await')
}

function local () {
  spawnArgs.push('./node_modules/.bin/japa')
  const tests = spawn('node', spawnArgs)
  tests.stdout.on('data', data => process.stdout.write(data))
  tests.stderr.on('data', data => process.stderr.write(data))
  tests.on('close', code => process.exit(code))
}

function win () {
  spawnArgs.push('./node_modules/japa-cli/index.js')
  const tests = spawn('node', spawnArgs)
  tests.stdout.on('data', data => process.stdout.write(data))
  tests.stderr.on('data', data => process.stderr.write(data))
  tests.on('close', code => process.exit(code))
}

if (process.argv.indexOf('--local') > -1) {
  local()
} else if (process.argv.indexOf('--win') > -1) {
  win()
}
