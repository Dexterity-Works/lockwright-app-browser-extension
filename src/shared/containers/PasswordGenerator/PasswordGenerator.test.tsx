import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

type HistoryEntry = {
  id: string
  value: string
  createdAt: number
  contextLabel?: string
  contextKind?: string
  usedAt?: number
}

const mockAppendHistory = jest.fn(
  async (_value?: string): Promise<HistoryEntry[]> => []
)
const mockClearHistory = jest.fn(async (): Promise<HistoryEntry[]> => [])
const mockLoadHistory = jest.fn(async (): Promise<HistoryEntry[]> => [])
const mockCopyToClipboard = jest.fn()
const mockGeneratePassword = jest.fn(
  (_length?: number, _rules?: Record<string, boolean>) => 'Abcdef1!'
)

jest.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray | string) =>
    typeof strings === 'string' ? strings : strings[0]
}))

jest.mock('lockwright-utils-password-generator', () => ({
  generatePassword: (length: number, rules?: Record<string, boolean>) =>
    mockGeneratePassword(length, rules),
  generatePassphrase: () => ['word', 'list', 'here']
}))

jest.mock('lockwright-utils-password-check', () => ({
  checkPasswordStrength: () => ({ type: 'safe' }),
  checkPassphraseStrength: () => ({ type: 'safe' })
}))

jest.mock('lockwright-lib-vault/src/instances', () => ({
  pearpassVaultClient: {}
}))

jest.mock('../../utils/passwordGeneratorHistory', () => ({
  ...jest.requireActual('../../utils/passwordGeneratorHistory'),
  appendHistory: (value: string) => mockAppendHistory(value),
  clearHistory: () => mockClearHistory(),
  loadHistory: () => mockLoadHistory()
}))

let mockRecords: unknown[] | undefined = []
jest.mock('lockwright-lib-vault', () => ({
  useRecords: () => ({ data: mockRecords })
}))

jest.mock('../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({ copyToClipboard: mockCopyToClipboard })
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const React = require('react')
  const actual = jest.requireActual('lockwright-lib-ui-react-native-components')
  return {
    useTheme: () => ({
      theme: {
        colors: {
          colorTextSecondary: '#888',
          colorTextTertiary: '#666',
          colorPrimary: '#0a0',
          colorBorderPrimary: '#333'
        }
      }
    }),
    Button: ({
      children,
      onClick,
      'data-testid': dataTestId,
      'aria-label': ariaLabel
    }: {
      children?: React.ReactNode
      onClick?: () => void
      'data-testid'?: string
      'aria-label'?: string
      [key: string]: unknown
    }) =>
      React.createElement(
        'button',
        {
          type: 'button',
          onClick,
          'data-testid': dataTestId,
          'aria-label': ariaLabel
        },
        children
      ),
    Text: actual.Text,
    Title: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('h3', null, children),
    PasswordIndicator: () =>
      React.createElement('div', { 'data-testid': 'password-indicator' }),
    Radio: ({
      options,
      onChange
    }: {
      options: Array<{ value: string; label: string }>
      onChange?: (value: string) => void
    }) =>
      React.createElement(
        'div',
        null,
        options.map((option) =>
          React.createElement(
            'button',
            {
              key: option.value,
              type: 'button',
              onClick: () => onChange?.(option.value)
            },
            option.label
          )
        )
      ),
    Slider: ({
      value,
      onValueChange,
      testID,
      'aria-label': ariaLabel
    }: {
      value?: number
      onValueChange?: (value: number) => void
      testID?: string
      'aria-label'?: string
    }) =>
      React.createElement('input', {
        type: 'range',
        'data-testid': testID,
        'aria-label': ariaLabel,
        value: value ?? 0,
        onChange: (e: { target: { value: string } }) =>
          onValueChange?.(Number(e.target.value))
      }),
    InputField: ({
      value,
      onChange,
      onBlur,
      testID
    }: {
      value?: string
      onChange?: (e: { target: { value: string } }) => void
      onBlur?: () => void
      testID?: string
    }) =>
      React.createElement('input', {
        type: 'text',
        'data-testid': testID,
        value: value ?? '',
        onChange,
        onBlur
      }),
    ToggleSwitch: ({
      checked,
      onChange,
      'aria-label': ariaLabel
    }: {
      checked?: boolean
      onChange?: (next: boolean) => void
      'aria-label'?: string
    }) =>
      React.createElement('input', {
        type: 'checkbox',
        'aria-label': ariaLabel,
        checked: !!checked,
        onChange: (e: { target: { checked: boolean } }) =>
          onChange?.(e.target.checked)
      })
  }
})

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  ContentCopy: () => null
}))

import { PasswordGenerator } from './index'

describe('PasswordGenerator', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    mockAppendHistory.mockResolvedValue([
      { id: 'gen-1', value: 'Abcdef1!', createdAt: 2000 },
      {
        id: 'used-1',
        value: 'old-labeled',
        createdAt: 1000,
        contextLabel: 'example.com',
        contextKind: 'site',
        usedAt: 1500,
        uses: [
          { contextLabel: 'example.com', contextKind: 'site' },
          { contextLabel: 'Work bank', contextKind: 'entry' }
        ]
      },
      { id: 'old-1', value: 'old-unlabeled', createdAt: 500 }
    ])
    mockClearHistory.mockResolvedValue([])
    mockLoadHistory.mockResolvedValue([])
    mockGeneratePassword.mockClear()
    mockGeneratePassword.mockReturnValue('Abcdef1!')
    mockRecords = []
  })

  it('appends the generated password as an unlabeled history entry', async () => {
    render(<PasswordGenerator />)

    await waitFor(() => {
      expect(mockAppendHistory).toHaveBeenCalledWith('Abcdef1!')
    })
  })

  it('does not pass className into kit Text on history rows', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<PasswordGenerator />)

    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument()
      expect(screen.getByText('Work bank')).toBeInTheDocument()
    })

    const messages = error.mock.calls
      .map((args) => args.map(String).join(' '))
      .join('\n')
    expect(messages).not.toMatch(/invalid prop "className"/)
    error.mockRestore()
  })

  it('shows the vault entry that uses an unstamped history password', async () => {
    mockRecords = [
      { id: 'r1', data: { title: 'Mail account', password: 'old-unlabeled' } }
    ]

    render(<PasswordGenerator />)

    expect(await screen.findByText('Mail account')).toBeInTheDocument()
  })

  it('shows random-mode charset toggles, all on by default', () => {
    render(<PasswordGenerator />)

    expect(screen.getByLabelText('Capital letters')).toBeChecked()
    expect(screen.getByLabelText('Lowercase letters')).toBeChecked()
    expect(screen.getByLabelText('Numbers')).toBeChecked()
    expect(screen.getByLabelText('Special character (!&*)')).toBeChecked()
    expect(mockGeneratePassword).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        upperCase: true,
        lowerCase: true,
        numbers: true,
        includeSpecialChars: true
      })
    )
  })

  it('passes turned-off capital, lowercase, and numeric sets into generatePassword', () => {
    render(<PasswordGenerator />)
    mockGeneratePassword.mockClear()

    fireEvent.click(screen.getByLabelText('Capital letters'))
    expect(mockGeneratePassword).toHaveBeenLastCalledWith(
      20,
      expect.objectContaining({ upperCase: false, lowerCase: true })
    )

    fireEvent.click(screen.getByLabelText('Lowercase letters'))
    expect(mockGeneratePassword).toHaveBeenLastCalledWith(
      20,
      expect.objectContaining({ lowerCase: false, numbers: true })
    )

    fireEvent.click(screen.getByLabelText('Numbers'))
    expect(mockGeneratePassword).toHaveBeenLastCalledWith(
      20,
      expect.objectContaining({
        upperCase: false,
        lowerCase: false,
        numbers: false,
        includeSpecialChars: true
      })
    )
  })

  it('keeps the last remaining charset on so generation cannot run with an empty set', () => {
    render(<PasswordGenerator />)

    fireEvent.click(screen.getByLabelText('Capital letters'))
    fireEvent.click(screen.getByLabelText('Lowercase letters'))
    fireEvent.click(screen.getByLabelText('Numbers'))
    mockGeneratePassword.mockClear()

    fireEvent.click(screen.getByLabelText('Special character (!&*)'))

    expect(screen.getByLabelText('Special character (!&*)')).toBeChecked()
    expect(mockGeneratePassword).not.toHaveBeenCalled()
  })

  it('commits typed length into generatePassword on blur', () => {
    render(<PasswordGenerator />)
    mockGeneratePassword.mockClear()

    const lengthInput = screen.getByTestId('password-generator-length-input')
    fireEvent.change(lengthInput, { target: { value: '48' } })
    fireEvent.blur(lengthInput)

    expect(mockGeneratePassword).toHaveBeenLastCalledWith(
      48,
      expect.objectContaining({
        upperCase: true,
        lowerCase: true,
        numbers: true,
        includeSpecialChars: true
      })
    )
  })

  it('Generate re-runs generation with the current settings', async () => {
    render(<PasswordGenerator />)

    const lengthInput = screen.getByTestId('password-generator-length-input')
    fireEvent.change(lengthInput, { target: { value: '48' } })
    fireEvent.blur(lengthInput)

    mockGeneratePassword.mockClear()
    mockGeneratePassword.mockReturnValue('Len48Again!')
    mockAppendHistory.mockClear()

    fireEvent.click(screen.getByTestId('password-generator-generate'))

    expect(mockGeneratePassword).toHaveBeenCalledTimes(1)
    expect(mockGeneratePassword).toHaveBeenCalledWith(
      48,
      expect.objectContaining({
        upperCase: true,
        lowerCase: true,
        numbers: true,
        includeSpecialChars: true
      })
    )
    await waitFor(() => {
      expect(mockAppendHistory).toHaveBeenCalledWith('Len48Again!')
    })
  })

  it('copy button copies the current generated password', () => {
    render(<PasswordGenerator />)

    fireEvent.click(screen.getByTestId('password-generator-copy'))

    expect(mockCopyToClipboard).toHaveBeenCalledWith('Abcdef1!')
  })

  it('does not append history for intermediate slider values until release', async () => {
    render(<PasswordGenerator />)

    await waitFor(() => {
      expect(mockAppendHistory).toHaveBeenCalledTimes(1)
    })

    const slider = screen.getByTestId('password-generator-length-slider')
    fireEvent.mouseDown(slider)
    mockAppendHistory.mockClear()

    mockGeneratePassword.mockReturnValueOnce('slide-25')
    fireEvent.change(slider, { target: { value: '25' } })
    mockGeneratePassword.mockReturnValueOnce('slide-30')
    fireEvent.change(slider, { target: { value: '30' } })

    expect(mockAppendHistory).not.toHaveBeenCalled()

    fireEvent.mouseUp(window)

    await waitFor(() => {
      expect(mockAppendHistory).toHaveBeenCalledTimes(1)
    })
    expect(mockAppendHistory).toHaveBeenCalledWith('slide-30')
  })

  it('starts generatePassword with the last stored character count', () => {
    localStorage.setItem('password-generator-characters', '48')

    render(<PasswordGenerator />)

    expect(mockGeneratePassword).toHaveBeenCalledWith(
      48,
      expect.objectContaining({
        upperCase: true,
        lowerCase: true,
        numbers: true,
        includeSpecialChars: true
      })
    )
  })

  it('remembers the last character count on this device', () => {
    render(<PasswordGenerator />)

    fireEvent.change(screen.getByTestId('password-generator-length-slider'), {
      target: { value: '36' }
    })

    expect(localStorage.getItem('password-generator-characters')).toBe('36')
  })
})
