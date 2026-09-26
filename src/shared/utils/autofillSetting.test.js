import {
  getAutofillEnabled,
  setAutofillEnabled,
  onAutofillEnabledChanged
} from './autofillSetting'
import { CHROME_STORAGE_KEYS } from '../constants/storage'

describe('autofillSetting', () => {
  let mockChromeStorage
  let mockChromeStorageOnChanged

  beforeEach(() => {
    mockChromeStorage = {
      local: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    mockChromeStorageOnChanged = {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }

    global.chrome = {
      storage: {
        ...mockChromeStorage,
        onChanged: mockChromeStorageOnChanged
      }
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete global.chrome
  })

  describe('getAutofillEnabled', () => {
    it('should return true when chrome storage is not available', async () => {
      global.chrome = undefined

      const result = await getAutofillEnabled()

      expect(result).toBe(true)
    })

    it('should return true when chrome storage local is not available', async () => {
      global.chrome = {}

      const result = await getAutofillEnabled()

      expect(result).toBe(true)
    })

    it('should return true when chrome storage local get is not available', async () => {
      global.chrome = {
        storage: {}
      }

      const result = await getAutofillEnabled()

      expect(result).toBe(true)
    })

    it('should return true when autofill setting is not set', async () => {
      mockChromeStorage.local.get.mockResolvedValue({})

      const result = await getAutofillEnabled()

      expect(result).toBe(true)
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(
        CHROME_STORAGE_KEYS.AUTOFILL_ENABLED
      )
    })

    it('should return true when autofill setting is explicitly true', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: true
      })

      const result = await getAutofillEnabled()

      expect(result).toBe(true)
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(
        CHROME_STORAGE_KEYS.AUTOFILL_ENABLED
      )
    })

    it('should return false when autofill setting is explicitly false', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: false
      })

      const result = await getAutofillEnabled()

      expect(result).toBe(false)
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(
        CHROME_STORAGE_KEYS.AUTOFILL_ENABLED
      )
    })

    it('should return true for any other truthy value', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: 'enabled'
      })

      const result = await getAutofillEnabled()

      expect(result).toBe(true)
    })

    it('defaults to enabled when storage fails', async () => {
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'))

      await expect(getAutofillEnabled()).resolves.toBe(true)
    })
  })

  describe('setAutofillEnabled', () => {
    it('should do nothing when chrome storage is not available', async () => {
      global.chrome = undefined

      await setAutofillEnabled(true)

      expect(mockChromeStorage?.local?.set).not.toHaveBeenCalled()
    })

    it('should do nothing when chrome storage local is not available', async () => {
      global.chrome = {}

      await setAutofillEnabled(false)

      expect(mockChromeStorage?.local?.set).not.toHaveBeenCalled()
    })

    it('should do nothing when chrome storage local set is not available', async () => {
      global.chrome = {
        storage: {}
      }

      await setAutofillEnabled(true)

      expect(mockChromeStorage?.local?.set).not.toHaveBeenCalled()
    })

    it('should set autofill enabled to true', async () => {
      mockChromeStorage.local.set.mockResolvedValue()

      await setAutofillEnabled(true)

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: true
      })
    })

    it('should set autofill enabled to false', async () => {
      mockChromeStorage.local.set.mockResolvedValue()

      await setAutofillEnabled(false)

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: false
      })
    })

    it('should handle storage errors gracefully', async () => {
      mockChromeStorage.local.set.mockRejectedValue(new Error('Storage error'))

      await expect(setAutofillEnabled(true)).rejects.toThrow('Storage error')
    })
  })

  describe('onAutofillEnabledChanged', () => {
    it('should return empty function when chrome storage is not available', () => {
      global.chrome = undefined

      const unsubscribe = onAutofillEnabledChanged(() => {})

      expect(typeof unsubscribe).toBe('function')
      expect(mockChromeStorageOnChanged.addListener).not.toHaveBeenCalled()
    })

    it('should return empty function when chrome storage onChanged is not available', () => {
      global.chrome = {
        storage: mockChromeStorage
      }

      const unsubscribe = onAutofillEnabledChanged(() => {})

      expect(typeof unsubscribe).toBe('function')
      expect(mockChromeStorageOnChanged.addListener).not.toHaveBeenCalled()
    })

    it('should add listener and return unsubscribe function', () => {
      const callback = jest.fn()
      const unsubscribe = onAutofillEnabledChanged(callback)

      expect(typeof unsubscribe).toBe('function')
      expect(mockChromeStorageOnChanged.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    it('should call callback when autofill setting changes to true', () => {
      const callback = jest.fn()
      onAutofillEnabledChanged(callback)

      // Get the handler function that was passed to addListener
      const handler = mockChromeStorageOnChanged.addListener.mock.calls[0][0]

      // Simulate storage change
      const changes = {
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: {
          newValue: true
        }
      }
      handler(changes, 'local')

      expect(callback).toHaveBeenCalledWith(true)
    })

    it('should call callback when autofill setting changes to false', () => {
      const callback = jest.fn()
      onAutofillEnabledChanged(callback)

      // Get the handler function that was passed to addListener
      const handler = mockChromeStorageOnChanged.addListener.mock.calls[0][0]

      // Simulate storage change
      const changes = {
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: {
          newValue: false
        }
      }
      handler(changes, 'local')

      expect(callback).toHaveBeenCalledWith(false)
    })

    it('should call callback with true when autofill setting is removed (undefined)', () => {
      const callback = jest.fn()
      onAutofillEnabledChanged(callback)

      // Get the handler function that was passed to addListener
      const handler = mockChromeStorageOnChanged.addListener.mock.calls[0][0]

      // Simulate storage change with undefined newValue
      const changes = {
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: {
          newValue: undefined
        }
      }
      handler(changes, 'local')

      expect(callback).toHaveBeenCalledWith(true)
    })

    it('should not call callback for non-local storage changes', () => {
      const callback = jest.fn()
      onAutofillEnabledChanged(callback)

      // Get the handler function that was passed to addListener
      const handler = mockChromeStorageOnChanged.addListener.mock.calls[0][0]

      // Simulate storage change in sync area
      const changes = {
        [CHROME_STORAGE_KEYS.AUTOFILL_ENABLED]: {
          newValue: false
        }
      }
      handler(changes, 'sync')

      expect(callback).not.toHaveBeenCalled()
    })

    it('should not call callback for unrelated storage changes', () => {
      const callback = jest.fn()
      onAutofillEnabledChanged(callback)

      // Get the handler function that was passed to addListener
      const handler = mockChromeStorageOnChanged.addListener.mock.calls[0][0]

      // Simulate unrelated storage change
      const changes = {
        'other-setting': {
          newValue: 'some value'
        }
      }
      handler(changes, 'local')

      expect(callback).not.toHaveBeenCalled()
    })

    it('should unsubscribe correctly', () => {
      const callback = jest.fn()
      const unsubscribe = onAutofillEnabledChanged(callback)

      expect(mockChromeStorageOnChanged.addListener).toHaveBeenCalledTimes(1)

      unsubscribe()

      expect(mockChromeStorageOnChanged.removeListener).toHaveBeenCalledWith(
        mockChromeStorageOnChanged.addListener.mock.calls[0][0]
      )
    })

    it('should handle multiple subscriptions', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      const unsubscribe1 = onAutofillEnabledChanged(callback1)
      const unsubscribe2 = onAutofillEnabledChanged(callback2)

      expect(mockChromeStorageOnChanged.addListener).toHaveBeenCalledTimes(2)

      unsubscribe1()
      unsubscribe2()

      expect(mockChromeStorageOnChanged.removeListener).toHaveBeenCalledTimes(2)
    })
  })
})
