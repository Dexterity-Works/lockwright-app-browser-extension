import React from 'react'

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { Step2Dialog } from './Step2Dialog'

jest.mock('@lingui/core/macro', () => ({ t: (str: string) => str }))
jest.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

jest.mock('@tetherto/pearpass-lib-ui-kit', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        colorLinkText: '#b08d57',
        colorTextPrimary: '#eee'
      }
    }
  }),
  Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Panel: ({
    title,
    children,
    testID
  }: {
    title: React.ReactNode
    children: React.ReactNode
    testID?: string
  }) => (
    <div data-testid={testID}>
      <header>{title}</header>
      {children}
    </div>
  ),
  InputField: ({ testID, label }: { testID?: string; label?: string }) => (
    <input data-testid={testID} aria-label={label} />
  ),
  Button: ({
    children,
    'data-testid': dataTestId
  }: {
    children: React.ReactNode
    'data-testid'?: string
  }) => <button data-testid={dataTestId}>{children}</button>
}))

jest.mock('@tetherto/pearpass-lib-ui-kit/icons', () => ({
  ContentPaste: () => <span />,
  Settings: () => <span />,
  SwapVert: () => <span />
}))

jest.mock('../shared/components/LockwrightMark', () => ({
  LockwrightMark: () => <span />
}))

jest.mock('../shared/services/pendingPairingStore', () => ({
  pendingPairingStore: { set: jest.fn(), clear: jest.fn(), get: jest.fn() }
}))

jest.mock('../shared/services/messageBridge', () => ({
  secureChannelMessages: { getIdentity: jest.fn() },
  platformMessages: { getPlatformInfo: jest.fn() }
}))

const { platformMessages } = require('../shared/services/messageBridge')

describe('Step2Dialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not ask for a desktop pair code on android', async () => {
    platformMessages.getPlatformInfo.mockResolvedValue({ os: 'android' })
    render(<Step2Dialog onNext={jest.fn()} />)

    expect(
      await screen.findByTestId('onboarding-android-pairing-unavailable')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('onboarding-step2-code-input')
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/does not issue a browser pair code/i)
    ).toBeInTheDocument()
  })

  it('shows the pair code field when the platform is not android', async () => {
    platformMessages.getPlatformInfo.mockResolvedValue({ os: 'linux' })
    render(<Step2Dialog onNext={jest.fn()} />)

    expect(
      await screen.findByTestId('onboarding-step2-code-input')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('onboarding-android-pairing-unavailable')
    ).not.toBeInTheDocument()
  })
})
