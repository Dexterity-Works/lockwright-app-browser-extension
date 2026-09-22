import { RECORD_TYPES } from 'lockwright-lib-vault'

/**
 * Password autofill list: include logins that are not passkey-only.
 * Passkey-only = LOGIN with a credential and no password.
 * Hybrids (credential + password) are included.
 *
 * @param {{ type?: string, data?: { password?: string, credential?: unknown } }} record
 * @returns {boolean}
 */
export function isPasswordAutofillRecord(record) {
  if (record?.type !== RECORD_TYPES.LOGIN) {
    return true
  }

  const hasCredential = Boolean(record.data?.credential)
  const hasPassword = Boolean(record.data?.password)

  if (hasCredential && !hasPassword) {
    return false
  }

  return true
}
