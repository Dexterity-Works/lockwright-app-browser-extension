import { act, fireEvent, render, screen } from '@testing-library/react'
import { kickDevice, useVault } from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { RevokeAccessModalContent } from './index'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { logger } from '../../utils/logger'

jest.mock('lockwright-lib-vault', () => ({
  kickDevice: jest.fn(),
  useVault: jest.fn()
}))

jest.mock('lockwright-lib-vault/src/instances', () => ({
  pearpassVaultClient: { activeVaultGetEpochStatus: jest.fn() }
}))

jest.mock('../../context/ModalContext', () => ({
  useModal: jest.fn(),
  useModalId: jest.fn(() => 'm1')
}))

jest.mock('../../context/ToastContext', () => ({
  useToast: jest.fn()
}))

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn() }
}))

jest.mock('lockwright-lib-ui-react-native-components', () => {
  const { forwardRef, useEffect } = jest.requireActual('react')
  const liftTestID = ({ testID, ...rest }: any) =>
    testID ? { ...rest, 'data-testid': testID } : rest
  return {
    Button: forwardRef(
      ({ children, onClick, disabled, isLoading, ...rest }: any, ref: any) => (
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          disabled={disabled || isLoading}
          {...liftTestID(rest)}
        >
          {children}
        </button>
      )
    ),
    // Like the kit: the X renders unless hideCloseButton is set, and Escape
    // on the document calls onClose when there is one.
    Dialog: ({
      children,
      footer,
      onClose,
      hideCloseButton,
      closeButtonTestID
    }: any) => {
      useEffect(() => {
        if (!onClose) return
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') onClose()
        }
        globalThis.document.addEventListener('keydown', onKeyDown)
        return () =>
          globalThis.document.removeEventListener('keydown', onKeyDown)
      }, [onClose])
      return (
        <div>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              data-testid={closeButtonTestID}
            />
          )}
          {children}
          {footer}
        </div>
      )
    },
    Text: ({ children }: any) => <span>{children}</span>
  }
})

const mockedKickDevice = jest.mocked(kickDevice)
const mockedUseVault = jest.mocked(useVault)
const mockedUseModal = jest.mocked(useModal)
const mockedUseToast = jest.mocked(useToast)
const mockedGetEpochStatus = jest.mocked(
  pearpassVaultClient.activeVaultGetEpochStatus
) as jest.Mock

describe('RevokeAccessModalContent', () => {
  const refetchVault = jest.fn()
  const closeModal = jest.fn()
  const setCloseable = jest.fn()
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
      closeModal,
      setCloseable
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
    expect(closeModal).toHaveBeenCalledWith('m1')
    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
  })

  const expectInlineRotationWarning = async (pattern: RegExp) => {
    expect(closeModal).not.toHaveBeenCalled()
    expect(screen.getByTestId('revoke-access-warning').textContent).toMatch(
      pattern
    )
    expect(screen.queryByTestId('revoke-access-submit')).toBeNull()
    expect(screen.queryByTestId('revoke-access-cancel')).toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByTestId('revoke-access-done'))
    })
    expect(closeModal).toHaveBeenCalledTimes(1)
    expect(closeModal).toHaveBeenCalledWith('m1')
    expect(mockedKickDevice).toHaveBeenCalledTimes(1)
  }

  const deferKick = () => {
    let resolve: (value: unknown) => void = () => {}
    mockedKickDevice.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }) as any
    )
    return (value: unknown) =>
      act(async () => {
        resolve(value)
      })
  }

  it('blocks closing while the revoke runs, and allows it again after', async () => {
    const finishKick = deferKick()
    renderModal()
    expect(screen.getByTestId('revoke-access-close')).toBeTruthy()

    await submit()

    expect(screen.queryByTestId('revoke-access-close')).toBeNull()
    expect(setCloseable).toHaveBeenLastCalledWith('m1', false)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(closeModal).not.toHaveBeenCalled()

    await finishKick({
      results: [],
      failures: [
        { targetDeviceId: 'd2', kind: 'epoch', error: new Error('x') }
      ],
      epoch: null
    })

    expect(setCloseable).toHaveBeenLastCalledWith('m1', true)
    expect(screen.getByTestId('revoke-access-close')).toBeTruthy()
  })

  it('a rotation failure after unmount shows the warning as a toast and does not close another modal', async () => {
    const finishKick = deferKick()
    const { unmount } = renderModal()
    await submit()
    unmount()
    setCloseable.mockClear()

    await finishKick({
      results: [],
      failures: [
        { targetDeviceId: 'd2', kind: 'epoch', error: new Error('x') }
      ],
      epoch: { rotated: false, reason: 'not-writable', uncovered: [] }
    })

    expect(closeModal).not.toHaveBeenCalled()
    expect(setCloseable).not.toHaveBeenCalled()
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/^This device can't write to the vault\. /)
    })
  })

  it('a success after unmount does not close another modal', async () => {
    const finishKick = deferKick()
    const { unmount } = renderModal()
    await submit()
    unmount()

    await finishKick({ results: [], failures: [], epoch: rotated })

    expect(closeModal).not.toHaveBeenCalled()
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
  })

  const timedOut = {
    results: [],
    failures: [
      {
        targetDeviceId: 'd2',
        kind: 'epoch',
        error: new Error(
          'epoch rotation failed: Request timeout: activeVaultEnsureEpoch'
        )
      }
    ],
    epoch: null
  }

  it('when the rotation timed out but the latest key leaves the device out: reports success', async () => {
    mockedKickDevice.mockResolvedValue(timedOut as any)
    mockedGetEpochStatus.mockResolvedValue({
      vaultId: 'v1',
      epoch: 'e2',
      legacy: false,
      members: ['d1'],
      uncovered: []
    })

    renderModal()
    await submit()

    expect(screen.queryByTestId('revoke-access-warning')).toBeNull()
    expect(closeModal).toHaveBeenCalledWith('m1')
    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
  })

  it('when the rotation timed out and the latest key still seals to the device: warns', async () => {
    mockedKickDevice.mockResolvedValue(timedOut as any)
    mockedGetEpochStatus.mockResolvedValue({
      vaultId: 'v1',
      epoch: 'e1',
      legacy: false,
      members: ['d1', 'd2'],
      uncovered: []
    })

    renderModal()
    await submit()

    expect(mockedGetEpochStatus).toHaveBeenCalledTimes(1)
    await expectInlineRotationWarning(
      /^Couldn't rotate the vault key\. "iPhone" can still read new items\.$/
    )
  })

  it('focuses Done when the inline warning appears', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [
        { targetDeviceId: 'd2', kind: 'epoch', error: new Error('x') }
      ],
      epoch: null
    } as any)

    renderModal()
    await submit()

    expect(document.activeElement).toBe(
      screen.getByTestId('revoke-access-done')
    )
  })

  it('when the key did not rotate: keeps the dialog open with the reason inline, Done closes it', async () => {
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

    expect(setToast).not.toHaveBeenCalled()
    await expectInlineRotationWarning(
      /^This device can't write to the vault\. "iPhone" can still read new items\.$/
    )
    expect(screen.queryByText(/not-writable/)).toBeNull()
  })

  it.each([
    ['not-writable', "This device can't write to the vault."],
    ['self-not-in-roster', "This device isn't on the vault's member list."],
    ['legacy', "The vault doesn't use rotating keys yet."]
  ])(
    'when the key did not rotate (%s): shows that reason as a sentence, not the token',
    async (reason, sentence) => {
      mockedKickDevice.mockResolvedValue({
        results: [],
        failures: [
          {
            targetDeviceId: 'd2',
            kind: 'epoch',
            error: new Error(`epoch rotation failed: ${reason}`)
          }
        ],
        epoch: { rotated: false, reason, uncovered: [] }
      } as any)

      renderModal()
      await submit()

      const warning = screen.getByTestId('revoke-access-warning').textContent
      expect(warning).toBe(`${sentence} "iPhone" can still read new items.`)
      expect(warning).not.toContain(reason)
      expect(logger.warn).toHaveBeenCalledWith(
        'RevokeAccessModalContent',
        expect.any(String),
        expect.objectContaining({ reason })
      )
    }
  )

  it.each([
    [
      'an unknown reason',
      'some-new-reason',
      'epoch rotation failed: some-new-reason'
    ],
    [
      'a thrown message as the reason',
      'activeVaultEnsureEpoch is not a function',
      'epoch rotation failed: activeVaultEnsureEpoch is not a function'
    ]
  ])(
    'when the key did not rotate with %s: shows the generic sentence without the raw text',
    async (_label, reason, message) => {
      mockedKickDevice.mockResolvedValue({
        results: [],
        failures: [
          { targetDeviceId: 'd2', kind: 'epoch', error: new Error(message) }
        ],
        epoch: { rotated: false, reason, uncovered: [] }
      } as any)

      renderModal()
      await submit()

      const warning = screen.getByTestId('revoke-access-warning').textContent
      expect(warning).toBe(
        `Couldn't rotate the vault key. "iPhone" can still read new items.`
      )
      expect(warning).not.toContain(reason)
      expect(logger.warn).toHaveBeenCalledWith(
        'RevokeAccessModalContent',
        expect.any(String),
        expect.objectContaining({ reason })
      )
    }
  )

  it('when the rotation threw "activeVaultEnsureEpoch is not a function": the warning never shows it', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [
        {
          targetDeviceId: 'd2',
          kind: 'epoch',
          error: new Error(
            'epoch rotation failed: activeVaultEnsureEpoch is not a function'
          )
        }
      ],
      epoch: null
    } as any)

    renderModal()
    await submit()

    const warning = screen.getByTestId('revoke-access-warning').textContent
    expect(warning).toBe(
      `Couldn't rotate the vault key. "iPhone" can still read new items.`
    )
    expect(warning).not.toMatch(/activeVaultEnsureEpoch|not a function/)
    expect(logger.warn).toHaveBeenCalledWith(
      'RevokeAccessModalContent',
      expect.any(String),
      expect.objectContaining({
        error: 'epoch rotation failed: activeVaultEnsureEpoch is not a function'
      })
    )
  })

  it('when the rotation threw (epoch null): keeps the dialog open with a reason-less warning inline', async () => {
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

    expect(setToast).not.toHaveBeenCalled()
    await expectInlineRotationWarning(/^Couldn't rotate the vault key\. /)
  })

  it('shows the success toast only when the dialog closes as a success, never beside the warning', async () => {
    mockedKickDevice.mockResolvedValueOnce({
      results: [],
      failures: [
        { targetDeviceId: 'd2', kind: 'epoch', error: new Error('x') }
      ],
      epoch: { rotated: false, reason: 'not-writable', uncovered: [] }
    } as any)

    const { unmount } = renderModal()
    await submit()

    expect(screen.getByTestId('revoke-access-warning')).toBeTruthy()
    expect(closeModal).not.toHaveBeenCalled()
    expect(setToast).not.toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
    unmount()

    mockedKickDevice.mockResolvedValueOnce({
      results: [],
      failures: [],
      epoch: rotated
    } as any)

    renderModal()
    await submit()

    expect(screen.queryByTestId('revoke-access-warning')).toBeNull()
    expect(closeModal).toHaveBeenCalledWith('m1')
    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/can no longer edit this vault/)
    })
  })

  it('with an unreachable device and a failed rotation: keeps the unreachable toast beside the warning', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [
        { targetDeviceId: 'd2', error: new Error('offline') },
        { targetDeviceId: 'd2', kind: 'epoch', error: new Error('x') }
      ],
      epoch: { rotated: false, reason: 'not-writable', uncovered: [] }
    } as any)

    renderModal()
    await submit()

    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: expect.stringMatching(/lose access next time it comes online/)
    })
    await expectInlineRotationWarning(/^This device can't write to the vault\./)
  })

  it('when epoch is null with no epoch failure: says the revoke did not finish instead of success', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [{ targetDeviceId: 'd2', error: new Error('append failed') }],
      epoch: null
    } as any)

    renderModal()
    await submit()

    expect(setToast).toHaveBeenCalledTimes(1)
    expect(setToast).toHaveBeenCalledWith({
      message: "Couldn't finish revoking access. Please try again."
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

    expect(closeModal).toHaveBeenCalledTimes(1)
    expect(closeModal).toHaveBeenCalledWith('m1')
    expect(screen.queryByTestId('revoke-access-warning')).toBeNull()

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

    expect(closeModal).toHaveBeenCalledWith('m1')
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

    expect(closeModal).toHaveBeenCalledWith('m1')
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
