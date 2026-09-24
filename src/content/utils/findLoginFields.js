import { getField, PASSWORD_MATCHERS } from './getField'
import { isIgnoredField } from './isIgnoredField'
import { isPasswordField } from './isPasswordField'
import { isUsernameField } from './isUsernameField'
import { isVisibleField } from './isVisibleField'

const USERNAME_FALLBACK_KEYWORDS = ['username', 'email', 'user', 'login']

/**
 * @param {HTMLElement | null | undefined} preferredElement
 * @returns {{ usernameField: HTMLInputElement | null, passwordField: HTMLInputElement | null }}
 */
export function findLoginFields(preferredElement) {
  const scope = resolveScope(preferredElement)

  const inputs = Array.from(scope.querySelectorAll('input')).filter(
    isVisibleField
  )

  let passwordField = inputs.find((el) => isPasswordField(el)) || null
  let usernameField = inputs.find((el) => isUsernameField(el)) || null

  if (!usernameField && passwordField) {
    usernameField = findPrecedingUsernameCandidate(passwordField)
  }

  if (!passwordField) {
    passwordField = visibleOrNull(getField(PASSWORD_MATCHERS).element)
  }

  if (!usernameField) {
    usernameField = visibleOrNull(getField(USERNAME_FALLBACK_KEYWORDS).element)
  }

  return { usernameField, passwordField }
}

const visibleOrNull = (element) => (isVisibleField(element) ? element : null)

/**
 * @param {HTMLElement | null | undefined} preferredElement
 * @returns {ParentNode}
 */
function resolveScope(preferredElement) {
  if (!preferredElement) {
    return document
  }

  const form =
    preferredElement.form ||
    (typeof preferredElement.closest === 'function'
      ? preferredElement.closest('form')
      : null)

  return form || document
}

/**
 * When username heuristics miss, pick a reasonable preceding text/email/tel
 * input in the same form as the password field.
 *
 * @param {HTMLInputElement} passwordField
 * @returns {HTMLInputElement | null}
 */
function findPrecedingUsernameCandidate(passwordField) {
  const form =
    passwordField.form ||
    (typeof passwordField.closest === 'function'
      ? passwordField.closest('form')
      : null)

  if (!form) {
    return null
  }

  const formInputs = Array.from(form.querySelectorAll('input'))
  const passwordIndex = formInputs.indexOf(passwordField)

  for (let i = passwordIndex - 1; i >= 0; i--) {
    const el = formInputs[i]
    const type = (el.type || 'text').toLowerCase()
    if (type !== 'text' && type !== 'email' && type !== 'tel') {
      continue
    }
    if (isIgnoredField(el) || !isVisibleField(el)) {
      continue
    }
    return el
  }

  return null
}
