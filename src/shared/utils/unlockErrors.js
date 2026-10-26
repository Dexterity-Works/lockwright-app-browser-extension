import { t } from '@lingui/core/macro'

import { resolveNativeHostUserMessage } from './nativeHostErrors'
import { AUTH_ERROR_PATTERNS } from '../constants/auth'
import { ERROR_CODES } from '../constants/nativeMessaging'

// The desktop vault (lockwright-lib-vault-core masterPasswordManager
// initWithPassword) rejects a wrong master password with one of the last two,
// wrapped as "Error initializing with password: Error: ...".
const WRONG_PASSWORD_PATTERNS = [
  AUTH_ERROR_PATTERNS.MASTER_PASSWORD_INVALID,
  'Error decrypting vault key',
  'Provided credentials do not match existing master encryption'
]

const CONNECTION_ERROR_CODES = [
  ERROR_CODES.DESKTOP_APP_UNAVAILABLE,
  ERROR_CODES.NATIVE_HOST_DISCONNECTED,
  ERROR_CODES.CONNECTION_FAILED,
  ERROR_CODES.REQUEST_TIMEOUT
]

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export const isWrongPasswordError = (error) => {
  const message = error?.message
  return (
    typeof message === 'string' &&
    WRONG_PASSWORD_PATTERNS.some((pattern) => message.includes(pattern))
  )
}

/**
 * Code and message to show for a failure. Message bridge errors carry their
 * transport code on `code` and the background's code on `originalError`.
 * @param {unknown} error
 * @returns {{ code: string, reason: string }}
 */
export const getErrorDetail = (error) => ({
  code: error?.originalError?.code || error?.code || ERROR_CODES.UNKNOWN,
  reason: error?.message || String(error)
})

/**
 * Copy for an unlock that failed for a reason other than a wrong password.
 * @param {unknown} error
 * @returns {string}
 */
export const getUnlockErrorMessage = (error) => {
  const { code, reason } = getErrorDetail(error)

  if (CONNECTION_ERROR_CODES.includes(code)) {
    const detail = resolveNativeHostUserMessage(reason)
    return t`Couldn't unlock. The desktop app could not be reached (${code}): ${detail}`
  }

  return t`Couldn't unlock. The desktop app failed (${code}): ${reason}`
}
