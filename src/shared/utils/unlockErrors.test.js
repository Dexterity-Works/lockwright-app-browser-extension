import { getUnlockErrorMessage, isWrongPasswordError } from './unlockErrors'

describe('isWrongPasswordError', () => {
  it.each([
    'MasterPasswordInvalid',
    'Error initializing with password: Error: Error decrypting vault key',
    'Error initializing with password: Error: Provided credentials do not match existing master encryption'
  ])('is true for %s', (message) => {
    expect(isWrongPasswordError(new Error(message))).toBe(true)
  })

  it('is false for a desktop failure', () => {
    expect(
      isWrongPasswordError(
        new Error('CLIENT_NOT_PAIRED: No client identity registered')
      )
    ).toBe(false)
  })
})

describe('getUnlockErrorMessage', () => {
  it('says the desktop app could not be reached for a connection code', () => {
    const error = Object.assign(new Error('Disconnected from native host'), {
      code: 'NATIVE_HOST_DISCONNECTED'
    })

    expect(getUnlockErrorMessage(error)).toMatch(
      /^Couldn't unlock\. The desktop app could not be reached \(NATIVE_HOST_DISCONNECTED\): /
    )
  })

  it('says the desktop app failed for any other code', () => {
    const error = Object.assign(new Error('CLIENT_NOT_PAIRED: nope'), {
      code: 'NOT_PAIRED'
    })

    expect(getUnlockErrorMessage(error)).toBe(
      "Couldn't unlock. The desktop app failed (NOT_PAIRED): CLIENT_NOT_PAIRED: nope"
    )
  })
})
