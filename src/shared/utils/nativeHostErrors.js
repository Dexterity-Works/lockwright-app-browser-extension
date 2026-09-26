import { AVAILABILITY_ERROR_MESSAGES } from '../constants/nativeMessaging'

/**
 * Browser-reported native messaging failures that mean the host manifest
 * was not found / not registered for this browser profile.
 */
const NATIVE_HOST_NOT_FOUND_PATTERNS = [
  'Specified native messaging host not found',
  'Native messaging host not found',
  'Attempt to postMessage on disconnected port',
  'disconnected port object'
]

/**
 * @param {string | undefined | null} message
 * @returns {boolean}
 */
export const isNativeHostNotFoundError = (message) => {
  if (!message || typeof message !== 'string') return false
  const lower = message.toLowerCase()
  return NATIVE_HOST_NOT_FOUND_PATTERNS.some((pattern) =>
    lower.includes(pattern.toLowerCase())
  )
}

/**
 * Map raw browser / availability errors to user-facing copy.
 * Host-not-found gets Firefox/Zen/Flatpak guidance.
 *
 * @param {string | undefined | null} message
 * @returns {string}
 */
export const resolveNativeHostUserMessage = (message) => {
  if (isNativeHostNotFoundError(message)) {
    return AVAILABILITY_ERROR_MESSAGES.HOST_NOT_FOUND
  }
  if (message && typeof message === 'string' && message.trim()) {
    return message
  }
  return AVAILABILITY_ERROR_MESSAGES.DEFAULT
}
