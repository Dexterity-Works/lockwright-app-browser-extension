import { isNativeHostNotFoundError } from './nativeHostErrors'

const QUIET_PATTERNS = [
  'masterpasswordrequired',
  'masterpasswordinvalid',
  'favicon not found',
  'invalid_url',
  'unknown method: getmasterpasswordstatus',
  'unknown_method: getmasterpasswordstatus',
  'request timeout: checkavailability',
  'disconnected from native host'
]

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export const isExpectedQuietError = (error) => {
  if (error === null || error === undefined || error === '') return false

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' &&
            error !== null &&
            typeof error.message === 'string' &&
            error.message !== ''
          ? error.message
          : String(error)

  if (!message) return false

  if (isNativeHostNotFoundError(message)) return true

  const lower = message.toLowerCase()
  return QUIET_PATTERNS.some((pattern) => lower.includes(pattern))
}
