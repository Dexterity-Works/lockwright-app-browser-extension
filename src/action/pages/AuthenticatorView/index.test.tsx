import React from 'react'

import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useOtpWatch } from 'lockwright-lib-vault'

jest.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray | string, ...values: unknown[]) =>
    Array.isArray(strings)
      ? strings.reduce(
          (acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ''),
          ''
        )
      : strings
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const { createElement } = require('react')
  const passthrough =
    (tag: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      createElement(tag, null, children)
  return {
    Breadcrumb: passthrough('div'),
    Button: passthrough('button'),
    ContextMenu: passthrough('div'),
    ListItem: passthrough('div'),
    NavbarListItem: passthrough('div'),
    Text: passthrough('span'),
    Title: passthrough('h3'),
    useTheme: () => ({
      theme: { colors: new Proxy({}, { get: () => '#000' }) }
    })
  }
})

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  Add: () => null,
  CalendarToday: () => null,
  Check: () => null,
  Checklist: () => null,
  ContentCopy: () => null,
  FilterList: () => null,
  SortByAlpha: () => null
}))

jest.mock('lockwright-lib-vault', () => ({
  useRecords: () => ({
    data: [],
    updateFavoriteState: jest.fn()
  }),
  useFolders: () => ({ data: { customFolders: {} } }),
  useVault: () => ({ refetch: jest.fn() }),
  useVaults: () => ({ refetch: jest.fn() }),
  useUserData: () => ({ refetch: jest.fn() }),
  formatOtpCode: (code: string) => code || '',
  groupOtpRecords: () => ({ totpGroups: [], hotpRecords: [] }),
  isExpiring: () => false,
  RECORD_TYPES: { OTP: 'otp' },
  useOtpWatch: jest.fn()
}))

jest.mock('./styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) })
}))

jest.mock(
  '../../containers/EmptyCollectionView/EmptyCollectionView.styles',
  () => ({
    createStyles: () => new Proxy({}, { get: () => ({}) })
  })
)

jest.mock('../../containers/RecordListView/RecordListView.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) })
}))

jest.mock('../../containers/EmptyResultsView', () => ({
  EmptyResultsView: () => null
}))

jest.mock('../../containers/MultiSelectActionsBar', () => ({
  MultiSelectActionsBar: () => null
}))

jest.mock('../../containers/RecordDetails/RecordDetails', () => ({
  RecordDetails: () => null
}))

jest.mock('../../hooks/useCreateOrEditRecord', () => ({
  useCreateOrEditRecord: () => ({ handleCreateOrEditRecord: jest.fn() })
}))

jest.mock('../../../shared/components/TimerCircle', () => ({
  TimerCircle: () => null
}))

jest.mock('../../../shared/containers/DeleteRecordsModalContent', () => ({
  DeleteRecordsModalContent: () => null
}))

jest.mock('../../../shared/containers/MoveFolderModalContent', () => ({
  MoveFolderModalContent: () => null
}))

jest.mock('../../../shared/containers/RecordItemIcon', () => ({
  RecordItemIcon: () => null
}))

jest.mock('../../../shared/context/AppHeaderContext', () => ({
  useAppHeaderContext: () => ({ searchValue: '' })
}))

jest.mock('../../../shared/context/ModalContext', () => ({
  useModal: () => ({ setModal: jest.fn(), isOpen: false })
}))

jest.mock('../../../shared/utils/getRecordSubtitle', () => ({
  getRecordSubtitle: () => ''
}))

jest.mock('../../../shared/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({ copyToClipboard: jest.fn() })
}))

import { AuthenticatorView } from './index'

describe('AuthenticatorView', () => {
  beforeEach(() => {
    ;(useOtpWatch as jest.Mock).mockClear()
  })

  test('asks vault for OTP codes while Authenticator is open', () => {
    render(<AuthenticatorView />)
    expect(useOtpWatch).toHaveBeenCalledWith('all')
  })
})
