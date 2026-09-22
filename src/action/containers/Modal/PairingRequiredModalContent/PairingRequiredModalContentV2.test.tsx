import React from 'react'

import { act, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { PairingRequiredModalContent } from './PairingRequiredModalContent'

const mockTabsCreate = jest.fn()

let mockPairingState = {
  pairingToken: 'mock-token',
  setPairingToken: jest.fn(),
  identity: { name: 'MockUser' },
  loading: false,
  error: null,
  passwordError: null,
  hydrated: true,
  fetchIdentity: jest.fn(),
  completePairing: jest.fn(),
  clearPasswordError: jest.fn()
}

jest.mock('../../../../hooks/useDesktopPairing', () => ({
  useDesktopPairing: () => mockPairingState
}))

jest.mock('../../../../shared/utils/tabs', () => ({
  queryActiveTab: jest.fn(async () => ({
    id: 1,
    url: 'https://example.com'
  })),
  queryTabsByUrl: jest.fn(async () => [])
}))

jest.mock('@lingui/core/macro', () => ({ t: (str: string) => str }))
jest.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children
}))

jest.mock('lockwright-lib-ui-react-native-components', () => ({
  useTheme: () => ({
    theme: { colors: { colorTextSecondary: '#888888' } }
  }),
  Title: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Button: ({
    children,
    onClick,
    disabled
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  PasswordField: ({
    label,
    value,
    onChangeText,
    testID
  }: {
    label?: string
    value?: string
    onChangeText?: (v: string) => void
    testID?: string
  }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChangeText?.(e.target.value)
      }
      data-testid={testID}
    />
  )
}))

const mockLocalStorage = (tokenValue: string | null) => {
  jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(tokenValue)
}

const renderComponent = (onPairSuccess: () => void = jest.fn()) =>
  render(<PairingRequiredModalContent onPairSuccess={onPairSuccess} />)

describe('PairingRequiredModalContent - snapshot', () => {
  beforeEach(() => {
    mockLocalStorage('mock-token')
    mockTabsCreate.mockReset()
    mockPairingState = {
      pairingToken: 'mock-token',
      setPairingToken: jest.fn(),
      identity: { name: 'MockUser' },
      loading: false,
      error: null,
      passwordError: null,
      hydrated: true,
      fetchIdentity: jest.fn(),
      completePairing: jest.fn(),
      clearPasswordError: jest.fn()
    }
    global.chrome = {
      runtime: {
        getURL: (path) => `chrome-extension://id/${path}`
      },
      tabs: {
        create: mockTabsCreate,
        reload: jest.fn(),
        update: jest.fn()
      },
      windows: { update: jest.fn() }
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('renders master password form when token is present', () => {
    const { container } = renderComponent()
    expect(container).toMatchSnapshot()
  })

  it('keeps the password form after a wrong password so the user can retry', async () => {
    jest.useFakeTimers()
    mockPairingState.passwordError =
      'Invalid master password. Please try again.'

    renderComponent()

    expect(screen.getByTestId('pairing-password-input')).toBeInTheDocument()
    expect(screen.queryByText('Navigating to onboarding page...')).toBeNull()

    await act(async () => {
      jest.advanceTimersByTime(3000)
    })

    expect(mockTabsCreate).not.toHaveBeenCalled()
    expect(screen.getByTestId('pairing-password-input')).toBeInTheDocument()
  })
})
