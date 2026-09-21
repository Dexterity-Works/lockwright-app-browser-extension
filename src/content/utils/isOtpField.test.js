import { isCreditCardField } from './isCreditCardField'
import { isOtpField } from './isOtpField'

describe('isOtpField', () => {
  let inputElement

  beforeEach(() => {
    inputElement = document.createElement('input')
    inputElement.type = 'text'
  })

  it('returns true for DigitalOcean-like one-time-code input', () => {
    inputElement.name = 'code'
    inputElement.id = 'code'
    inputElement.setAttribute('autocomplete', 'one-time-code')
    inputElement.placeholder = 'Enter 6-digit code'
    inputElement.setAttribute('data-testid', 'code-input')

    expect(isOtpField(inputElement)).toBe(true)
  })

  it('returns true when autocomplete is one-time-code alone', () => {
    inputElement.setAttribute('autocomplete', 'one-time-code')

    expect(isOtpField(inputElement)).toBe(true)
  })

  it('returns true for strong totp / verification field names', () => {
    inputElement.name = 'totp'
    expect(isOtpField(inputElement)).toBe(true)

    inputElement.name = 'verificationCode'
    expect(isOtpField(inputElement)).toBe(true)

    inputElement.name = 'twoFactorCode'
    expect(isOtpField(inputElement)).toBe(true)
  })

  it('returns false for plain username field', () => {
    inputElement.name = 'username'
    inputElement.id = 'username'
    inputElement.placeholder = 'Username'

    expect(isOtpField(inputElement)).toBe(false)
  })

  it('returns false for credit-card security_code / CVV (credit-card wins)', () => {
    inputElement.name = 'security_code'
    inputElement.placeholder = 'CVV'

    expect(isCreditCardField(inputElement)).toBe(true)
    expect(isOtpField(inputElement)).toBe(false)
  })

  it('returns true for Affinity-like Security code OTP (one-time-code + label backup hint)', () => {
    document.body.innerHTML = ''
    const form = document.createElement('form')
    const label = document.createElement('label')
    label.htmlFor = 'otp'
    label.innerHTML =
      '<span>Security code</span><span>Enter your two-step verification security code. If you currently don’t have access to your device, you can enter one of your backup codes.</span>'
    const input = document.createElement('input')
    input.type = 'text'
    input.id = 'otp'
    input.name = 'otp'
    input.setAttribute('autocomplete', 'one-time-code')
    form.append(label, input)
    document.body.appendChild(form)

    expect(isCreditCardField(input)).toBe(false)
    expect(isOtpField(input)).toBe(true)
  })

  it('returns false for recovery / backup code fields', () => {
    inputElement.name = 'recovery_code'
    expect(isOtpField(inputElement)).toBe(false)

    inputElement.name = 'backupCode'
    expect(isOtpField(inputElement)).toBe(false)
  })

  it('returns true for ambiguous name=code when placeholder signals digits', () => {
    inputElement.name = 'code'
    inputElement.placeholder = 'Enter 6-digit code'

    expect(isOtpField(inputElement)).toBe(true)
  })

  it('returns true for a 2FA form whose code field is _auth_code and labeled OTP', () => {
    document.body.innerHTML = ''
    const form = document.createElement('form')
    form.action = '/2fa_check'
    const input = document.createElement('input')
    input.type = 'text'
    input.name = '_auth_code'
    input.id = '_auth_code'
    input.setAttribute('autocomplete', 'off')
    const label = document.createElement('label')
    label.htmlFor = '_auth_code'
    label.textContent = 'OTP*'
    form.append(input, label)
    document.body.appendChild(form)

    expect(isOtpField(input)).toBe(true)
  })
})
