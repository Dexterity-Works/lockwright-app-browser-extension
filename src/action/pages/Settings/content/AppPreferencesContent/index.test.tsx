import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

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
  Radio: ({
    options,
    value,
    onChange,
    testID
  }: {
    options: Array<{ value: string; label?: string; description?: string }>
    value?: string
    onChange?: (v: string) => void
    testID?: string
  }) => (
    <div role="radiogroup" data-testid={testID}>
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={option.value === value}
          data-testid={`${testID}-${option.value}`}
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Button: ({
    children,
    onClick,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
  Dropdown: ({
    trigger,
    children
  }: {
    trigger: React.ReactNode
    children: React.ReactNode
  }) => (
    <div>
      {trigger}
      <div role="menu">{children}</div>
    </div>
  ),
  NavbarListItem: ({
    label,
    onClick,
    testID
  }: {
    label?: string
    onClick?: () => void
    testID?: string
  }) => (
    <button data-testid={testID} onClick={onClick}>
      {label}
    </button>
  ),
  ToggleSwitch: ({
    checked,
    onChange,
    label,
    description,
    ...rest
  }: {
    checked?: boolean
    onChange?: (v: boolean) => void
    label?: string
    description?: string
  } & Record<string, unknown>) => (
    <label>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        {...(rest as Record<string, unknown>)}
      />
      <span>{label}</span>
      {description ? <small>{description}</small> : null}
    </label>
  ),
  useTheme: () => ({
    theme: { colors: { colorTextSecondary: '#000' } }
  })
}))

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  __esModule: true,
  KeyboardArrowBottom: () => <span data-testid="icon-arrow-down" />
}))

jest.mock('lockwright-lib-constants', () => ({
  __esModule: true,
  BE_AUTO_LOCK_ENABLED: true,
  AUTO_LOCK_TIMEOUT_OPTIONS: {
    SECONDS_30: { label: '30 seconds', value: 30_000 },
    MINUTES_1: { label: '1 minute', value: 60_000 },
    NEVER: { label: 'Never', value: null }
  }
}))

const mockSetAutofill = jest.fn(async () => undefined)
const mockGetAutofill = jest.fn(async () => true)
const mockGetDefaultUriMatch = jest.fn(async () => 'domain')
const mockSetDefaultUriMatch = jest.fn(async () => undefined)

jest.mock('../../../../../shared/utils/autofillSetting', () => ({
  __esModule: true,
  getAutofillEnabled: () => mockGetAutofill(),
  setAutofillEnabled: (v: boolean) => mockSetAutofill(v)
}))

jest.mock('../../../../../shared/utils/uriMatchSetting', () => ({
  __esModule: true,
  getDefaultUriMatchType: () => mockGetDefaultUriMatch(),
  setDefaultUriMatchType: (v: string) => mockSetDefaultUriMatch(v)
}))

jest.mock('../../../../../shared/utils/passkeyVerificationPreference', () => ({
  __esModule: true,
  getPasskeyVerificationPreference: () => 'requested'
}))

const mockLoadDebugLogging = jest.fn(async () => undefined)
const mockSetDebugLogging = jest.fn(async () => undefined)

jest.mock('../../../../../shared/utils/debugLogging', () => ({
  __esModule: true,
  loadDebugLogging: () => mockLoadDebugLogging(),
  setDebugLogging: (v: boolean) => mockSetDebugLogging(v)
}))

jest.mock('@lingui/react', () => ({
  __esModule: true,
  useLingui: () => ({ i18n: { _: (str: string) => str } })
}))

const mockSetTimeoutMs = jest.fn()
const mockSetAllowHttp = jest.fn()
const mockHandleCopyChange = jest.fn()

let mockTimeoutMs: number | null = 30_000
let mockIsAllowHttpEnabled = false
let mockIsCopyEnabled = true

jest.mock('../../../../../hooks/useAutoLockPreferences', () => ({
  __esModule: true,
  useAutoLockPreferences: () => ({
    timeoutMs: mockTimeoutMs,
    setTimeoutMs: mockSetTimeoutMs
  })
}))

jest.mock('../../../../../shared/hooks/useAllowHttpEnabled', () => ({
  __esModule: true,
  useAllowHttpEnabled: () => [mockIsAllowHttpEnabled, mockSetAllowHttp]
}))

jest.mock('../../../../../shared/hooks/useCopyToClipboard', () => ({
  __esModule: true,
  useCopyToClipboard: () => ({
    isCopyToClipboardEnabled: mockIsCopyEnabled,
    handleCopyToClipboardSettingChange: mockHandleCopyChange
  })
}))

jest.mock(
  '../../../../../shared/utils/isPasswordChangeReminderDisabled',
  () => ({
    __esModule: true,
    isPasswordChangeReminderDisabled: () => false
  })
)

import { i18n } from '@lingui/core'

import { messages } from '../../../../../locales/en/messages.mjs'

// Chromium action.js compiles t`…` to i18n._({ id }) with no source-message
// fallback. Drop the babel-plugin `message` field so this file matches that
// build: a lookup before i18n.load returns the hashed id.
const origI18nUnderscore = i18n._.bind(i18n)
i18n._ = (descriptor, values, options) => {
  if (descriptor && typeof descriptor === 'object' && descriptor.id) {
    return origI18nUnderscore(descriptor.id, values, options)
  }
  return origI18nUnderscore(descriptor, values, options)
}

// require() after the patch. import is hoisted and would freeze labels first.
const { AppPreferencesContent } = require('./index') as typeof import('./index')

describe('AppPreferencesContent', () => {
  afterAll(() => {
    i18n._ = origI18nUnderscore
  })

  beforeEach(() => {
    i18n.load('en', messages)
    i18n.activate('en')
    mockSetTimeoutMs.mockClear()
    mockSetAllowHttp.mockClear()
    mockHandleCopyChange.mockClear()
    mockSetAutofill.mockClear()
    mockGetAutofill.mockClear()
    mockGetAutofill.mockResolvedValue(true)
    mockGetDefaultUriMatch.mockClear()
    mockSetDefaultUriMatch.mockClear()
    mockGetDefaultUriMatch.mockResolvedValue('domain')
    mockLoadDebugLogging.mockClear()
    mockSetDebugLogging.mockClear()
    mockLoadDebugLogging.mockResolvedValue(undefined)
    mockTimeoutMs = 30_000
    mockIsAllowHttpEnabled = false
    mockIsCopyEnabled = true
    localStorage.clear()
  })

  it('renders the page header and both sections', () => {
    render(<AppPreferencesContent />)

    expect(screen.getByTestId('settings-app-preferences')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'App Preferences' })
    ).toBeInTheDocument()
    expect(screen.getByText('Autofill & Browsing')).toBeInTheDocument()
    expect(screen.getByText('Security Awareness')).toBeInTheDocument()
  })

  it('renders only in-scope fields (no Clear Clipboard, no Unlock Method)', () => {
    render(<AppPreferencesContent />)

    expect(screen.getByTestId('settings-autofill-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('settings-allow-http-toggle')).toBeInTheDocument()
    expect(
      screen.getByTestId('settings-default-uri-match-select')
    ).toBeInTheDocument()
    expect(screen.getByTestId('settings-auto-lock-select')).toBeInTheDocument()
    expect(
      screen.getByTestId('settings-copy-to-clipboard-toggle')
    ).toBeInTheDocument()
    expect(screen.getByTestId('settings-reminders-toggle')).toBeInTheDocument()
    expect(
      screen.getByTestId('settings-passkey-validation')
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('settings-debug-logging-toggle')
    ).toBeInTheDocument()

    expect(screen.queryByText('Clear Clipboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Unlock Method')).not.toBeInTheDocument()
    expect(screen.queryByText('Master Password')).not.toBeInTheDocument()
    expect(screen.queryByText('PIN Code')).not.toBeInTheDocument()
    expect(screen.queryByText('Biometrics')).not.toBeInTheDocument()
  })

  it('toggles Autofill through setAutofillEnabled', async () => {
    mockGetAutofill.mockResolvedValue(true)
    render(<AppPreferencesContent />)

    // wait for initial getAutofillEnabled to resolve
    await screen.findByTestId('settings-autofill-toggle')

    const toggle = screen.getByTestId('settings-autofill-toggle')
    fireEvent.click(toggle)

    expect(mockSetAutofill).toHaveBeenCalledWith(false)
  })

  it('writes passkey validation preference to localStorage on change', () => {
    render(<AppPreferencesContent />)

    fireEvent.click(screen.getByTestId('settings-passkey-validation-always'))

    expect(localStorage.getItem('passkey-verification-preference')).toBe(
      'always'
    )
  })

  it('toggles Allow non-secure websites through the hook', () => {
    render(<AppPreferencesContent />)

    const toggle = screen.getByTestId('settings-allow-http-toggle')
    fireEvent.click(toggle)

    expect(mockSetAllowHttp).toHaveBeenCalledWith(true)
  })

  it('toggles Copy to Clipboard through the hook', () => {
    render(<AppPreferencesContent />)

    const toggle = screen.getByTestId('settings-copy-to-clipboard-toggle')
    fireEvent.click(toggle)

    expect(mockHandleCopyChange).toHaveBeenCalledWith(false)
  })

  it('writes the reminders preference to localStorage when disabled', () => {
    render(<AppPreferencesContent />)

    const toggle = screen.getByTestId('settings-reminders-toggle')
    fireEvent.click(toggle)

    expect(localStorage.getItem('password-change-reminder-enabled')).toBe(
      'false'
    )
  })

  it('opens the auto-lock dropdown and calls setTimeoutMs on selection', () => {
    render(<AppPreferencesContent />)

    fireEvent.click(screen.getByTestId('settings-auto-lock-select'))
    fireEvent.click(screen.getByTestId('settings-auto-lock-option-minutes_1'))

    expect(mockSetTimeoutMs).toHaveBeenCalledWith(60_000)
  })

  it('renders auto-lock timeout labels from compiled messages', () => {
    render(<AppPreferencesContent />)

    expect(screen.queryAllByText('OqqecQ')).toHaveLength(0)
    expect(screen.queryAllByText('qqeAJM')).toHaveLength(0)
    expect(screen.getByTestId('settings-auto-lock-select')).toHaveTextContent(
      '30 seconds'
    )
    expect(
      screen.getByTestId('settings-auto-lock-option-seconds_30')
    ).toHaveTextContent('30 seconds')
    expect(
      screen.getByTestId('settings-auto-lock-option-minutes_1')
    ).toHaveTextContent('1 Minute')
    expect(
      screen.getByTestId('settings-auto-lock-option-never')
    ).toHaveTextContent('Never')
  })

  it('toggles debug logging through setDebugLogging', () => {
    render(<AppPreferencesContent />)

    fireEvent.click(screen.getByTestId('settings-debug-logging-toggle'))

    expect(mockSetDebugLogging).toHaveBeenCalledWith(true)
  })

  it('persists Default URI match through setDefaultUriMatchType', async () => {
    render(<AppPreferencesContent />)

    await screen.findByTestId('settings-default-uri-match-select')
    fireEvent.click(screen.getByTestId('settings-default-uri-match-select'))
    fireEvent.click(
      screen.getByTestId('settings-default-uri-match-option-host')
    )

    expect(mockSetDefaultUriMatch).toHaveBeenCalledWith('host')
  })
})
