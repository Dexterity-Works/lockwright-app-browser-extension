import { act, fireEvent, render, screen } from '@testing-library/react'
import { getMyDeviceId, getVaultKeyState, useVault } from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { PairedDevicesModalContent } from './index'
import { useModal } from '../../context/ModalContext'

jest.mock('lockwright-lib-vault', () => ({
  getMyDeviceId: jest.fn(),
  getVaultKeyState: jest.fn(),
  kickDevice: jest.fn(),
  useVault: jest.fn()
}))

jest.mock('lockwright-lib-vault/src/instances', () => ({
  pearpassVaultClient: {
    activeVaultGetEpochStatus: jest.fn(),
    activeVaultEnsureEpoch: jest.fn()
  }
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
  Button: ({ children, onClick, 'data-testid': testId }: any) => (
    <button type="button" onClick={onClick} data-testid={testId}>
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
  ListItem: ({ title, subtitle, testID, rightElement }: any) => (
    <div data-testid={testID}>
      {title}
      {subtitle && <span data-testid={`${testID}-subtitle`}>{subtitle}</span>}
      {rightElement}
    </div>
  ),
  NavbarListItem: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  Text: ({ children, 'data-testid': testId }: any) => (
    <span data-testid={testId}>{children}</span>
  ),
  useTheme: () => ({ theme: { colors: {} } })
}))

const mockedKeyState = jest.mocked(getVaultKeyState)
const ensureEpoch = jest.mocked(
  pearpassVaultClient.activeVaultEnsureEpoch
) as jest.Mock

// Local time, so the formatted date does not depend on the time zone.
const ROTATED_AT = new Date(2026, 9, 24, 14, 5).getTime()
const keyState = (overrides: object = {}) => ({
  vaultId: 'v1',
  epoch: 'e2',
  legacy: false,
  canRead: true,
  members: ['d1', 'd2'],
  rotatedAt: ROTATED_AT,
  removed: [{ id: 'd2', name: 'Old Phone' }],
  ...overrides
})

describe('PairedDevicesModalContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedKeyState.mockReset()
    mockedKeyState.mockResolvedValue(keyState())
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

  it('says when the vault key last rotated', async () => {
    await renderModal()

    expect(screen.getByTestId('paired-devices-key-rotated').textContent).toBe(
      'Vault key last rotated 24 Oct 2026 14:05'
    )
  })

  // A revoke whose key rotation timed out leaves its dialog unsure. The
  // removed device's row is gone, so this is where a rotation that landed
  // later, or never, shows.
  it('keeps a removed device listed as key rotating while another device has to rotate', async () => {
    mockedKeyState.mockResolvedValue(keyState({ canRead: false }))

    await renderModal()

    expect(
      screen.getByTestId('paired-devices-removed-d2').textContent
    ).toContain('Old Phone')
    expect(
      screen.getByTestId('paired-devices-removed-d2-subtitle').textContent
    ).toBe('Removed · key rotating')
    expect(screen.queryByTestId('paired-devices-rotate-d2')).toBeNull()
  })

  it('keeps a removed device listed as key not rotated, with Rotate key now', async () => {
    await renderModal()

    expect(
      screen.getByTestId('paired-devices-removed-d2-subtitle').textContent
    ).toBe('Removed · key not rotated')

    ensureEpoch.mockResolvedValue({ rotated: true, uncovered: [] })
    mockedKeyState.mockResolvedValue(keyState({ members: ['d1'], removed: [] }))
    await act(async () => {
      fireEvent.click(screen.getByTestId('paired-devices-rotate-d2'))
    })

    expect(ensureEpoch).toHaveBeenCalledWith({ start: true })
    expect(screen.queryByTestId('paired-devices-removed-d2')).toBeNull()
  })

  it('keeps the newest key-state read when an older one resolves last', async () => {
    type KeyState = Awaited<ReturnType<typeof getVaultKeyState>>
    let resolveFirst: (value: KeyState) => void = () => {}
    mockedKeyState.mockReturnValueOnce(
      new Promise<KeyState>((resolve) => {
        resolveFirst = resolve
      })
    )
    mockedKeyState.mockResolvedValue(keyState({ members: ['d1'], removed: [] }))
    const view = render(<PairedDevicesModalContent />)
    await act(async () => {})

    // The device list changes, so the list reads the key state again.
    jest.mocked(useVault).mockReturnValue({
      data: { id: 'v1', devices: [{ id: 'd1', name: 'Laptop' }] }
    } as unknown as ReturnType<typeof useVault>)
    await act(async () => {
      view.rerender(<PairedDevicesModalContent />)
    })
    await act(async () => {
      resolveFirst(keyState() as KeyState)
    })

    expect(mockedKeyState).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('paired-devices-removed-d2')).toBeNull()
  })

  it("drops the old vault's rows after a switch, even when the new read fails", async () => {
    const view = render(<PairedDevicesModalContent />)
    await act(async () => {})
    expect(screen.getByTestId('paired-devices-removed-d2')).toBeTruthy()

    jest.mocked(useVault).mockReturnValue({
      data: { id: 'v2', devices: [{ id: 'd3', name: 'Laptop' }] }
    } as unknown as ReturnType<typeof useVault>)
    mockedKeyState.mockRejectedValue(new Error('switching'))
    await act(async () => {
      view.rerender(<PairedDevicesModalContent />)
    })

    expect(screen.queryByTestId('paired-devices-removed-d2')).toBeNull()
    expect(screen.queryByTestId('paired-devices-key-rotated')).toBeNull()
  })

  it('names a removed device without a name as Unknown Device', async () => {
    mockedKeyState.mockResolvedValue(
      keyState({ removed: [{ id: 'd2', name: null }] })
    )

    await renderModal()

    expect(
      screen.getByTestId('paired-devices-removed-d2').textContent
    ).toContain('Unknown Device')
  })

  it.each<[string, object | null | Error]>([
    ['the key rotated without the removed device', keyState({ removed: [] })],
    ['the state is for another vault', keyState({ vaultId: 'v9' })],
    ['there is no state', null],
    ['the state read failed', new Error('boom')]
  ])('lists no removed device when %s', async (_label, value) => {
    if (value instanceof Error) mockedKeyState.mockRejectedValue(value)
    else mockedKeyState.mockResolvedValue(value as never)

    await renderModal()

    expect(screen.getByText('Laptop')).toBeTruthy()
    expect(screen.queryByTestId('paired-devices-removed-d2')).toBeNull()
  })

  it('shows no rotation time for a vault without rotating keys', async () => {
    mockedKeyState.mockResolvedValue(
      keyState({
        epoch: null,
        legacy: true,
        members: [],
        rotatedAt: null,
        removed: []
      })
    )

    await renderModal()

    expect(screen.queryByTestId('paired-devices-key-rotated')).toBeNull()
  })

  it('shows removed devices when no synced devices remain', async () => {
    jest.mocked(useVault).mockReturnValue({
      data: { id: 'v1', devices: [] }
    } as unknown as ReturnType<typeof useVault>)

    await renderModal()

    expect(screen.getByTestId('paired-devices-removed-d2')).toBeTruthy()
    expect(screen.queryByText('No devices synced yet')).toBeNull()
  })

  it('does not read key state when there is no active vault', async () => {
    jest.mocked(useVault).mockReturnValue({
      data: null
    } as unknown as ReturnType<typeof useVault>)

    await renderModal()

    expect(mockedKeyState).not.toHaveBeenCalled()
    expect(screen.getByText('No devices synced yet')).toBeTruthy()
  })
})
