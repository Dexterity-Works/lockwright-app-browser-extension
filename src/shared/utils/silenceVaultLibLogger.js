import { isExpectedQuietError } from './isExpectedQuietError'
import { logger } from './logger'

/**
 * Vault Logger.error does `console.error(messages)` (the args array).
 * Chrome's extension error page then does String(firstArg), and
 * String([{ message: 'Rejected' }]) is `[object Object]`.
 *
 * @param {unknown} arg
 * @returns {unknown}
 */
const formatVaultLogArg = (arg) => {
  if (arg instanceof Error) return arg
  if (arg && typeof arg === 'object') {
    if (typeof arg.message === 'string' && arg.message !== '') {
      return arg.message
    }
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }
  return arg
}

/**
 * Replace vaultLogger.error so expected quiet errors are not logged.
 * Non-quiet objects are forwarded as a readable string so Chrome does
 * not record `[object Object]`.
 *
 * @param {{ error: (...args: unknown[]) => void }} vaultLogger
 */
export const silenceVaultLibLogger = (vaultLogger) => {
  const originalError = vaultLogger.error.bind(vaultLogger)

  vaultLogger.error = (...args) => {
    if (args.some((arg) => isExpectedQuietError(arg)) && !logger.debugMode) {
      return
    }
    return originalError(...args.map(formatVaultLogArg))
  }
}
