import { Storage } from '../packages/flydrive/src';

export async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
	const chunks: string[] = [];
	stream.setEncoding('utf-8');
	for await (const chunk of stream) {
		chunks.push(chunk as string);
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
