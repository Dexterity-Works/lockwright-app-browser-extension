import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

const mockHandleCreateOrEditRecord = jest.fn()
let mockIsAddMenuOpen = false
const mockSetIsAddMenuOpen = jest.fn((open: boolean) => {
  mockIsAddMenuOpen = open
})
let mockRouterState: { recordType?: string; folder?: string } = {}

jest.mock('lockwright-lib-constants', () => ({
  AUTHENTICATOR_ENABLED: false
}))

jest.mock('lockwright-lib-vault', () => ({
  RECORD_TYPES: { LOGIN: 'login', NOTE: 'note', OTP: 'otp' },
  useUserData: () => ({ refetch: jest.fn() }),
  useVault: () => ({ refetch: jest.fn() }),
  useVaults: () => ({ refetch: jest.fn() })
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const { createElement } = require('react')
  return {
    useTheme: () => ({
      theme: { colors: new Proxy({}, { get: () => '#000' }) }
    }),
    rawTokens: new Proxy({}, { get: () => 0 }),
    Button: ({ onClick, ...props }: Record<string, unknown>) =>
      createElement('button', {
        type: 'button',
        onClick,
        'data-testid': props['data-testid']
      }),
    ContextMenu: ({ trigger }: { trigger: React.ReactNode }) => trigger,
    NavbarListItem: () => null,
    SearchField: () => null
  }
})

jest.mock(
  'lockwright-lib-ui-react-native-components/icons',
  () => new Proxy({}, { get: () => () => null })
)

jest.mock('../../../shared/containers/ImportItemOrVaultModalContent', () => ({
  ImportItemOrVaultModalContent: () => null
}))

jest.mock('../../../shared/context/AppHeaderContext', () => ({
  useAppHeaderContext: () => ({
    searchValue: '',
    setSearchValue: jest.fn(),
    isAddMenuOpen: mockIsAddMenuOpen,
    setIsAddMenuOpen: mockSetIsAddMenuOpen,
    isSidebarCollapsed: false,
    setIsSidebarCollapsed: jest.fn()
  })
}))

jest.mock('../../../shared/context/ModalContext', () => ({
  useModal: () => ({ setModal: jest.fn() })
}))

jest.mock('../../../shared/context/RouterContext', () => ({
  useRouter: () => ({ currentPage: 'vault', state: mockRouterState })
}))

jest.mock('../../hooks/useCreateOrEditRecord', () => ({
  useCreateOrEditRecord: () => ({
    handleCreateOrEditRecord: mockHandleCreateOrEditRecord
  })
}))

import { AppHeaderContainer } from './index'

describe('AppHeaderContainer + button', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAddMenuOpen = false
  })

  it('opens the create view for the selected item type', () => {
    mockRouterState = { recordType: 'note', folder: 'Work' }
    render(<AppHeaderContainer />)

    fireEvent.click(screen.getByTestId('main-plus-button'))

    expect(mockHandleCreateOrEditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ recordType: 'note', selectedFolder: 'Work' })
    )
    expect(mockSetIsAddMenuOpen).not.toHaveBeenCalled()
  })

  it('opens the type menu when All Items is selected', () => {
    mockRouterState = { recordType: 'all' }
    render(<AppHeaderContainer />)

    fireEvent.click(screen.getByTestId('main-plus-button'))

    expect(mockSetIsAddMenuOpen).toHaveBeenCalledWith(true)
    expect(mockHandleCreateOrEditRecord).not.toHaveBeenCalled()
  })

  it('closes the type menu when a type is selected while it is open', () => {
    mockIsAddMenuOpen = true
    mockRouterState = { recordType: 'all' }
    const { rerender } = render(<AppHeaderContainer />)

    mockRouterState = { recordType: 'note' }
    rerender(<AppHeaderContainer />)
    mockRouterState = { recordType: 'all' }
    rerender(<AppHeaderContainer />)

    expect(mockIsAddMenuOpen).toBe(false)
  })
})
