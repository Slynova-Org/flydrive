require('ts-node/register');
require('dotenv').config();

const { configure } = require('japa');
configure({
	files: ['test/**/*.spec.ts'],
});
