import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

const mockCreateTab = jest.fn()

Object.assign(globalThis, {
  chrome: {
    tabs: {
      create: mockCreateTab
    }
  }
})

jest.mock('lockwright-lib-constants', () => ({
  PEARPASS_WEBSITE: 'https://lockwright.dexterity.works'
}))

jest.mock('lockwright-lib-ui-react-native-components', () => ({
  __esModule: true,
  PageHeader: ({
    title,
    subtitle
  }: {
    title: React.ReactNode
    subtitle?: React.ReactNode
  }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  ),
  Button: ({
    children,
    onClick,
    type,
    'data-testid': dataTestid
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    iconBefore?: React.ReactNode
    variant?: string
    size?: string
  }) => (
    <button type={type} onClick={onClick} data-testid={dataTestid}>
      {children}
    </button>
  )
}))

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  __esModule: true,
  Send: () => <span data-testid="icon-send" />
}))

import { ReportAProblemContent } from './index'

describe('ReportAProblemContent', () => {
  beforeEach(() => {
    mockCreateTab.mockReset()
  })

  it('renders the page header and an enabled open-form button', () => {
    render(<ReportAProblemContent />)

    expect(screen.getByTestId('settings-report-a-problem')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Report a problem' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('settings-report-a-problem-open')).toBeEnabled()
    expect(
      screen.queryByTestId('settings-report-a-problem-message')
    ).not.toBeInTheDocument()
  })

  it('opens the Lockwright contact form', () => {
    render(<ReportAProblemContent />)

    fireEvent.click(screen.getByTestId('settings-report-a-problem-open'))

    expect(mockCreateTab).toHaveBeenCalledTimes(1)
    expect(mockCreateTab).toHaveBeenCalledWith({
      url: 'https://lockwright.dexterity.works/contact/'
    })
  })
})
