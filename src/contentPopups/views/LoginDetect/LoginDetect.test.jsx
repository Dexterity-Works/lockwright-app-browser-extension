import React from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import { LoginDetect } from './index'

jest.mock('lockwright-lib-ui-react-native-components', () => ({
  Button: ({ children, onClick, disabled, type, 'data-testid': testId }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      {children}
    </button>
  ),
  AlertMessage: () => null,
  useTheme: () => ({
    theme: {
      colors: {
        colorTextPrimary: '#fff',
        colorTextSecondary: '#aaa',
        colorSurfaceDestructiveElevated: '#900',
        colorIconPrimary: '#fff'
      }
    }
  })
}))

jest.mock('lockwright-utils-validator', () => ({
  Validator: {
    object: () => ({ validate: () => ({}) }),
    string: () => ({ required: () => ({}) }),
    array: () => ({ items: () => ({}) })
  }
}))

jest.mock('lockwright-utils-password-check', () => ({
  checkPasswordStrength: () => ({ success: false }),
  checkPassphraseStrength: () => ({ success: false }),
  PASSWORD_STRENGTH: { SAFE: 'safe', VULNERABLE: 'vulnerable', WEAK: 'weak' }
}))

jest.mock('lockwright-lib-ui-react-hooks', () => ({
  useForm: ({ initialValues }) => ({
    register: (name) => ({
      name,
      value: initialValues?.[name] ?? '',
      onChange: () => {}
    }),
    handleSubmit: () => () => {},
    setValue: () => {}
  })
}))

jest.mock('lockwright-lib-vault', () => ({
  useCreateRecord: () => ({ createRecord: jest.fn() }),
  useRecords: () => ({
    updateRecords: jest.fn(),
    data: [],
    isInitialized: true,
    isLoading: false
  }),
  useVault: () => ({
    refetch: jest.fn(),
    data: { id: 'vault-1' }
  })
}))

jest.mock('../../../shared/context/RouterContext', () => ({
  useRouter: () => ({
    state: {
      url: 'https://time.prios.no/auth',
      pageTitle: 'Prios Tid',
      username: 'ada@prios.no',
      password: 'secret-secret',
      iframeId: 'iframe-1',
      iframeType: 'login'
    }
  })
}))

jest.mock('../../iframeApi/closeIframe', () => ({
  closeIframe: jest.fn()
}))

jest.mock('../../iframeApi/setIframeStyles', () => ({
  setIframeStyles: jest.fn()
}))

describe('LoginDetect title', () => {
  it('fills the title from the page and locks the fields against browser autofill', async () => {
    render(<LoginDetect />)

    const title = screen.getByPlaceholderText('Insert title')
    expect(title).toHaveValue('Prios Tid')
    expect(title).toHaveAttribute('readonly')
    expect(title).toHaveAttribute('autocomplete', 'off')

    const password = screen.getByPlaceholderText('Password')
    expect(password).toHaveAttribute('autocomplete', 'new-password')
    expect(password).toHaveAttribute('readonly')

    await waitFor(() => {
      expect(title).toHaveValue('Prios Tid')
    })
  })
})
