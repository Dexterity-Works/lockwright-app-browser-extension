import { act, renderHook } from '@testing-library/react'
import { useUserData, useVaults } from '@tetherto/pearpass-lib-vault'

import { useAutoLockPreferences } from './useAutoLockPreferences'
import { useInactivity } from './useInactivity'
import { useLoadingContext } from '../shared/context/LoadingContext'
import { useModal } from '../shared/context/ModalContext'
import { useRouter } from '../shared/context/RouterContext'

jest.mock('@tetherto/pearpass-lib-vault', () => ({
  useUserData: jest.fn(),
  useVaults: jest.fn()
}))
jest.mock('./useAutoLockPreferences', () => ({
  useAutoLockPreferences: jest.fn()
}))
jest.mock('../shared/context/LoadingContext', () => ({
  useLoadingContext: jest.fn()
}))
jest.mock('../shared/context/ModalContext', () => ({
  useModal: jest.fn()
}))
jest.mock('../shared/context/RouterContext', () => ({
  useRouter: jest.fn()
}))
jest.mock('../shared/utils/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn() }
}))

describe('useInactivity', () => {
  const refetchUser = jest.fn()
  const navigate = jest.fn()
  const setIsLoading = jest.fn()
  const closeAllModals = jest.fn()
  const resetState = jest.fn()

  beforeEach(() => {
    jest.useFakeTimers()
    refetchUser.mockReset()
    navigate.mockReset()
    setIsLoading.mockReset()
    closeAllModals.mockReset()
    resetState.mockReset()
    useAutoLockPreferences.mockReturnValue({
      isAutoLockEnabled: true,
      timeoutMs: 1000,
      shouldBypassAutoLock: false
    })
    useUserData.mockReturnValue({ refetch: refetchUser })
    useLoadingContext.mockReturnValue({ setIsLoading })
    useRouter.mockReturnValue({ navigate })
    useModal.mockReturnValue({ closeAllModals })
    useVaults.mockReturnValue({ resetState })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not throw when refetchUser resolves undefined', async () => {
    refetchUser.mockResolvedValue(undefined)

    renderHook(() => useInactivity())

    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(refetchUser).toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
