import { RECORD_TYPES } from 'lockwright-lib-vault'

import { isPasswordAutofillRecord } from './isPasswordAutofillRecord'

describe('isPasswordAutofillRecord', () => {
  it('includes password-only login', () => {
    expect(
      isPasswordAutofillRecord({
        type: RECORD_TYPES.LOGIN,
        data: { password: 'secret', username: 'a' }
      })
    ).toBe(true)
  })

  it('includes hybrid login with credential and password', () => {
    expect(
      isPasswordAutofillRecord({
        type: RECORD_TYPES.LOGIN,
        data: {
          password: 'secret',
          username: 'a',
          credential: { id: 'pk' }
        }
      })
    ).toBe(true)
  })

  it('excludes passkey-only login (credential, no password)', () => {
    expect(
      isPasswordAutofillRecord({
        type: RECORD_TYPES.LOGIN,
        data: {
          username: 'a',
          credential: { id: 'pk' }
        }
      })
    ).toBe(false)
  })

  it('excludes passkey-only login with empty password string', () => {
    expect(
      isPasswordAutofillRecord({
        type: RECORD_TYPES.LOGIN,
        data: {
          password: '',
          credential: { id: 'pk' }
        }
      })
    ).toBe(false)
  })

  it('includes non-login records (identity / credit card)', () => {
    expect(
      isPasswordAutofillRecord({
        type: RECORD_TYPES.IDENTITY,
        data: { fullName: 'Ada' }
      })
    ).toBe(true)
  })
})
