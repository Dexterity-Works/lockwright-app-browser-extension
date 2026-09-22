import React from 'react'

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useUserData, useVault, useVaults } from 'lockwright-lib-vault'

import { EnterMasterPassword } from './EnterMasterPassword'
import { AUTH_ERROR_PATTERNS } from '../../../../shared/constants/auth'
import { NAVIGATION_ROUTES } from '../../../../shared/constants/navigation'
import { useRouter } from '../../../../shared/context/RouterContext'
import { secureChannelMessages } from '../../../../shared/services/messageBridge'

jest.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray | string, ...values: unknown[]) =>
    Array.isArray(strings)
      ? strings.reduce(
          (acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ''),
          ''
        )
      : strings
}))

jest.mock('lockwright-lib-vault', () => ({
  useUserData: jest.fn(),
  useVault: jest.fn(),
  useVaults: jest.fn()
}))

jest.mock('../../../../shared/context/RouterContext', () => ({
  useRouter: jest.fn()
}))

jest.mock('../../../../shared/services/messageBridge', () => ({
  secureChannelMessages: {
    unlockClientKeystore: jest.fn()
  }
}))

jest.mock('../../../../shared/utils/logger', () => ({
  logger: { error: jest.fn(), log: jest.fn() }
}))

jest.mock('../../../app/hooks/useVaultOpenedRedirect', () => ({
  useVaultOpenedRedirect: () => jest.fn()
}))

jest.mock(
  '../../../containers/MasterPasswordPrompt/MasterPasswordPrompt',
  () => ({
    MasterPasswordPrompt: ({
      onSubmit,
      error
    }: {
      onSubmit: (password: string) => Promise<void> | void
      error?: string
    }) => (
      <div>
        <div data-testid="error">{error}</div>
        <button
          type="button"
          data-testid="submit"
          onClick={() => onSubmit('wrong-password')}
        >
          Submit
        </button>
      </div>
    )
  })
)

const mockUseUserData = useUserData as jest.Mock
const mockUseVault = useVault as jest.Mock
const mockUseVaults = useVaults as jest.Mock
const mockUseRouter = useRouter as jest.Mock

describe('EnterMasterPassword', () => {
  const navigate = jest.fn()
  const logIn = jest.fn()
  const refreshMasterPasswordStatus = jest.fn()
  const initVaults = jest.fn()
  const refetchVaults = jest.fn()
  const isVaultProtected = jest.fn()
  const refetchVault = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      navigate,
      currentPage: 'welcome'
    })
    mockUseUserData.mockReturnValue({
      logIn,
      refreshMasterPasswordStatus
    })
    mockUseVault.mockReturnValue({
      isVaultProtected,
      refetch: refetchVault
    })
    mockUseVaults.mockReturnValue({
      initVaults,
      refetch: refetchVaults
    })
  })

  it('shows remaining attempts when keystore rejects MasterPasswordInvalid', async () => {
    ;(
      secureChannelMessages.unlockClientKeystore as jest.Mock
    ).mockRejectedValue(new Error(AUTH_ERROR_PATTERNS.MASTER_PASSWORD_INVALID))
    refreshMasterPasswordStatus.mockResolvedValue({
      isLocked: false,
      remainingAttempts: 3
    })

    render(<EnterMasterPassword />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Incorrect password. You have 3 attempts before the app will be temporarily locked.'
      )
    })
    expect(logIn).not.toHaveBeenCalled()
  })

  it('uses singular "attempt" when one remains', async () => {
    ;(
      secureChannelMessages.unlockClientKeystore as jest.Mock
    ).mockRejectedValue(new Error(AUTH_ERROR_PATTERNS.MASTER_PASSWORD_INVALID))
    refreshMasterPasswordStatus.mockResolvedValue({
      isLocked: false,
      remainingAttempts: 1
    })

    render(<EnterMasterPassword />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Incorrect password. You have 1 attempt before the app will be temporarily locked.'
      )
    })
  })

  it('shows fallback message when remainingAttempts is missing', async () => {
    ;(
      secureChannelMessages.unlockClientKeystore as jest.Mock
    ).mockRejectedValue(new Error(AUTH_ERROR_PATTERNS.MASTER_PASSWORD_INVALID))
    refreshMasterPasswordStatus.mockResolvedValue({
      isLocked: false
    })

    render(<EnterMasterPassword />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Incorrect password. Please try again.'
      )
    })
    expect(screen.getByTestId('error').textContent).not.toContain('undefined')
  })

  it('shows fallback message when status is undefined', async () => {
    ;(
      secureChannelMessages.unlockClientKeystore as jest.Mock
    ).mockRejectedValue(new Error(AUTH_ERROR_PATTERNS.MASTER_PASSWORD_INVALID))
    refreshMasterPasswordStatus.mockResolvedValue(undefined)

    render(<EnterMasterPassword />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Incorrect password. Please try again.'
      )
    })
    expect(screen.getByTestId('error').textContent).not.toContain('undefined')
  })

  it('navigates to SCREEN_LOCKED when status is locked', async () => {
    ;(
      secureChannelMessages.unlockClientKeystore as jest.Mock
    ).mockRejectedValue(new Error(AUTH_ERROR_PATTERNS.MASTER_PASSWORD_INVALID))
    refreshMasterPasswordStatus.mockResolvedValue({
      isLocked: true,
      remainingAttempts: 0
    })

    render(<EnterMasterPassword />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('welcome', {
        params: { state: NAVIGATION_ROUTES.SCREEN_LOCKED }
      })
    })
    expect(logIn).not.toHaveBeenCalled()
  })

  it('shows fallback when status refresh fails after invalid keystore password', async () => {
    ;(
      secureChannelMessages.unlockClientKeystore as jest.Mock
    ).mockRejectedValue(new Error(AUTH_ERROR_PATTERNS.MASTER_PASSWORD_INVALID))
    refreshMasterPasswordStatus.mockRejectedValue(new Error('status failed'))

    render(<EnterMasterPassword />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Incorrect password. Please try again.'
      )
    })
    expect(logIn).not.toHaveBeenCalled()
  })

  it('proceeds to logIn when unlock succeeds', async () => {
    ;(
      secureChannelMessages.unlockClientKeystore as jest.Mock
    ).mockResolvedValue(undefined)
    logIn.mockResolvedValue(undefined)
    initVaults.mockResolvedValue(undefined)
    refetchVaults.mockResolvedValue([{ id: 'v1', name: 'Vault' }])
    isVaultProtected.mockResolvedValue(false)
    refetchVault.mockResolvedValue(undefined)

    render(<EnterMasterPassword />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(logIn).toHaveBeenCalledWith({ password: 'wrong-password' })
    })
  })
})
