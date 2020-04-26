import { Readable } from 'stream';

export async function streamToString(stream: Readable): Promise<string> {
	const chunks: string[] = [];
	stream.setEncoding('utf-8');
	for await (const chunk of stream) {
		chunks.push(chunk);
	}
	return chunks.join('');
}
