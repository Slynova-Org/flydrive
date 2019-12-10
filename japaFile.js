require('ts-node/register');
require('dotenv').config();

const argv = require('yargs').option('driver', {
	alias: 'd',
	type: 'array',
	description: 'tested driver',
	requiresArg: true,
	choices: ['azure', 'gcs', 'local', 's3']
}).argv;

const configure = require('japa').configure;
configure({
	files: ['test/**/*.spec.ts'],
	filter: (file) => {
		return !argv.driver || argv.driver.some((d) => file.includes(d));
	},
	timeout: 5000,
});
