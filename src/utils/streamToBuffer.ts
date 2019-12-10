import {Readable} from "stream";

export async function streamToBuffer(
    stream: Readable,
    buffer: Buffer,
    offset: number,
    end: number,
    encoding?: string
): Promise<void> {
    let pos = 0; // Position in stream
    const count: number = end - offset; // Total amount of data needed in stream

    return new Promise<void>((resolve, reject) => {
        stream.on("readable", () => {
            if (pos >= count) {
                resolve();
                return;
            }

            let chunk = stream.read();

            if (!chunk) {
                return;
            }

            if (typeof chunk === "string") {
                chunk = Buffer.from(chunk, encoding);
            }

            // How much data needed in this chunk
            const chunkLength = pos + chunk.length > count ? count - pos : chunk.length;

            chunk.copy(buffer, offset+pos, 0, chunkLength);
            pos += chunkLength;
        });

        stream.on("end", () => {
            if (pos < count) {
                reject(
                    new Error(
                        `Stream drains before getting enough data needed. Data read: ${pos}, data need: ${count}`
                    )
                );
            }
            resolve();
        });

        stream.on("error", reject);
    });
}
