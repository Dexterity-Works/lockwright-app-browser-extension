import { act, renderHook } from '@testing-library/react'
import { useCreateVault, useVault, useVaults } from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { useVaultAccessRevoked } from './useVaultAccessRevoked'
import { useVaultSwitch } from './useVaultSwitch'
import { useModal } from '../context/ModalContext'
import { useRouter } from '../context/RouterContext'
import { useToast } from '../context/ToastContext'

jest.mock('lockwright-lib-vault', () => ({
  useCreateVault: jest.fn(),
  useVault: jest.fn(),
  useVaults: jest.fn()
}))

jest.mock('lockwright-lib-vault/src/instances', () => ({
  pearpassVaultClient: {
    on: jest.fn(),
    off: jest.fn()
  }
}))

jest.mock('./useVaultSwitch', () => ({
  useVaultSwitch: jest.fn()
}))

jest.mock('../context/ModalContext', () => ({
  useModal: jest.fn()
}))

jest.mock('../context/RouterContext', () => ({
  useRouter: jest.fn()
}))

jest.mock('../context/ToastContext', () => ({
  useToast: jest.fn()
}))

jest.mock('../containers/AccessRemovedModalContent', () => ({
  AccessRemovedModalContent: jest.fn(() => null)
}))

jest.mock('../utils/logger', () => ({
  logger: { error: jest.fn() }
}))

const mockUseVault = useVault as jest.Mock
const mockUseVaults = useVaults as jest.Mock
const mockUseCreateVault = useCreateVault as jest.Mock
const mockUseVaultSwitch = useVaultSwitch as jest.Mock
const mockUseModal = useModal as jest.Mock
const mockUseRouter = useRouter as jest.Mock
const mockUseToast = useToast as jest.Mock
const mockClient = pearpassVaultClient as unknown as {
  on: jest.Mock
  off: jest.Mock
}

describe('useVaultAccessRevoked', () => {
  const setModal = jest.fn()
  const setToast = jest.fn()
  const navigate = jest.fn()
  const deleteVaultLocal = jest.fn()
  const switchVault = jest.fn()
  const createVault = jest.fn()
  const addDevice = jest.fn()

  const activeVault = { id: 'v-active', name: 'Active', devices: [] }
  const otherVault = { id: 'v-other', name: 'Other' }

  let revokedHandler: (payload: unknown) => void = () => {}

  beforeEach(() => {
    jest.clearAllMocks()

    mockClient.on = jest.fn()
    mockClient.off = jest.fn()

    mockClient.on.mockImplementation((event, handler) => {
      if (event === 'vault-access-revoked') revokedHandler = handler
    })

    mockUseModal.mockReturnValue({ setModal })
    mockUseToast.mockReturnValue({ setToast })
    mockUseRouter.mockReturnValue({ navigate })
    mockUseVaultSwitch.mockReturnValue({ switchVault })
    mockUseCreateVault.mockReturnValue({ createVault })

    mockUseVaults.mockReturnValue({ data: [activeVault, otherVault] })
    mockUseVault.mockReturnValue({
      data: activeVault,
      deleteVaultLocal,
      addDevice
    })

    deleteVaultLocal.mockResolvedValue(undefined)
    switchVault.mockResolvedValue(undefined)
    createVault.mockResolvedValue(undefined)
    addDevice.mockResolvedValue(undefined)
  })

  it('subscribes to vault-access-revoked on mount and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useVaultAccessRevoked())
    expect(mockClient.on).toHaveBeenCalledWith(
      'vault-access-revoked',
      expect.any(Function)
    )
    unmount()
    expect(mockClient.off).toHaveBeenCalledWith(
      'vault-access-revoked',
      expect.any(Function)
    )
  })

  it('ignores payloads with no vaultId', async () => {
    renderHook(() => useVaultAccessRevoked())
    await act(async () => revokedHandler({}))
    expect(deleteVaultLocal).not.toHaveBeenCalled()
    expect(setModal).not.toHaveBeenCalled()
  })

  it('ignores payloads for an unknown vault (duplicate / self delivery)', async () => {
    renderHook(() => useVaultAccessRevoked())
    await act(async () => revokedHandler({ vaultId: 'v-unknown' }))
    expect(deleteVaultLocal).not.toHaveBeenCalled()
    expect(setModal).not.toHaveBeenCalled()
  })

  it('ignores missing payloads and revocations while the vault list is unavailable', async () => {
    mockUseVaults.mockReturnValue({ data: undefined })

    renderHook(() => useVaultAccessRevoked())
    await act(async () => revokedHandler(undefined))
    await act(async () => revokedHandler({ vaultId: 'v-active' }))

    expect(deleteVaultLocal).not.toHaveBeenCalled()
    expect(setModal).not.toHaveBeenCalled()
  })

  it('revokes an inactive vault even when its name and device list are missing', async () => {
    mockUseVaults.mockReturnValue({ data: [activeVault, { id: 'v-other' }] })

    renderHook(() => useVaultAccessRevoked())
    await act(async () =>
      revokedHandler({ vaultId: 'v-other', actor: 'unknown-device' })
    )

    expect(deleteVaultLocal).toHaveBeenCalledWith('v-other')
    expect(switchVault).not.toHaveBeenCalled()
    expect(setModal).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { vaultName: 'v-other', deviceName: undefined }
      })
    )
  })

  it('does not subscribe when the vault client has no event listener', () => {
    mockClient.on = undefined as unknown as jest.Mock

    renderHook(() => useVaultAccessRevoked())

    expect(mockClient.off).not.toHaveBeenCalled()
  })

  it('wipes the active vault and switches to the next when one exists', async () => {
    renderHook(() => useVaultAccessRevoked())
    await act(async () => revokedHandler({ vaultId: 'v-active' }))

    expect(deleteVaultLocal).toHaveBeenCalledWith('v-active')
    expect(switchVault).toHaveBeenCalledWith(otherVault)
    expect(createVault).not.toHaveBeenCalled()
    expect(setModal).toHaveBeenCalledTimes(1)
  })

  it('creates a fallback Personal vault when no other vault remains', async () => {
    mockUseVaults.mockReturnValue({ data: [activeVault] })

    renderHook(() => useVaultAccessRevoked())
    await act(async () => revokedHandler({ vaultId: 'v-active' }))

    expect(deleteVaultLocal).toHaveBeenCalledWith('v-active')
    expect(createVault).toHaveBeenCalled()
    expect(addDevice).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('vault', {
      state: { recordType: 'all' }
    })
    expect(setToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/Personal/)
      })
    )
  })

  it('toasts a recovery error when fallback Personal creation fails', async () => {
    mockUseVaults.mockReturnValue({ data: [activeVault] })
    createVault.mockRejectedValue(new Error('boom'))

    renderHook(() => useVaultAccessRevoked())
    await act(async () => revokedHandler({ vaultId: 'v-active' }))

    expect(setToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/Couldn't create a starter vault/)
      })
    )
  })

  it('handles a vault announced twice (desktop and epoch status) once', async () => {
    let finishDelete: () => void = () => {}
    deleteVaultLocal.mockReturnValue(
      new Promise<void>((resolve) => {
        finishDelete = resolve
      })
    )

    renderHook(() => useVaultAccessRevoked())
    await act(async () => {
      const first = revokedHandler({ vaultId: 'v-active', actor: 'd1' })
      const second = revokedHandler({ vaultId: 'v-active', reason: 'epoch' })
      finishDelete()
      await Promise.all([first, second])
    })

    expect(deleteVaultLocal).toHaveBeenCalledTimes(1)
    expect(switchVault).toHaveBeenCalledTimes(1)
    expect(setModal).toHaveBeenCalledTimes(1)
  })

  it('does not wipe again while the list still shows the wiped vault, and does once it left', async () => {
    const { rerender } = renderHook(() => useVaultAccessRevoked())
    await act(async () => revokedHandler({ vaultId: 'v-active' }))
    await act(async () => revokedHandler({ vaultId: 'v-active' }))

    expect(deleteVaultLocal).toHaveBeenCalledTimes(1)
    expect(switchVault).toHaveBeenCalledTimes(1)
    expect(setModal).toHaveBeenCalledTimes(1)

    mockUseVaults.mockReturnValue({ data: [otherVault] })
    rerender()
    mockUseVaults.mockReturnValue({ data: [activeVault, otherVault] })
    rerender()
    await act(async () => revokedHandler({ vaultId: 'v-active' }))

    expect(deleteVaultLocal).toHaveBeenCalledTimes(2)
  })

  it('keeps blocking a vault that left and came back while its wipe was running', async () => {
    let finishDelete: () => void = () => {}
    deleteVaultLocal.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishDelete = resolve
      })
    )

    const { rerender } = renderHook(() => useVaultAccessRevoked())
    let first: Promise<unknown> = Promise.resolve()
    await act(async () => {
      first = Promise.resolve(revokedHandler({ vaultId: 'v-active' }))
    })

    mockUseVaults.mockReturnValue({ data: [otherVault] })
    rerender()
    mockUseVaults.mockReturnValue({ data: [activeVault, otherVault] })
    rerender()

    await act(async () => {
      await revokedHandler({ vaultId: 'v-active' })
      finishDelete()
      await first
    })
    await act(async () => revokedHandler({ vaultId: 'v-active' }))

    expect(deleteVaultLocal).toHaveBeenCalledTimes(1)
    expect(switchVault).toHaveBeenCalledTimes(1)
    expect(setModal).toHaveBeenCalledTimes(1)
  })

  it('still shows the access-removed modal when delete fails locally', async () => {
    deleteVaultLocal.mockRejectedValue(new Error('disk-full'))

    renderHook(() => useVaultAccessRevoked())
    await act(async () => revokedHandler({ vaultId: 'v-active' }))

    expect(setModal).toHaveBeenCalledTimes(1)
    expect(switchVault).not.toHaveBeenCalled()
    expect(createVault).not.toHaveBeenCalled()

    await act(async () => revokedHandler({ vaultId: 'v-active' }))
    expect(deleteVaultLocal).toHaveBeenCalledTimes(2)
  })
})
