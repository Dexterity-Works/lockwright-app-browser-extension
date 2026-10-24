import { act, render, screen } from '@testing-library/react'
import { getMyDeviceId, useVault } from 'lockwright-lib-vault'
import { listDevices } from 'lockwright-lib-vault/src/api/listDevices'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { PairedDevicesModalContent } from './index'
import { useModal } from '../../context/ModalContext'

jest.mock('lockwright-lib-vault', () => ({
  getMyDeviceId: jest.fn(),
  kickDevice: jest.fn(),
  useVault: jest.fn()
}))

jest.mock('lockwright-lib-vault/src/instances', () => ({
  pearpassVaultClient: { activeVaultGetEpochStatus: jest.fn() }
}))

jest.mock('lockwright-lib-vault/src/api/listDevices', () => ({
  listDevices: jest.fn()
}))

jest.mock('../../context/ModalContext', () => ({
  useModal: jest.fn(),
  useModalId: jest.fn(() => 'm1')
}))

jest.mock('../../context/ToastContext', () => ({
  useToast: jest.fn(() => ({ setToast: jest.fn() }))
}))

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn() }
}))

jest.mock('lockwright-lib-ui-react-native-components/icons', () => {
  const Icon = () => null
  return new Proxy({}, { get: () => Icon })
})

jest.mock('lockwright-lib-ui-react-native-components', () => ({
  Button: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  ContextMenu: ({ children }: any) => <div>{children}</div>,
  Dialog: ({ children, footer }: any) => (
    <div>
      {children}
      {footer}
    </div>
  ),
  ListItem: ({ title, rightElement }: any) => (
    <div>
      {title}
      {rightElement}
    </div>
  ),
  NavbarListItem: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  useTheme: () => ({ theme: { colors: {} } })
}))

const mockedGetEpochStatus = jest.mocked(
  pearpassVaultClient.activeVaultGetEpochStatus
) as jest.Mock
const mockedListDevices = jest.mocked(listDevices) as jest.Mock

const status = (overrides: object = {}) => ({
  vaultId: 'v1',
  epoch: 'e2',
  seq: 2,
  legacy: false,
  members: ['d1'],
  uncovered: [],
  ...overrides
})

describe('PairedDevicesModalContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetEpochStatus.mockReset()
    mockedListDevices.mockReset()
    mockedListDevices.mockResolvedValue([{ id: 'd1' }])
    jest.mocked(getMyDeviceId).mockResolvedValue('d1')
    jest.mocked(useVault).mockReturnValue({
      data: { id: 'v1', devices: [{ id: 'd1', name: 'Laptop' }] }
    } as unknown as ReturnType<typeof useVault>)
    jest.mocked(useModal).mockReturnValue({
      closeModal: jest.fn(),
      setModal: jest.fn()
    } as unknown as ReturnType<typeof useModal>)
  })

  const renderModal = async () => {
    render(<PairedDevicesModalContent />)
    await act(async () => {})
  }

  // A revoke whose key rotation timed out leaves its dialog unsure. The
  // removed device is gone from this list, so this is where a rotation that
  // landed later, or never, shows.
  it('warns while the latest key still seals to a device no longer on the roster', async () => {
    mockedGetEpochStatus.mockResolvedValue(status({ members: ['d1', 'd2'] }))

    await renderModal()

    expect(screen.getByTestId('paired-devices-epoch-warning').textContent).toBe(
      "A removed device can still read new items. The vault key hasn't rotated since it was removed."
    )
  })

  it.each<[string, object | Error, (string[] | Error)?]>([
    ['the key rotated without the removed device', status()],
    [
      'the status is for another vault',
      status({ vaultId: 'v9', members: ['d1', 'd2'] })
    ],
    ['the vault has no epoch yet', status({ epoch: null, members: [] })],
    ['the vault is legacy', status({ legacy: true, members: ['d1', 'd2'] })],
    ['the status read failed', new Error('boom')],
    [
      'the device list read failed',
      status({ members: ['d1', 'd2'] }),
      new Error('boom')
    ]
  ])('shows no key warning when %s', async (_label, value, roster = ['d1']) => {
    if (value instanceof Error) mockedGetEpochStatus.mockRejectedValue(value)
    else mockedGetEpochStatus.mockResolvedValue(value)
    if (roster instanceof Error) mockedListDevices.mockRejectedValue(roster)
    else mockedListDevices.mockResolvedValue(roster.map((id) => ({ id })))

    await renderModal()

    expect(screen.getByText('Laptop')).toBeTruthy()
    expect(screen.queryByTestId('paired-devices-epoch-warning')).toBeNull()
  })
})
