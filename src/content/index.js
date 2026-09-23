import './utils/contentI18n.js'

import { RECORD_TYPES } from 'lockwright-lib-vault'

import { IFRAME_TYPES } from './constants/iframe'
import { LOGO_PADDING, LOGO_SIZE } from './constants/styles'
import { clampPopupPosition } from './utils/clampPopupPosition'
import { createIframe } from './utils/createIframe'
import { findLoginFields } from './utils/findLoginFields'
import { findLoginForms } from './utils/findLoginForms'
import { findSelectOptionValue } from './utils/findSelectOptionValue'
import { getField, PASSWORD_MATCHERS } from './utils/getField'
import {
  isContentScriptEnabled,
  isExtensionContextValid
} from './utils/isContentScriptEnabled'
import { isCreditCardField } from './utils/isCreditCardField'
import { isIdentityField } from './utils/isIdentityField'
import { isOtpField } from './utils/isOtpField'
import { isPasswordField } from './utils/isPasswordField'
import { isUsernameField } from './utils/isUsernameField'
import { loginDetectContext } from './utils/loginDetectContext'
import { createLogoAttachGuard } from './utils/logoAttachGuard'
import { positionPopupFromLogo } from './utils/positionPopupFromLogo'
import { scheduleShowLogoForField } from './utils/scheduleShowLogoForField'
import { setInputValue } from './utils/setInputValue'
import { shouldSkipLoginDetect } from './utils/shouldSkipLoginDetect'
import { showPasswordStrengthNearField } from './utils/showPasswordStrengthNearField'
import { swallowInvalidatedContextErrors } from './utils/swallowInvalidatedContext'
import { triggerInputEvents } from './utils/triggerInputEvents'
import { CONTENT_MESSAGE_TYPES } from '../shared/constants/nativeMessaging'
import { MESSAGE_TYPES } from '../shared/services/messageBridge'
import {
  getAutofillEnabled,
  onAutofillEnabledChanged
} from '../shared/utils/autofillSetting'
import { logger } from '../shared/utils/logger'
import { runtime } from '../shared/utils/runtime'

const activeIframes = new Set()
const logoAttachGuard = createLogoAttachGuard()

let isAutoFillEnabled = true

swallowInvalidatedContextErrors()

getAutofillEnabled()
  .then((isEnabled) => {
    isAutoFillEnabled = isEnabled
  })
  .catch(() => {})

onAutofillEnabledChanged((isEnabled) => {
  isAutoFillEnabled = isEnabled
})

window.addEventListener('scroll', removeIframesOnScrollOrResize)
window.addEventListener('resize', removeIframesOnScrollOrResize)

window.addEventListener('focusin', async (event) => {
  try {
    if (!(await isContentScriptEnabled())) {
      return
    }
  } catch {
    return
  }

  if (isAutoFillEnabled) {
    toggleLogoOnFocus(event)
    handlePasswordSuggestionPopup(event)
    handlePasswordSuggestionOutsideClick(event)
  }
})

window.addEventListener('click', async (event) => {
  try {
    if (!(await isContentScriptEnabled())) {
      return
    }
  } catch {
    return
  }

  if (isAutoFillEnabled) {
    hideLogoOnOutsideClick(event)
    hideAutofillOnOutsideClick(event)
    handlePasswordSuggestionOutsideClick(event)
  }
  detectSubmitClick(event)
})

window.addEventListener('message', async (event) => {
  try {
    if (!(await isContentScriptEnabled())) {
      return
    }
  } catch {
    return
  }

  if (event.source === window) {
    handleWindowEvent(event)
    return
  }

  handleIframeEvent(event)
})

runtime.onMessage.addListener(async (msg) => {
  try {
    if (!(await isContentScriptEnabled())) {
      return
    }
  } catch {
    return
  }

  if (msg.type === CONTENT_MESSAGE_TYPES.SAVED_PASSKEY) {
    window.postMessage(
      {
        type: msg.type,
        requestId: msg.requestId,
        recordId: msg.recordId,
        credential: msg.credential
      },
      '*'
    )
  }

  if (msg.type === CONTENT_MESSAGE_TYPES.CREATE_THIRD_PARTY_KEY) {
    window.postMessage(
      {
        type: msg.type,
        requestId: msg.requestId
      },
      '*'
    )
  }

  if (msg.type === CONTENT_MESSAGE_TYPES.GOT_PASSKEY) {
    window.postMessage(
      {
        type: msg.type,
        requestId: msg.requestId,
        credential: msg.credential
      },
      '*'
    )
  }

  if (msg.type === CONTENT_MESSAGE_TYPES.GET_THIRD_PARTY_KEY) {
    window.postMessage(
      {
        type: msg.type,
        requestId: msg.requestId
      },
      '*'
    )
  }

  if (msg.type === CONTENT_MESSAGE_TYPES.AUTOFILL_FROM_ACTION) {
    if (!isAutoFillEnabled) {
      return
    }
    const { recordType, data: recordData } = msg

    switch (recordType) {
      case RECORD_TYPES.LOGIN:
        handleAutofillLogin({
          username: recordData.username,
          password: recordData.password
        })
        break
      case RECORD_TYPES.IDENTITY:
        handleAutofillIdentity({
          name: recordData.name,
          email: recordData.email,
          phoneNumber: recordData.phoneNumber,
          address: recordData.address,
          zip: recordData.zip,
          city: recordData.city,
          region: recordData.region,
          country: recordData.country
        })
        break
      case RECORD_TYPES.CREDIT_CARD:
        handleAutofillCreditCard({
          cardNumber: recordData.cardNumber,
          cardholderName: recordData.cardholderName,
          expireDate: recordData.expireDate,
          securityCode: recordData.securityCode
        })
        break
    }
  }
})

// Password generator
function handlePasswordSuggestionPopup(event) {
  const element = event.target

  if (!isPasswordField(element)) {
    return
  }

  const rect = element.getBoundingClientRect()
  const { top, left } = clampPopupPosition({
    top: rect.top + rect.height + 5,
    left: rect.left + rect.width / 2,
    width: 280,
    height: 180,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  })

  showIframe(IFRAME_TYPES.passwordSuggestion, {
    element: element,
    data: {
      url: window.location.href,
      recordType: getRecordTypeByField(element)
    },
    styles: {
      top: `${top}px`,
      left: `${left}px`,
      width: '0px',
      height: '0px',
      borderRadius: '12px'
    }
  })
}

function handlePasswordSuggestionOutsideClick(event) {
  const element = event.target

  const passwordSuggestionIframeData = getIframeData(
    IFRAME_TYPES.passwordSuggestion
  )

  if (
    !passwordSuggestionIframeData ||
    element.isSameNode(passwordSuggestionIframeData?.iframe) ||
    element.isSameNode(passwordSuggestionIframeData?.element)
  ) {
    return
  }

  removeIframe(passwordSuggestionIframeData)
}

function handleInsertPassword({ password, iframeData }) {
  if (iframeData.element) {
    setInputValue(iframeData.element, password)
    triggerInputEvents(iframeData.element, ['blur'])
    showPasswordStrengthNearField(iframeData.element, password)
  }

  removeIframe(iframeData)

  const logoIframeData = getIframeData(IFRAME_TYPES.logo)

  if (logoIframeData) {
    removeIframe(logoIframeData)
  }
}

// AutoFill
function showAutofillPopup({ positions, recordType, fillMode }) {
  if (!isAutoFillEnabled) {
    return
  }
  const { top, left } = clampPopupPosition({
    top: positions.top,
    left: positions.left,
    width: 300,
    height: 200,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  })

  showIframe(IFRAME_TYPES.autofill, {
    data: {
      url: window.location.href,
      recordType: recordType,
      fillMode
    },
    styles: {
      top: `${top}px`,
      left: `${left}px`,
      width: '300px',
      height: '200px',
      borderRadius: '12px'
    }
  })
}

/** Creds last filled via autofill (not generator). Used to skip LoginDetect. */
let lastAutofill = null

function handleAutofillLogin({
  username,
  password,
  otpCode,
  preferredElement
}) {
  if (!isAutoFillEnabled) {
    return
  }

  // OTP / 2FA: fill only the focused one-time-code field
  if (
    otpCode !== undefined &&
    otpCode !== null &&
    preferredElement &&
    isOtpField(preferredElement)
  ) {
    setInputValue(preferredElement, otpCode)
    triggerInputEvents(preferredElement, ['blur'])
    return
  }

  const { usernameField, passwordField } = findLoginFields(preferredElement)

  if (usernameField && username !== undefined && username !== null) {
    setInputValue(usernameField, username)
    triggerInputEvents(usernameField, ['blur'])
  }

  if (passwordField && password !== undefined && password !== null) {
    setInputValue(passwordField, password)
    triggerInputEvents(passwordField, ['blur'])
  }

  // Remember autofilled login creds so submit can skip a redundant Save card.
  // Do not set on otp-only path (returned above). Generator does not call this.
  if (
    username !== undefined &&
    username !== null &&
    password !== undefined &&
    password !== null
  ) {
    lastAutofill = { username, password }
  }
}

const handleAutoFillLoginFromPopup = ({
  username,
  password,
  otpCode,
  iframeData
}) => {
  handleAutofillLogin({
    username,
    password,
    otpCode,
    preferredElement: getIframeData(IFRAME_TYPES.logo)?.element
  })

  removeIframe(iframeData)

  const logoIframeData = getIframeData(IFRAME_TYPES.logo)

  if (logoIframeData) {
    removeIframe(logoIframeData)
  }
}

function handleAutofillIdentity({
  name,
  email,
  phoneNumber,
  address,
  zip,
  city,
  region,
  country
}) {
  if (!isAutoFillEnabled) {
    return
  }
  const { element: nameField } = getField(['name', 'full name', 'first name'])
  const { element: emailField } = getField(['email'])
  const { element: phoneField } = getField(['phone', 'tel', 'mobile'])
  const { element: addressField } = getField(['address'])
  const { element: zipField } = getField(['zip', 'postal-code'])
  const { element: cityField, type: cityFieldType } = getField(['city'])
  const { element: regionField, type: regionFieldType } = getField([
    'region',
    'state'
  ])
  const { element: countryField, type: countryFieldType } = getField([
    'country'
  ])

  if (nameField) {
    setInputValue(nameField, name)
  }

  if (emailField) {
    setInputValue(emailField, email)
  }

  if (phoneField) {
    setInputValue(phoneField, phoneNumber)
  }

  if (addressField) {
    setInputValue(addressField, address)
  }

  if (zipField) {
    setInputValue(zipField, zip)
  }

  if (cityField) {
    if (cityFieldType === 'select') {
      setInputValue(cityField, findSelectOptionValue(cityField, city))
      return
    }

    setInputValue(cityField, city)
  }

  if (regionField) {
    if (regionFieldType === 'select') {
      setInputValue(regionField, findSelectOptionValue(regionField, region))
      return
    }

    setInputValue(regionField, region)
  }

  if (countryField) {
    if (countryFieldType === 'select') {
      setInputValue(countryField, findSelectOptionValue(countryField, country))
      return
    }
    setInputValue(countryField, country)
  }
}

const handleAutoFillIdentityFromPopup = ({
  name,
  email,
  phoneNumber,
  address,
  zip,
  city,
  region,
  country,
  iframeData
}) => {
  handleAutofillIdentity({
    name,
    email,
    phoneNumber,
    address,
    zip,
    city,
    region,
    country
  })

  removeIframe(iframeData)
}

function handleAutofillCreditCard({
  cardNumber,
  cardholderName,
  expireDate,
  securityCode
}) {
  if (!isAutoFillEnabled) {
    return
  }

  const { element: numberField } = getField([
    'cc-number',
    'cardnumber',
    'card number',
    'card-number',
    'cardno'
  ])
  const { element: nameField } = getField([
    'cc-name',
    'cardholder',
    'card holder',
    'name on card',
    'ccname'
  ])
  const { element: securityCodeField } = getField([
    'cc-csc',
    'cvv',
    'cvc',
    'csc',
    'security code',
    'securitycode',
    'card-code'
  ])
  const { element: expireField } = getField([
    'cc-exp',
    'expiration',
    'expiry',
    'exp-date',
    'expdate'
  ])
  const { element: expireMonthField, type: expireMonthFieldType } = getField([
    'cc-exp-month',
    'exp-month',
    'expmonth',
    'expiry-month'
  ])
  const { element: expireYearField, type: expireYearFieldType } = getField([
    'cc-exp-year',
    'exp-year',
    'expyear',
    'expiry-year'
  ])

  if (numberField) {
    setInputValue(numberField, cardNumber)
    triggerInputEvents(numberField, ['blur'])
  }

  if (nameField) {
    setInputValue(nameField, cardholderName)
    triggerInputEvents(nameField, ['blur'])
  }

  if (securityCodeField) {
    setInputValue(securityCodeField, securityCode)
    triggerInputEvents(securityCodeField, ['blur'])
  }

  // Stored expiration is "MM YY"
  const [month = '', year = ''] = (expireDate || '').trim().split(/\s+/)

  if (expireMonthField && month) {
    if (expireMonthFieldType === 'select') {
      setInputValue(
        expireMonthField,
        findSelectOptionValue(expireMonthField, month)
      )
    } else {
      setInputValue(expireMonthField, month)
    }
    triggerInputEvents(expireMonthField, ['blur'])
  }

  if (expireYearField && year) {
    const fullYear = `20${year}`
    if (expireYearFieldType === 'select') {
      setInputValue(
        expireYearField,
        findSelectOptionValue(expireYearField, fullYear)
      )
    } else {
      setInputValue(expireYearField, year)
    }
    triggerInputEvents(expireYearField, ['blur'])
  }

  // Only fill a combined expiration field when there are no split inputs
  if (expireField && !expireMonthField && !expireYearField && month && year) {
    setInputValue(expireField, `${month}/${year}`)
    triggerInputEvents(expireField, ['blur'])
  }
}

const handleAutoFillCreditCardFromPopup = ({
  cardNumber,
  cardholderName,
  expireDate,
  securityCode,
  iframeData
}) => {
  handleAutofillCreditCard({
    cardNumber,
    cardholderName,
    expireDate,
    securityCode
  })

  removeIframe(iframeData)

  const logoIframeData = getIframeData(IFRAME_TYPES.logo)

  if (logoIframeData) {
    removeIframe(logoIframeData)
  }
}

function hideAutofillOnOutsideClick(event) {
  const element = event.target

  const autofillIframeData = getIframeData(IFRAME_TYPES.autofill)

  if (!autofillIframeData || element.isSameNode(autofillIframeData?.iframe)) {
    return
  }

  removeIframe(autofillIframeData)
}

// Login detection

const wiredLoginForms = new WeakSet()
let loginSubmitDebounceTimer = null
let pendingLoginCapture = null
const LOGIN_SUBMIT_DEBOUNCE_MS = 450

function showLoginIframe(data) {
  const existing = getIframeData(IFRAME_TYPES.login)
  if (existing) {
    removeIframe(existing)
  }

  showIframe(IFRAME_TYPES.login, {
    data,
    styles: {
      top: '20px',
      right: '20px',
      width: '0px',
      height: '0px',
      borderRadius: '12px'
    }
  })
}

function onSubmit({ username, password }) {
  // Locally enabled: capture save-after-login regardless of External
  // SAVE_CREDENTIALS_AFTER_LOGIN_ENABLED flag.
  if (!username && !password) {
    return
  }

  // Prefer non-empty fields if click+submit both fire in the debounce window.
  pendingLoginCapture = {
    username: username || pendingLoginCapture?.username || '',
    password: password || pendingLoginCapture?.password || ''
  }

  if (loginSubmitDebounceTimer) {
    clearTimeout(loginSubmitDebounceTimer)
  }

  loginSubmitDebounceTimer = setTimeout(() => {
    loginSubmitDebounceTimer = null
    const capture = pendingLoginCapture
    pendingLoginCapture = null
    if (!capture?.username && !capture?.password) {
      return
    }

    if (
      shouldSkipLoginDetect({
        username: capture.username,
        password: capture.password,
        lastAutofill
      })
    ) {
      return
    }

    const data = {
      ...loginDetectContext({
        href: window.location.href,
        title: document.title
      }),
      username: capture.username,
      password: capture.password
    }

    try {
      runtime.sendMessage({
        type: IFRAME_TYPES.login,
        data: data
      })
    } catch {
      return
    }

    if (capture.username && capture.password) {
      showLoginIframe(data)
    }
  }, LOGIN_SUBMIT_DEBOUNCE_MS)
}

function initFormListener(form) {
  if (wiredLoginForms.has(form)) {
    return
  }
  wiredLoginForms.add(form)

  form.addEventListener('submit', async () => {
    try {
      if (!(await isContentScriptEnabled())) {
        return
      }
    } catch {
      return
    }

    const username = form.querySelector(
      'input[type="text"], input[type="email"], input[type="tel"]'
    )?.value

    const password = form.querySelector('input[type="password"]')?.value

    onSubmit({ username, password })
  })
}

function detectSubmitClick(event) {
  const btn = event.target.closest(
    'button, input[type="button"], input[type="submit"]'
  )

  if (!btn) {
    return
  }

  const label = (
    btn.innerText ||
    btn.getAttribute('aria-label') ||
    ''
  ).toLowerCase()

  if (/(next|sign in|login|submit)/.test(label)) {
    setTimeout(() => {
      const { element: userNameField } = getField(['username', 'email'])
      const { element: passwordField } = getField(PASSWORD_MATCHERS)

      const username = userNameField?.value
      const password = passwordField?.value

      onSubmit({ username, password })
    }, 10)
  }
}

const observer = new MutationObserver(async () => {
  if (!isExtensionContextValid()) {
    observer.disconnect()
    return
  }

  try {
    if (!(await isContentScriptEnabled())) {
      if (!isExtensionContextValid()) {
        observer.disconnect()
      }
      return
    }

    findLoginForms().forEach(initFormListener)
    cleanupOrphanedFieldIframes()
    attachLogoToActiveField()
  } catch {
    observer.disconnect()
  }
})

observer.observe(document, { childList: true, subtree: true })

runtime
  .sendMessage({
    type: 'getPendingLogin'
  })
  .then(async (msg) => {
    try {
      if (!(await isContentScriptEnabled())) {
        return
      }
    } catch {
      return
    }

    if (
      msg.type === 'pendingLogin' &&
      msg.data?.username &&
      msg.data?.password
    ) {
      showLoginIframe({
        ...msg.data,
        ...loginDetectContext({
          href: window.location.href,
          title: document.title
        })
      })
      return
    }
  })
  .catch((err) => {
    logger.error('Error getting pending login:', err)
  })

// Display Pearpass logo

function isFieldElementUsable(element) {
  if (!element || element.isConnected === false) {
    return false
  }

  if (
    typeof element.getClientRects === 'function' &&
    element.getClientRects().length === 0
  ) {
    return false
  }

  const rect = element.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) {
    return false
  }

  const style = window.getComputedStyle(element)
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  ) {
    return false
  }

  return true
}

function cleanupOrphanedFieldIframes() {
  for (const type of [IFRAME_TYPES.logo, IFRAME_TYPES.passwordSuggestion]) {
    const iframeData = getIframeData(type)
    if (!iframeData?.element) {
      continue
    }
    if (!isFieldElementUsable(iframeData.element)) {
      removeIframe(iframeData)
    }
  }
}

function showLogoForField(field) {
  if (!isAutoFillEnabled) {
    return
  }
  if (!isFieldElementUsable(field)) {
    return
  }
  const rect = field.getBoundingClientRect()

  const iframe = showIframe(IFRAME_TYPES.logo, {
    element: field,
    data: {
      url: window.location.href,
      recordType: getRecordTypeByField(field),
      fillMode: isOtpField(field) ? 'otp' : undefined
    },
    styles: {
      top: `${rect.top + (rect.height - LOGO_SIZE) / 2}px`,
      left: `${rect.left + rect.width - LOGO_SIZE - LOGO_PADDING}px`,
      width: '0px',
      height: '0px',
      borderRadius: '50%'
    }
  })

  return iframe
}

function hideLogoOnOutsideClick(event) {
  const element = event.target

  const logoIframeData = getIframeData(IFRAME_TYPES.logo)

  if (
    !logoIframeData ||
    element.isSameNode(logoIframeData?.element) ||
    element.isSameNode(logoIframeData?.iframe)
  ) {
    return
  }

  if (
    logoIframeData.element &&
    document.activeElement &&
    logoIframeData.element.isSameNode(document.activeElement)
  ) {
    return
  }

  removeIframe(logoIframeData)
}

function getRecordTypeByField(field) {
  if (isUsernameField(field) || isPasswordField(field)) {
    return 'login'
  }

  // OTP before credit card: autocomplete=one-time-code / otp fields win over
  // "Security code" label heuristics; isOtpField still vetoes real CVV via
  // isCreditCardField for non-autocomplete cases.
  // Reuse login recordType so site-filtered login list (useFilteredRecords) works
  if (isOtpField(field)) {
    return 'login'
  }

  if (isCreditCardField(field)) {
    return RECORD_TYPES.CREDIT_CARD
  }

  if (isIdentityField(field)) {
    return 'identity'
  }

  return null
}

function isAcceptedField(field) {
  return (
    isUsernameField(field) ||
    isPasswordField(field) ||
    isCreditCardField(field) ||
    isOtpField(field) ||
    isIdentityField(field)
  )
}

function toggleLogoOnFocus(event) {
  const element = event.target

  if (!logoAttachGuard.onFocus(element)) {
    return
  }

  const logoIframeData = getIframeData(IFRAME_TYPES.logo)

  if (logoIframeData) {
    removeIframe(logoIframeData)
  }

  if (!(element instanceof HTMLInputElement)) {
    return
  }

  if (isAcceptedField(element)) {
    scheduleShowLogoForField(element, {
      isUsable: isFieldElementUsable,
      show: attachLogoForField
    })
  }
}

function attachLogoForField(field) {
  if (document.activeElement !== field) {
    return
  }
  if (!logoAttachGuard.canAttach(field)) {
    return
  }
  const existing = getIframeData(IFRAME_TYPES.logo)
  if (existing?.element?.isSameNode?.(field)) {
    return
  }
  if (existing) {
    removeIframe(existing)
  }
  showLogoForField(field)
}

function attachLogoToActiveField() {
  const active = document.activeElement
  if (!(active instanceof HTMLInputElement)) {
    return
  }
  if (!isAcceptedField(active)) {
    return
  }
  scheduleShowLogoForField(active, {
    isUsable: isFieldElementUsable,
    show: attachLogoForField
  })
}

document.querySelectorAll('input').forEach(async (input) => {
  try {
    if (!(await isContentScriptEnabled())) {
      return
    }
  } catch {
    return
  }

  if (input.autofocus && isAcceptedField(input)) {
    showLogoForField(input)
  }
})

// Iframe management

function showIframe(iframeType, { element, data, styles }) {
  const id = crypto.randomUUID()

  const iframe = createIframe({
    styles: styles,
    options: { id: id, type: iframeType }
  })

  document.body.appendChild(iframe)

  activeIframes.add({
    id: id,
    type: iframeType,
    iframe: iframe,
    element: element,
    styles: styles,
    data: data
  })

  return iframe
}

function removeIframe(iframeData) {
  iframeData.iframe.remove()
  activeIframes.delete(iframeData)
}

function removeIframesOnScrollOrResize() {
  activeIframes.forEach((iframeData) => {
    if (iframeData.type === IFRAME_TYPES.logo) {
      removeIframe(iframeData)
    }
  })
}

function getIframeData(type) {
  return Array.from(activeIframes).find(
    (iframeData) => iframeData.type === type
  )
}

function sendDataToIframe({ iframeType, iframeData }) {
  const extensionOrigin = runtime.getURL('').slice(0, -1)

  iframeData?.iframe?.contentWindow?.postMessage(
    {
      type: iframeType,
      data: iframeData.data
    },
    extensionOrigin
  )
}

function updateIframeStyles({ msg, iframeData }) {
  Object.entries(msg?.data.style).forEach(([key, value]) => {
    iframeData.iframe.style[key] = value
  })

  const style = iframeData.iframe.style
  const width = parseFloat(style.width)
  const height = parseFloat(style.height)
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return
  }

  const top = parseFloat(style.top)
  const left = parseFloat(style.left)
  if (!Number.isFinite(top) || !Number.isFinite(left)) {
    return
  }

  const clamped = clampPopupPosition({
    top,
    left,
    width,
    height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  })

  style.top = `${clamped.top}px`
  style.left = `${clamped.left}px`
}

function handleWindowEvent(event) {
  const data = event.data

  if (data.source !== 'pearpass') {
    return
  }

  const type = data.type

  if (type === CONTENT_MESSAGE_TYPES.CREATE_PASSKEY) {
    runtime.sendMessage({
      type: MESSAGE_TYPES.CREATE_PASSKEY,
      requestId: data.requestId,
      publicKey: data.publicKey,
      requestOrigin: data.requestOrigin
    })
  }

  if (type === CONTENT_MESSAGE_TYPES.GET_PASSKEY) {
    runtime.sendMessage({
      type: MESSAGE_TYPES.GET_PASSKEY,
      requestId: data.requestId,
      publicKey: data.publicKey,
      mediation: data.mediation,
      requestOrigin: data.requestOrigin
    })
  }
}

const handleIframeEvent = (event) => {
  const msg = event.data
  const eventType = msg?.type
  const iframeId = msg?.data?.iframeId
  const iframeType = msg?.data?.iframeType

  const iframeData = Array.from(activeIframes).find(
    (iframeData) => iframeData.id === iframeId
  )

  const extensionOrigin = runtime.getURL('').slice(0, -1)

  if (
    !eventType ||
    event.origin !== extensionOrigin ||
    event.source !== iframeData?.iframe?.contentWindow
  ) {
    return
  }

  if (eventType === 'ready') {
    sendDataToIframe({
      iframeType: iframeType,
      iframeData: iframeData
    })
    return
  }

  if (eventType === 'setStyles') {
    updateIframeStyles({ msg, iframeData })
    return
  }

  if (eventType === 'showAutofillPopup') {
    const iframeRect = iframeData.iframe.getBoundingClientRect()

    const logoIframeData = getIframeData(IFRAME_TYPES.logo)

    showAutofillPopup({
      recordType: logoIframeData?.data?.recordType,
      fillMode: logoIframeData?.data?.fillMode,
      positions: positionPopupFromLogo({
        logoTop: iframeRect.top,
        logoLeft: iframeRect.left,
        logoWidth: iframeRect.width,
        logoHeight: iframeRect.height,
        popupWidth: 300,
        popupHeight: 200,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      })
    })
    return
  }

  if (eventType === 'autofillLogin') {
    const { username, password, otpCode } = msg.data

    handleAutoFillLoginFromPopup({
      username,
      password,
      otpCode,
      iframeData
    })
    return
  }

  if (eventType === 'autofillIdentity') {
    const { name, email, phoneNumber, address, zip, city, region, country } =
      msg.data

    handleAutoFillIdentityFromPopup({
      name,
      email,
      phoneNumber,
      address,
      zip,
      city,
      region,
      country,
      iframeData
    })
    return
  }

  if (eventType === 'autofillCreditCard') {
    const { cardNumber, cardholderName, expireDate, securityCode } = msg.data

    handleAutoFillCreditCardFromPopup({
      cardNumber,
      cardholderName,
      expireDate,
      securityCode,
      iframeData
    })
    return
  }

  if (eventType === 'insertPassword') {
    const { password } = msg.data

    handleInsertPassword({
      password,
      iframeData
    })
    return
  }

  if (eventType === 'close') {
    if (iframeData?.type === IFRAME_TYPES.logo) {
      logoAttachGuard.onLogoClosed(iframeData.element)
    }
    removeIframe(iframeData)
    return
  }
}
