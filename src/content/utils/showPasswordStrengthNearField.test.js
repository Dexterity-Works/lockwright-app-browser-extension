import { readFileSync } from 'fs'
import path from 'path'

import {
  checkPasswordStrength,
  PASSWORD_STRENGTH
} from 'lockwright-utils-password-check'

import { showPasswordStrengthNearField } from './showPasswordStrengthNearField'

jest.mock('./contentI18n.js', () => ({}))

jest.mock('lockwright-utils-password-check', () => {
  const actual = jest.requireActual('lockwright-utils-password-check')
  return {
    ...actual,
    checkPasswordStrength: jest.fn()
  }
})

const checkPasswordStrengthMock = checkPasswordStrength

function makeInput() {
  const input = document.createElement('input')
  input.type = 'password'
  document.body.appendChild(input)
  jest.spyOn(input, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    right: 500,
    top: 50,
    bottom: 80,
    width: 400,
    height: 30,
    x: 100,
    y: 50,
    toJSON: () => {}
  })
  return input
}

describe('showPasswordStrengthNearField', () => {
  it('does not assign innerHTML (AMO flags that in content.js)', () => {
    const source = readFileSync(
      path.join(__dirname, 'showPasswordStrengthNearField.js'),
      'utf8'
    )
    expect(source).not.toMatch(/\.innerHTML\s*=/)
  })

  let rafSpy

  beforeEach(() => {
    rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        cb(0)
        return 0
      })
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingRight: '0px'
    })
  })

  afterEach(() => {
    rafSpy.mockRestore()
    window.getComputedStyle.mockRestore()
    document.body.replaceChildren()
    jest.clearAllMocks()
  })

  it('does nothing when input is null', () => {
    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.SAFE,
      strengthType: 'success'
    })
    showPasswordStrengthNearField(null, 'secret')
    expect(document.querySelector('[data-pearpass-password-strength]')).toBe(
      null
    )
  })

  it('does nothing when password is empty', () => {
    const input = makeInput()
    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.SAFE,
      strengthType: 'success'
    })
    showPasswordStrengthNearField(input, '')
    expect(
      document.querySelector('[data-pearpass-password-strength]')
    ).toBeNull()
  })

  it('does nothing when checkPasswordStrength returns no type or strengthType', () => {
    const input = makeInput()
    checkPasswordStrengthMock.mockReturnValue({
      type: null,
      strengthType: null
    })
    showPasswordStrengthNearField(input, 'x')
    expect(
      document.querySelector('[data-pearpass-password-strength]')
    ).toBeNull()
  })

  it('renders Strong + VerifiedUser styling for SAFE', () => {
    const input = makeInput()
    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.SAFE,
      strengthType: 'success'
    })
    showPasswordStrengthNearField(input, 'SomePassword!1')

    const pill = document.querySelector('[data-pearpass-password-strength]')
    expect(pill).not.toBeNull()
    expect(pill.getAttribute('role')).toBe('status')
    expect(pill.textContent).toMatch(/Strong/)
    expect(
      pill.querySelector('[data-pearpass-icon="verified-user"]')
    ).not.toBeNull()
    expect(
      pill.querySelector('[data-pearpass-icon="pearpass-logo"]')
    ).not.toBeNull()
    expect(pill.children[0].style.background).toBe('rgb(21, 24, 14)')
    expect(pill.children[1].style.background).toBe('rgb(33, 40, 20)')
    expect(pill.children[1].style.color).toBe('rgb(190, 227, 90)')
  })

  it('renders Decent + GppMaybe color for WEAK', () => {
    const input = makeInput()
    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.WEAK,
      strengthType: 'warning'
    })
    showPasswordStrengthNearField(input, 'x')

    const pill = document.querySelector('[data-pearpass-password-strength]')
    expect(pill.textContent).toMatch(/Decent/)
    expect(
      pill.querySelector('[data-pearpass-icon="gpp-maybe"]')
    ).not.toBeNull()
    expect(pill.children[1].style.color).toBe('rgb(215, 210, 69)')
  })

  it('renders Vulnerable + GppBad color for VULNERABLE', () => {
    const input = makeInput()
    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.VULNERABLE,
      strengthType: 'error'
    })
    showPasswordStrengthNearField(input, 'x')

    const pill = document.querySelector('[data-pearpass-password-strength]')
    expect(pill.textContent).toMatch(/Vulnerable/)
    expect(pill.querySelector('[data-pearpass-icon="gpp-bad"]')).not.toBeNull()
    expect(pill.children[1].style.background).toBe('rgb(28, 28, 28)')
    expect(pill.children[1].style.color).toBe('rgb(209, 59, 61)')
  })

  it('replaces an existing strength pill on the same field', () => {
    const input = makeInput()
    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.SAFE,
      strengthType: 'success'
    })
    showPasswordStrengthNearField(input, 'a')
    const first = document.querySelectorAll('[data-pearpass-password-strength]')
    expect(first).toHaveLength(1)

    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.WEAK,
      strengthType: 'warning'
    })
    showPasswordStrengthNearField(input, 'b')

    const after = document.querySelectorAll('[data-pearpass-password-strength]')
    expect(after).toHaveLength(1)
    expect(after[0].textContent).toMatch(/Decent/)
  })

  it('sets input padding-right and fixed position on the overlay', () => {
    const input = makeInput()
    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.SAFE,
      strengthType: 'success'
    })
    showPasswordStrengthNearField(input, 'p')

    const pill = document.querySelector('[data-pearpass-password-strength]')
    expect(pill.style.position).toBe('fixed')
    expect(pill.style.left).toMatch(/px$/)
    expect(pill.style.top).toMatch(/px$/)
    expect(input.style.paddingRight).toMatch(/px$/)
  })

  it('removes pill and restores padding on input', () => {
    const input = makeInput()
    checkPasswordStrengthMock.mockReturnValue({
      type: PASSWORD_STRENGTH.SAFE,
      strengthType: 'success'
    })
    showPasswordStrengthNearField(input, 'p')
    expect(
      document.querySelector('[data-pearpass-password-strength]')
    ).not.toBe(null)

    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(
      document.querySelector('[data-pearpass-password-strength]')
    ).toBeNull()
  })
})
