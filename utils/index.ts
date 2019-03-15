import { Readable, pipeline as nodePipeline } from 'stream'
import { promisify } from 'util'

/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

/**
 * Returns a boolean indication if stream param
 * is a readable stream or not.
 */
export function isReadableStream(stream: any): stream is Readable {
  return (
    stream !== null &&
    typeof stream === 'object' &&
    typeof stream.pipe === 'function' &&
    typeof stream._read === 'function' &&
    typeof stream._readableState === 'object' &&
    stream.readable !== false
  )
}

export const pipeline = promisify(nodePipeline)
