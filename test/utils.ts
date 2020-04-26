import { Readable } from 'stream';

import { Storage } from '../src';

export async function streamToString(stream: Readable): Promise<string> {
	const chunks: string[] = [];
	stream.setEncoding('utf-8');
	for await (const chunk of stream) {
		chunks.push(chunk);
	}
	return chunks.join('');
}

export async function getFlatList(storage: Storage, prefix?: string): Promise<string[]> {
	const result: string[] = [];
	for await (const file of storage.flatList(prefix)) {
		result.push(file.path);
	}
	return result;
}
