/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { GoogleCloudStorage } from './GoogleCloudStorage';
import { LocalFileSystem } from './LocalFileSystem';

export default {
	gcs: GoogleCloudStorage,
	local: LocalFileSystem,
};
