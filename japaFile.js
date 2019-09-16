require('ts-node/register');
require('dotenv').config();

const configure = require('japa').configure;
configure({
	files: ['test/**/*.spec.ts'],
	filter: (file) => {
		if (process.env.GITHUB_ACTION) {
			return !file.includes('s3');
		}
		if ((process.env.DOCKER && file.includes('gcs')) || (!process.env.DOCKER && file.includes('s3'))) {
			return false;
		}

		return true;
	},
});
