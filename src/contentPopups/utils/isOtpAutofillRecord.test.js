import { RECORD_TYPES } from 'lockwright-lib-vault'

import { isOtpAutofillRecord } from './isOtpAutofillRecord'

describe('isOtpAutofillRecord', () => {
  it('includes a login with otpPublic', () => {
    expect(
      isOtpAutofillRecord({
        type: RECORD_TYPES.LOGIN,
        otpPublic: { type: 'TOTP', currentCode: '123456' },
        data: { websites: ['https://dashboard.stripe.com'] }
      })
    ).toBe(true)
  })

  it('includes a login with otpInput when otpPublic is not hydrated', () => {
    expect(
      isOtpAutofillRecord({
        type: RECORD_TYPES.LOGIN,
        data: { otpInput: 'JBSWY3DPEHPK3PXP' }
      })
    ).toBe(true)
  })

  it('excludes a site-matched login with no authenticator', () => {
    expect(
      isOtpAutofillRecord({
        type: RECORD_TYPES.LOGIN,
        data: {
          username: 'ada',
          password: 'secret',
          websites: ['https://dashboard.stripe.com']
        }
      })
    ).toBe(false)
  })
})
