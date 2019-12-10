/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import { RuntimeException } from 'node-exceptions';

export class InvalidInput extends RuntimeException {
    constructor(argumentName: string, methodName: string, reason?: string) {
        super(
            reason
                ? `Argument ${argumentName} to method ${methodName} is invalid: ${reason}`
                : `Argument ${argumentName} to method ${methodName} is invalid`,
            500,
            'E_INVALID_INPUT'
        );
    }
}
