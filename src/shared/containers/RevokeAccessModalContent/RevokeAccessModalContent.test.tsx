import { act, fireEvent, render, screen } from '@testing-library/react'
import { kickDevice, useVault } from 'lockwright-lib-vault'

import { RevokeAccessModalContent } from './index'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

jest.mock('lockwright-lib-vault', () => ({
  kickDevice: jest.fn(),
  useVault: jest.fn()
}))

jest.mock('../../context/ModalContext', () => ({
  useModal: jest.fn()
}))

jest.mock('../../context/ToastContext', () => ({
  useToast: jest.fn()
}))

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn() }
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const liftTestID = ({ testID, ...rest }: any) =>
    testID ? { ...rest, 'data-testid': testID } : rest
  return {
    Button: ({ children, onClick, disabled, isLoading, ...rest }: any) => (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        {...liftTestID(rest)}
      >
        {children}
      </button>
    ),
    Dialog: ({ children, footer }: any) => (
      <div>
        {children}
        {footer}
      </div>
    ),
    Text: ({ children }: any) => <span>{children}</span>
  }
})

const mockedKickDevice = jest.mocked(kickDevice)
const mockedUseVault = jest.mocked(useVault)
const mockedUseModal = jest.mocked(useModal)
const mockedUseToast = jest.mocked(useToast)

describe('RevokeAccessModalContent', () => {
  const refetchVault = jest.fn()
  const closeModal = jest.fn()
  const setToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    refetchVault.mockResolvedValue(undefined)
    mockedUseVault.mockReturnValue({
      data: {
        id: 'v1',
        devices: [
          { id: 'd1', name: 'Laptop' },
          { id: 'd2', name: 'iPhone' },
          { id: 'd3', name: 'Old Pixel' },
          { id: 'd3b', name: 'Old Pixel' },
          { id: 'd4' }
        ]
      },
      refetch: refetchVault
    } as unknown as ReturnType<typeof useVault>)
    mockedUseModal.mockReturnValue({
      closeModal
    } as unknown as ReturnType<typeof useModal>)
    mockedUseToast.mockReturnValue({ setToast } as unknown as ReturnType<
      typeof useToast
    >)
  })

  const renderModal = () =>
    render(
      <RevokeAccessModalContent
        vaultId="v1"
        targetDeviceId="d2"
        deviceName="iPhone"
      />
    )

  const submit = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('revoke-access-submit'))
    })
  }

  const rotated = {
    rotated: true,
    id: 'e1',
    seq: 1,
    members: ['d1'],
    uncovered: []
  }

  it('says revoking rotates the key, what stays on the device, and that old versions must update', () => {
    renderModal()

    const body = screen.getByTestId('revoke-access-body').textContent
    expect(body).toMatch(
      /removes this device from the vault and rotates the vault key\. It can no longer read items added or changed from now on\./
    )
    expect(body).toMatch(
      /Anything it synced before now stays on that device\. Revoking cannot delete it\. Change passwords the device could see, especially if it was lost or stolen\./
    )
    expect(body).toMatch(
      /Devices still on an older Lockwright version must update before they can read new items\./
    )
    expect(body).not.toMatch(/anything synced later/)
    expect(body).not.toMatch(/new vault/)
  })

  it('on success: closes the modal and shows the success toast', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [],
      epoch: rotated
    } as any)

    renderModal()
    await submit()

    expect(mockedKickDevice).toHaveBeenCalledWith({
      vaultId: 'v1',
      targetDeviceId: 'd2'
    })
    expect(refetchVault).toHaveBeenCalledWith('v1')
    expect(closeModal).toHaveBeenCalled()
    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
  })

  it('when the key did not rotate: warns with the reason and does not blame the device', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [
        {
          targetDeviceId: 'd2',
          kind: 'epoch',
          error: new Error('not-writable')
        }
      ],
      epoch: { rotated: false, reason: 'not-writable', uncovered: [] }
    } as any)

    renderModal()
    await submit()

    expect(closeModal).toHaveBeenCalled()
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(
        /Couldn't rotate the vault key.*not-writable/
      )
    })
    expect(setToast).not.toHaveBeenCalledWith({
      message: expect.stringMatching(/Couldn't reach the device/)
    })
  })

  it('when the rotation threw (epoch null): warns that the key could not be rotated', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [
        {
          targetDeviceId: 'd2',
          kind: 'epoch',
          error: new Error('boom')
        }
      ],
      epoch: null
    } as any)

    renderModal()
    await submit()

    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/Couldn't rotate the vault key/)
    })
  })

  it('when epoch is null with no epoch failure: says the revoke did not complete instead of success', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [{ targetDeviceId: 'd2', error: new Error('append failed') }],
      epoch: null
    } as any)

    renderModal()
    await submit()

    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/Couldn't revoke access/)
    })
    expect(closeModal).not.toHaveBeenCalled()
    expect(
      (screen.getByTestId('revoke-access-submit') as HTMLButtonElement).disabled
    ).toBe(false)
  })

  it('when the key is already current: shows only the success toast', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'current', uncovered: [] }
    } as any)

    renderModal()
    await submit()

    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
  })

  it('when another member will rotate: shows success, then the pending info', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'pending', uncovered: [] }
    } as any)

    renderModal()
    await submit()

    expect(setToast.mock.calls.map(([toast]) => toast.message)).toEqual([
      expect.stringMatching(/can no longer edit this vault/),
      'Another device will rotate the vault key when it next syncs.'
    ])
  })

  it('when roster devices are uncovered: names them in a warning', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [],
      epoch: { ...rotated, uncovered: ['d3', 'd3b', 'd4'] }
    } as any)

    renderModal()
    await submit()

    expect(closeModal).toHaveBeenCalled()
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(
        /^Old Pixel, Unknown Device can't read new items.*update Lockwright/
      )
    })
  })

  it('on partial failure: closes the modal and shows the unreachable-device toast', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [{ targetDeviceId: 'd2', error: new Error('offline') }],
      epoch: rotated
    } as any)

    renderModal()
    await submit()

    expect(closeModal).toHaveBeenCalled()
    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/lose access next time it comes online/)
    })
  })

  it('on kickDevice throw: shows the generic error toast, keeps the modal open with submit re-enabled', async () => {
    mockedKickDevice.mockRejectedValue(new Error('boom'))

    renderModal()
    await submit()

    expect(closeModal).not.toHaveBeenCalled()
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/Couldn't revoke access/)
    })
    expect(
      (screen.getByTestId('revoke-access-submit') as HTMLButtonElement).disabled
    ).toBe(false)
  })
})
