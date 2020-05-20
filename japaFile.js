require('ts-node/register');
require('dotenv').config();

const configure = require('japa').configure;
configure({
	files: ['packages/**/*.spec.ts'],
});
