import { renderHook, act, waitFor } from '@testing-library/react'

import { useCopyToClipboard } from './useCopyToClipboard'
import { LOCAL_STORAGE_KEYS } from '../constants/storage'

jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ setToast: jest.fn() })
}))

jest.mock('lockwright-lib-constants', () => ({
  CLIPBOARD_CLEAR_TIMEOUT: 30000
}))

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  Check: () => null
}))

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve())
  }
})

jest.useFakeTimers()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  test('initial state is not copied', () => {
    const { result } = renderHook(() => useCopyToClipboard())
    expect(result.current.isCopied).toBe(false)
  })

  test('copyToClipboard calls navigator.clipboard.writeText with correct text', () => {
    const { result } = renderHook(() => useCopyToClipboard())

    act(() => {
      result.current.copyToClipboard('test text')
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
  })

  test('isCopied becomes true after successful copy', async () => {
    navigator.clipboard.writeText.mockResolvedValueOnce()
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      result.current.copyToClipboard('test text')
    })

    await waitFor(() => {
      expect(result.current.isCopied).toBe(true)
    })
  })

  test('isCopied becomes false after timeout', async () => {
    navigator.clipboard.writeText.mockResolvedValueOnce()
    const { result } = renderHook(() => useCopyToClipboard())

    act(() => {
      result.current.copyToClipboard('test text')
    })

    await act(async () => {
      await Promise.resolve()
      jest.runAllTimers()
    })

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.isCopied).toBe(false)
  })

  test('onCopy callback is called when copying is successful', async () => {
    const onCopy = jest.fn()
    navigator.clipboard.writeText.mockResolvedValueOnce()
    const { result } = renderHook(() => useCopyToClipboard({ onCopy }))

    act(() => {
      result.current.copyToClipboard('test text')
    })

    await act(async () => {
      await Promise.resolve()
      jest.runAllTimers()
    })

    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  test('returns false when clipboard API is not available', () => {
    const originalClipboard = navigator.clipboard
    delete navigator.clipboard

    const { result } = renderHook(() => useCopyToClipboard())

    let returnValue
    act(() => {
      returnValue = result.current.copyToClipboard('test text')
    })

    expect(returnValue).toBe(false)

    navigator.clipboard = originalClipboard
  })

  test('initial state includes isCopyToClipboardEnabled=true', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const { result } = renderHook(() => useCopyToClipboard())
    expect(result.current.isCopyToClipboardEnabled).toBe(true)
  })

  test('initial state shows disabled when localStorage has false value', () => {
    localStorageMock.getItem.mockReturnValue('false')
    const { result } = renderHook(() => useCopyToClipboard())
    expect(result.current.isCopyToClipboardEnabled).toBe(false)
  })

  test('handleCopyToClipboardSettingChange sets localStorage to false when disabled', () => {
    const { result } = renderHook(() => useCopyToClipboard())

    act(() => {
      result.current.handleCopyToClipboardSettingChange(false)
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      LOCAL_STORAGE_KEYS.COPY_TO_CLIPBOARD_ENABLED,
      'false'
    )
    expect(result.current.isCopyToClipboardEnabled).toBe(false)
  })

  test('handleCopyToClipboardSettingChange removes localStorage key when enabled', () => {
    const { result } = renderHook(() => useCopyToClipboard())

    act(() => {
      result.current.handleCopyToClipboardSettingChange(true)
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      LOCAL_STORAGE_KEYS.COPY_TO_CLIPBOARD_ENABLED
    )
    expect(result.current.isCopyToClipboardEnabled).toBe(true)
  })

  test('copyToClipboard returns false when copy to clipboard is disabled', () => {
    localStorageMock.getItem.mockReturnValue('false')
    const { result } = renderHook(() => useCopyToClipboard())

    let returnValue
    act(() => {
      returnValue = result.current.copyToClipboard('test text')
    })

    expect(returnValue).toBe(false)
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })

  test('copyToClipboard works normally when copy to clipboard is enabled', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const { result } = renderHook(() => useCopyToClipboard())

    act(() => {
      result.current.copyToClipboard('test text')
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
  })

  test('does not replace the clipboard when replacement is turned off', async () => {
    localStorageMock.getItem.mockImplementation((key) =>
      key === LOCAL_STORAGE_KEYS.CLIPBOARD_CLEAR_ENABLED ? 'false' : null
    )
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      result.current.copyToClipboard('secret')
      await Promise.resolve()
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('secret')
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  test('hook returns all expected properties', () => {
    const { result } = renderHook(() => useCopyToClipboard())

    expect(result.current).toHaveProperty('isCopied')
    expect(result.current).toHaveProperty('copyToClipboard')
    expect(result.current).toHaveProperty('handleCopyToClipboardSettingChange')
    expect(result.current).toHaveProperty('isCopyToClipboardEnabled')

    expect(typeof result.current.isCopied).toBe('boolean')
    expect(typeof result.current.copyToClipboard).toBe('function')
    expect(typeof result.current.handleCopyToClipboardSettingChange).toBe(
      'function'
    )
    expect(typeof result.current.isCopyToClipboardEnabled).toBe('boolean')
  })
})
