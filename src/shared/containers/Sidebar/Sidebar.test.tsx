import React from 'react'

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@tetherto/pearpass-lib-constants', () => ({
  AUTHENTICATOR_ENABLED: true
}))

jest.mock('@tetherto/pearpass-lib-vault', () => ({
  closeAllInstances: jest.fn(),
  useFolders: () => ({
    data: { customFolders: {}, favorites: { records: [] } },
    deleteFolder: jest.fn()
  }),
  useRecordCountsByType: () => ({ data: {} }),
  useVault: () => ({ data: { name: 'Personal' } }),
  useVaults: () => ({ resetState: jest.fn() })
}))

jest.mock('@tetherto/pearpass-lib-ui-kit', () => {
  const React = require('react')
  return {
    useTheme: () => ({
      theme: { colors: new Proxy({}, { get: () => '#000' }) }
    }),
    rawTokens: new Proxy({}, { get: () => 0 }),
    Button: () => null,
    ContextMenu: () => null,
    Text: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('span', null, children),
    NavbarListItem: ({ label, testID }: { label?: string; testID?: string }) =>
      React.createElement(
        'button',
        { type: 'button', 'data-testid': testID },
        label
      )
  }
})

jest.mock('@tetherto/pearpass-lib-ui-kit/components/Pressable', () => {
  const React = require('react')
  return {
    Pressable: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('button', { type: 'button', ...props }, children)
  }
})

jest.mock('@tetherto/pearpass-lib-ui-kit/icons', () => {
  const React = require('react')
  const Icon = () => React.createElement('span')
  return {
    Close: Icon,
    CreateNewFolder: Icon,
    EditOutlined: Icon,
    ExpandMore: Icon,
    Folder: Icon,
    FolderCopy: Icon,
    LockFilled: Icon,
    LockOutlined: Icon,
    SettingsOutlined: Icon,
    StarBorder: Icon,
    StarFilled: Icon,
    SyncLock: Icon,
    TrashOutlined: Icon,
    TwoFactorAuthenticationFilled: Icon,
    TwoFactorAuthenticationOutlined: Icon
  }
})

jest.mock('../../context/AppHeaderContext', () => ({
  useAppHeaderContext: () => ({ isSidebarCollapsed: false })
}))

jest.mock('../../context/LoadingContext', () => ({
  useLoadingContext: () => ({ setIsLoading: jest.fn() })
}))

jest.mock('../../context/ModalContext', () => ({
  useModal: () => ({ setModal: jest.fn(), closeModal: jest.fn() })
}))

jest.mock('../../context/RouterContext', () => ({
  useRouter: () => ({
    navigate: jest.fn(),
    state: {},
    currentPage: 'vault'
  })
}))

jest.mock('../../hooks/useRecordMenuItems', () => ({
  useRecordMenuItems: () => ({
    categoriesItems: [
      {
        type: 'login',
        label: 'Logins',
        OutlinedIcon: () => null,
        FilledIcon: () => null
      }
    ]
  })
}))

import { Sidebar } from './index'

describe('Sidebar footer groups', () => {
  it('groups Generator with Authenticator, not Settings', () => {
    render(<Sidebar />)

    const authenticator = screen.getByTestId('sidebar-authenticator')
    const generator = screen.getByTestId('sidebar-generator')
    const settings = screen.getByTestId('sidebar-settings-button')

    expect(generator.parentElement).toBe(authenticator.parentElement)
    expect(generator.parentElement).not.toBe(settings.parentElement)
  })
})
