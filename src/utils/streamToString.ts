import {Readable} from "stream";

export async function streamToString(
    stream: Readable,
    encoding?: string
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let result = "";

        stream.on("readable", () => {
            let chunk = stream.read();

            if (!chunk) {
                return;
            }

            if (Buffer.isBuffer(chunk)) {
                chunk = chunk.toString(encoding);
            }

            result += chunk;
        });

        stream.on("end", () => {
            resolve(result);
        });

        stream.on("error", reject);
    });
}
