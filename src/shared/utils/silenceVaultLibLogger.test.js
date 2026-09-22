import { initializeUser } from 'lockwright-lib-vault/src/actions/initializeUser'
import userReducer from 'lockwright-lib-vault/src/slices/userSlice'
import { Logger } from 'lockwright-lib-vault/src/utils/logger.js'

import { logger } from './logger'
import { silenceVaultLibLogger } from './silenceVaultLibLogger'

describe('silenceVaultLibLogger', () => {
  it('skips original.error for expected quiet SerializedError args', () => {
    const originalError = jest.fn()
    const vaultLogger = { error: originalError }

    silenceVaultLibLogger(vaultLogger)

    vaultLogger.error({ message: 'MasterPasswordRequired' })

    expect(originalError).not.toHaveBeenCalled()
  })

  it('forwards expected quiet errors when debug logging is on', () => {
    const originalError = jest.fn()
    const vaultLogger = { error: originalError }
    logger.setDebugMode(true)
    silenceVaultLibLogger(vaultLogger)

    vaultLogger.error({ message: 'MasterPasswordInvalid' })

    expect(originalError).toHaveBeenCalledWith('MasterPasswordInvalid')
    logger.setDebugMode(false)
  })

  it('forwards a non-quiet SerializedError as its message', () => {
    const originalError = jest.fn()
    const vaultLogger = { error: originalError }

    silenceVaultLibLogger(vaultLogger)

    vaultLogger.error({ message: 'boom' })

    expect(originalError).toHaveBeenCalledWith('boom')
  })

  it('does not let Chrome stringify vault Logger.error(SerializedError) as [object Object]', () => {
    const vaultLogger = new Logger({ debugMode: false })
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    silenceVaultLibLogger(vaultLogger)
    vaultLogger.error({ name: 'Error', message: 'Rejected' })

    const chromeMessages = spy.mock.calls.map((call) => String(call[0]))
    expect(chromeMessages).not.toContain('[object Object]')
    expect(chromeMessages.some((message) => message.includes('Rejected'))).toBe(
      true
    )

    spy.mockRestore()
  })

  it('userSlice initializeUser.rejected does not console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    userReducer(undefined, {
      type: initializeUser.rejected.type,
      error: { name: 'Error', message: 'Rejected' }
    })

    expect(spy).not.toHaveBeenCalled()

    spy.mockRestore()
  })
})
