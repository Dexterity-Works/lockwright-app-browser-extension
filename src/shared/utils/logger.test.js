import { Logger, logger } from './logger'

describe('Logger', () => {
  let consoleErrorSpy
  let consoleWarnSpy
  let consoleLogSpy

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleLogSpy.mockRestore()
    logger.setDebugMode(false)
  })

  it('should call console.error with the provided messages', () => {
    const messages = ['Error message 1', 'Error message 2']
    logger.error(...messages)

    expect(consoleErrorSpy).toHaveBeenCalledWith(...messages)
  })

  it('should not modify the messages passed to console.error', () => {
    const messages = ['Error message']
    logger.error(...messages)

    expect(consoleErrorSpy).toHaveBeenCalledWith(...messages)
    expect(messages).toEqual(['Error message'])
  })

  it('does not console.error expected user errors when debug is off', () => {
    const quiet = new Logger({ debugMode: false })
    quiet.error(
      'MessageBridge',
      "Handler error for message 'SECURE_CHANNEL_UNLOCK_CLIENT_KEYSTORE':",
      'MasterPasswordInvalid'
    )
    quiet.error(
      'Error unlocking secure channel keystore:',
      new Error('MasterPasswordInvalid')
    )
    quiet.error(
      '[VaultClient] Error in getMasterPasswordStatus:',
      new Error('Unknown method: getMasterPasswordStatus')
    )
    quiet.error(
      '[VaultClient] Error checking availability',
      new Error('Request timeout: checkAvailability')
    )
    quiet.error('[NativeMessaging]', 'Disconnected from native host', {
      message: 'Specified native messaging host not found.'
    })

    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('does not console.warn expected user errors when debug is off', () => {
    const quiet = new Logger({ debugMode: false })
    quiet.warn('MasterPasswordInvalid')

    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it('console.errors expected user errors when debug is on', () => {
    const debug = new Logger({ debugMode: true })
    const err = new Error('MasterPasswordInvalid')
    debug.error('Error unlocking keystore:', err)

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error unlocking keystore:',
      err
    )
  })

  it('setDebugMode turns expected-error logging on', () => {
    const quiet = new Logger({ debugMode: false })
    quiet.setDebugMode(true)
    quiet.error(new Error('MasterPasswordInvalid'))

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('log stays silent when debug is off', () => {
    const quiet = new Logger({ debugMode: false })
    quiet.log('pairing token pasted')

    expect(consoleLogSpy).not.toHaveBeenCalled()
  })
})
