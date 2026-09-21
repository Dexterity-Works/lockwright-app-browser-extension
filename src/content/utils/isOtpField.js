import { isCreditCardField } from './isCreditCardField'

const STRONG_OTP_PATTERNS = [
  /one[\s_-]?time[\s_-]?code/i,
  /\btotp\b/i,
  /\botp[\s_-]?code\b/i,
  /\botpcode\b/i,
  /verification[\s_-]?code/i,
  /two[\s_-]?factor/i,
  /2[\s_-]?factor/i,
  /\bmfa[\s_-]?code\b/i,
  /\b2fa[\s_-]?code\b/i,
  /\bonetimecode\b/i,
  /authenticator/i,
  /\botp\b/i
]

const AMBIGUOUS_OTP_PATTERNS = [
  /\bcode\b/i,
  /\bpin\b/i,
  /\botp\b/i,
  /\botc\b/i,
  /\b2fa\b/i,
  /\bmfa\b/i
]

const EXCLUDE_PATTERNS = [
  /recovery[\s_-]?code/i,
  /backup[\s_-]?code/i,
  /backup[\s_-]?token/i
]

/**
 * Detect OTP / 2FA / one-time-code inputs.
 * Explicit autocomplete=one-time-code wins over credit-card heuristics.
 * Credit-card CVV / security_code fields are excluded otherwise.
 *
 * @param {HTMLInputElement} element
 * @returns {boolean}
 */
export const isOtpField = (element) => {
  if (!element || element.tagName !== 'INPUT') {
    return false
  }

  const type = (element.type || 'text').toLowerCase()
  if (type === 'password' || type === 'hidden' || type === 'checkbox') {
    return false
  }

  const autocomplete = (
    element.getAttribute('autocomplete') || ''
  ).toLowerCase()
  if (
    autocomplete === 'one-time-code' ||
    autocomplete.split(/\s+/).includes('one-time-code')
  ) {
    return true
  }

  if (isCreditCardField(element)) {
    return false
  }

  const labelText = element.labels
    ? Array.from(element.labels)
        .map((label) => label.textContent)
        .join(' ')
    : ''

  const attributes = [
    element.name || '',
    element.id || '',
    element.placeholder || '',
    labelText
  ]

  // Exclude recovery/backup fields by name/id/placeholder only — label hints
  // often mention backup codes as an alternative (e.g. Affinity 2FA).
  const excludeAttrs = [
    element.name || '',
    element.id || '',
    element.placeholder || ''
  ]
  if (
    EXCLUDE_PATTERNS.some((pattern) =>
      excludeAttrs.some((attr) => pattern.test(attr))
    )
  ) {
    return false
  }

  if (
    STRONG_OTP_PATTERNS.some((pattern) =>
      attributes.some((attr) => pattern.test(attr))
    )
  ) {
    return true
  }

  const nameAndId = [element.name || '', element.id || '']
  const isAmbiguous = AMBIGUOUS_OTP_PATTERNS.some((pattern) =>
    nameAndId.some((attr) => pattern.test(attr))
  )

  if (!isAmbiguous) {
    return false
  }

  const placeholder = element.placeholder || ''
  if (
    /\d/.test(placeholder) ||
    /code|digit|otp|token|verif/i.test(placeholder)
  ) {
    return true
  }

  if (!hasPasswordSibling(element)) {
    return true
  }

  return false
}

/**
 * @param {HTMLInputElement} element
 * @returns {boolean}
 */
function hasPasswordSibling(element) {
  const form =
    element.form ||
    (typeof element.closest === 'function' ? element.closest('form') : null)

  const scope = form || element.ownerDocument || document
  return Boolean(scope.querySelector('input[type="password"]'))
}
