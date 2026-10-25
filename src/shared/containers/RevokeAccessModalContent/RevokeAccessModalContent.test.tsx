import { act, fireEvent, render, screen } from '@testing-library/react'
import { kickDevice, useVault, waitForKeyRotation } from 'lockwright-lib-vault'
import { listDevices } from 'lockwright-lib-vault/src/api/listDevices'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { RevokeAccessModalContent } from './index'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { logger } from '../../utils/logger'

jest.mock('lockwright-lib-vault', () => ({
  kickDevice: jest.fn(),
  useVault: jest.fn(),
  waitForKeyRotation: jest.fn()
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
      closeButtonTestID,
      title
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
          <h2 data-testid="revoke-access-title">{title}</h2>
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
    Text: ({ children, as: As = 'span' }: any) => <As>{children}</As>
  }
})

const mockedKickDevice = jest.mocked(kickDevice)
const mockedUseVault = jest.mocked(useVault)
const mockedUseModal = jest.mocked(useModal)
const mockedUseToast = jest.mocked(useToast)
const mockedGetEpochStatus = jest.mocked(
  pearpassVaultClient.activeVaultGetEpochStatus
) as jest.Mock
const mockedListDevices = jest.mocked(listDevices) as jest.Mock
const mockedWait = jest.mocked(waitForKeyRotation)
// Local time, so the formatted date does not depend on the time zone.
const ROTATED_AT = new Date(2026, 9, 24, 14, 5).getTime()
const rotatedState = {
  vaultId: 'v1',
  epoch: 'e2',
  legacy: false,
  canRead: true,
  members: ['d1'],
  rotatedAt: ROTATED_AT,
  removed: []
}
const ROTATED = 'iPhone revoked. Vault key rotated.'
const ROTATED_LABEL = 'Revoked · key rotated 24 Oct 2026 14:05'
const PENDING_LABEL = 'Removed · key rotating'
const PENDING =
  "iPhone can't change this vault. The vault key will rotate when the vault next syncs. Until then it can still read new items."
const FAILED_LABEL = 'Removed · key not rotated'
const FAILED =
  "iPhone can't change this vault, but it can still read new items until the key rotates."
const UNREACHED =
  "Couldn't reach the device. It will stop editing next time it comes online."

describe('RevokeAccessModalContent', () => {
  const refetchVault = jest.fn()
  const closeModal = jest.fn()
  const setCloseable = jest.fn()
  const setToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // clearAllMocks keeps queued once-values; a test's unread status must
    // not reach the next one.
    mockedGetEpochStatus.mockReset()
    mockedListDevices.mockReset()
    mockedListDevices.mockResolvedValue([{ id: 'd1' }])
    refetchVault.mockResolvedValue(undefined)
    // Like the real one: an aborted wait resolves null.
    mockedWait.mockImplementation(async ({ signal }) =>
      signal?.aborted ? null : rotatedState
    )
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

  it('says what revoking does and does not do', () => {
    renderModal()

    expect(screen.getByTestId('revoke-access-title').textContent).toBe(
      'Revoke iPhone?'
    )
    const paragraphs = Array.from(
      screen.getByTestId('revoke-access-body').querySelectorAll('p, li')
    ).map((node) => node.textContent)
    expect(paragraphs).toEqual([
      'Revoking this device:',
      "removes it from the vault, so it can't add or change items",
      "rotates the vault key, so it can't read anything saved or changed after that",
      "It doesn't:",
      "erase what's already on the device. It can still read every item it synced before the key rotated.",
      'If the device was lost or stolen, change the passwords it could see.'
    ])
  })

  const toasts = () => setToast.mock.calls.map(([toast]) => toast.message)
  const outcomeText = () =>
    screen.getByTestId('revoke-access-warning').textContent

  it('says revoked only once the vault key has rotated past the device', async () => {
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
    expect(mockedWait).toHaveBeenCalledWith({
      vaultId: 'v1',
      deviceId: 'd2',
      timeoutMs: 40_000,
      signal: expect.any(AbortSignal)
    })
    expect(refetchVault).toHaveBeenCalledWith('v1')
    expect(toasts()).toEqual([ROTATED])
    expect(screen.getByRole('status').textContent).toBe(ROTATED_LABEL)
    await expectOutcome(ROTATED_LABEL)
  })

  it('shows the key rotating, with no success toast, while it waits', async () => {
    let settle: (state: null) => void = () => {}
    mockedWait.mockReturnValue(new Promise((r) => (settle = r)) as never)
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [],
      epoch: rotated
    } as any)

    renderModal()
    await submit()

    expect(toasts()).toEqual([])
    expect(screen.getByRole('status').textContent).toBe(PENDING_LABEL)
    expect(setCloseable).toHaveBeenLastCalledWith('m1', false)
    expect(screen.queryByTestId('revoke-access-done')).toBeNull()

    await act(async () => settle(null))

    expect(toasts()).toEqual([])
    expect(screen.getByRole('alert').textContent).toBe(PENDING_LABEL + PENDING)
    await expectOutcome(PENDING)
  })

  const expectOutcome = async (text: string) => {
    expect(closeModal).not.toHaveBeenCalled()
    expect(outcomeText()).toContain(text)
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
    expect(toasts()).toEqual([FAILED])
  })

  it('a kick that lands after unmount says the key is rotating, not revoked', async () => {
    const finishKick = deferKick()
    const { unmount } = renderModal()
    await submit()
    unmount()

    await finishKick({ results: [], failures: [], epoch: rotated })

    expect(closeModal).not.toHaveBeenCalled()
    expect(toasts()).toEqual([PENDING])
  })

  const timedOut = (message: string) => ({
    results: [],
    failures: [
      {
        targetDeviceId: 'd2',
        kind: 'epoch',
        error: new Error(`epoch rotation failed: ${message}`)
      }
    ],
    epoch: null
  })
  const backgroundTimeout = 'Request timeout: nmSecureRequest'
  const popupTimeout = 'Request timeout: NATIVE_REQUEST'

  const status = (overrides: object = {}) => ({
    vaultId: 'v1',
    epoch: 'e1',
    seq: 1,
    legacy: false,
    members: ['d1', 'd2'],
    uncovered: [],
    ...overrides
  })
  const rotatedStatus = status({ epoch: 'e2', seq: 2, members: ['d1'] })

  it.each([backgroundTimeout, popupTimeout])(
    'when the rotation timed out (%s) but the epoch moved on without the device: says revoked',
    async (message) => {
      mockedGetEpochStatus
        .mockResolvedValueOnce(status())
        .mockResolvedValueOnce(rotatedStatus)
      mockedKickDevice.mockResolvedValue(timedOut(message) as any)

      renderModal()
      await submit()

      expect(mockedGetEpochStatus.mock.invocationCallOrder[0]).toBeLessThan(
        mockedKickDevice.mock.invocationCallOrder[0]
      )
      expect(mockedWait).toHaveBeenCalledTimes(1)
      expect(toasts()).toEqual([ROTATED])
      await expectOutcome(ROTATED_LABEL)
    }
  )

  it.each<[string, object | Error, object | Error, (string[] | Error)?]>([
    [
      // An epoch from before the kick can leave d2 out while the same peer
      // reads it under another device row; nothing rotated.
      'the epoch did not change though it leaves the device out',
      status({ members: ['d1'] }),
      status({ members: ['d1'] }),
      ['d1']
    ],
    [
      // Only the id says the epoch moved on; a seq is not compared.
      'the epoch id is unchanged though its seq went up',
      status({ members: ['d1'] }),
      status({ seq: 2, members: ['d1'] }),
      ['d1']
    ],
    [
      'the new epoch still seals to the device',
      status(),
      status({ epoch: 'e2', seq: 2 }),
      ['d1', 'd2']
    ],
    [
      // Another member rotated from a view where the peer's other row (d3)
      // was still bound; the kick swept it.
      'the new epoch seals to a device no longer on the roster',
      status({ members: ['d1', 'd2', 'd3'] }),
      status({ epoch: 'e2', seq: 2, members: ['d1', 'd3'] }),
      ['d1']
    ],
    ['the device list read failed', status(), rotatedStatus, new Error('boom')],
    [
      'the status has no members',
      status(),
      status({ epoch: 'e2', seq: 2, members: undefined })
    ],
    [
      'the status is for another vault',
      status(),
      { ...rotatedStatus, vaultId: 'v9' }
    ],
    [
      'the status before the kick is for another vault',
      status({ vaultId: 'v9' }),
      rotatedStatus
    ],
    ['the status has no epoch', status(), { ...rotatedStatus, epoch: null }],
    ['the vault is legacy', status(), { ...rotatedStatus, legacy: true }],
    ['the read before the kick failed', new Error('boom'), rotatedStatus],
    ['the read after the timeout failed', status(), new Error('boom')]
  ])(
    'when the rotation timed out and %s: says the key is rotating',
    async (_label, before, after, roster = ['d1']) => {
      if (roster instanceof Error) mockedListDevices.mockRejectedValue(roster)
      else mockedListDevices.mockResolvedValue(roster.map((id) => ({ id })))
      for (const value of [before, after]) {
        if (value instanceof Error) {
          mockedGetEpochStatus.mockRejectedValueOnce(value)
        } else mockedGetEpochStatus.mockResolvedValueOnce(value)
      }
      mockedKickDevice.mockResolvedValue(timedOut(backgroundTimeout) as any)

      renderModal()
      await submit()

      // The rotation may still land after this read; the Devices list
      // shows whether it did.
      expect(mockedWait).not.toHaveBeenCalled()
      expect(toasts()).toEqual([])
      expect(outcomeText()).toBe(PENDING_LABEL + PENDING)
      await expectOutcome(PENDING)
    }
  )

  it('focuses Done when the outcome appears', async () => {
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

  it.each([
    ['not-writable', 'epoch rotation failed: not-writable'],
    ['self-not-in-roster', 'epoch rotation failed: self-not-in-roster'],
    ['legacy', 'epoch rotation failed: legacy'],
    ['some-new-reason', 'epoch rotation failed: some-new-reason'],
    [
      'activeVaultEnsureEpoch is not a function',
      'epoch rotation failed: activeVaultEnsureEpoch is not a function'
    ]
  ])(
    'when the key did not rotate (%s): says key not rotated without the reason',
    async (reason, message) => {
      mockedKickDevice.mockResolvedValue({
        results: [],
        failures: [
          { targetDeviceId: 'd2', kind: 'epoch', error: new Error(message) }
        ],
        epoch: { rotated: false, reason, uncovered: [] }
      } as any)

      renderModal()
      await submit()

      expect(toasts()).toEqual([])
      expect(mockedWait).not.toHaveBeenCalled()
      expect(outcomeText()).toBe(FAILED_LABEL + FAILED)
      expect(logger.warn).toHaveBeenCalledWith(
        'RevokeAccessModalContent',
        expect.any(String),
        expect.objectContaining({ reason, error: message })
      )
      await expectOutcome(FAILED)
    }
  )

  it('when the rotation threw (epoch null): says key not rotated, without the thrown text', async () => {
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

    expect(toasts()).toEqual([])
    expect(outcomeText()).toBe(FAILED_LABEL + FAILED)
    expect(logger.warn).toHaveBeenCalledWith(
      'RevokeAccessModalContent',
      expect.any(String),
      expect.objectContaining({
        error: 'epoch rotation failed: activeVaultEnsureEpoch is not a function'
      })
    )
    await expectOutcome(FAILED)
  })

  it('with an unreachable device and a failed rotation: keeps the unreachable toast beside the outcome', async () => {
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

    expect(toasts()).toEqual([UNREACHED])
    await expectOutcome(FAILED)
  })

  it('when epoch is null with no epoch failure: says the revoke did not finish instead of success', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [{ targetDeviceId: 'd2', error: new Error('append failed') }],
      epoch: null
    } as any)

    renderModal()
    await submit()

    expect(toasts()).toEqual([
      "Couldn't finish revoking access. Please try again."
    ])
    expect(mockedWait).not.toHaveBeenCalled()
    expect(closeModal).not.toHaveBeenCalled()
    expect(
      (screen.getByTestId('revoke-access-submit') as HTMLButtonElement).disabled
    ).toBe(false)
  })

  it('when the key is already current: checks it, then says revoked', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'current', uncovered: [] }
    } as any)

    renderModal()
    await submit()

    expect(mockedWait).toHaveBeenCalledTimes(1)
    expect(toasts()).toEqual([ROTATED])
    await expectOutcome(ROTATED_LABEL)
  })

  it('when another member will rotate: says the key is rotating', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [],
      epoch: { rotated: false, reason: 'pending', uncovered: [] }
    } as any)

    renderModal()
    await submit()

    expect(mockedWait).not.toHaveBeenCalled()
    expect(toasts()).toEqual([])
    expect(outcomeText()).toBe(PENDING_LABEL + PENDING)
    await expectOutcome(PENDING)
  })

  it('when roster devices are uncovered: names them in a warning', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [],
      epoch: { ...rotated, uncovered: ['d3', 'd3b', 'd4'] }
    } as any)

    renderModal()
    await submit()

    expect(toasts()).toEqual([
      ROTATED,
      "Old Pixel, Unknown Device can't read new items until they open this vault once on a current Lockwright version."
    ])
  })

  it('on partial failure: shows the unreachable-device toast, then the rotation', async () => {
    mockedKickDevice.mockResolvedValue({
      results: [],
      failures: [{ targetDeviceId: 'd2', error: new Error('offline') }],
      epoch: rotated
    } as any)

    renderModal()
    await submit()

    expect(toasts()).toEqual([UNREACHED, ROTATED])
    await expectOutcome(ROTATED_LABEL)
  })

  describe('Rotate key now', () => {
    const ensureEpoch = jest.mocked(
      pearpassVaultClient.activeVaultEnsureEpoch
    ) as jest.Mock
    const failRevoke = async () => {
      mockedKickDevice.mockResolvedValue({
        results: [],
        failures: [
          { targetDeviceId: 'd2', kind: 'epoch', error: new Error('x') }
        ],
        epoch: { rotated: false, reason: 'some-new-reason', uncovered: [] }
      } as any)
      renderModal()
      await submit()
    }
    const rotateNow = async () => {
      await act(async () => {
        fireEvent.click(screen.getByTestId('revoke-access-rotate'))
      })
      expect(ensureEpoch).toHaveBeenCalledWith({ start: true })
    }

    it('is offered only when the key did not rotate', async () => {
      mockedKickDevice.mockResolvedValue({
        results: [],
        failures: [],
        epoch: { rotated: false, reason: 'pending', uncovered: [] }
      } as any)
      renderModal()
      await submit()

      expect(screen.queryByTestId('revoke-access-rotate')).toBeNull()
    })

    it('rotates the key and says revoked once the rotation is seen', async () => {
      await failRevoke()
      ensureEpoch.mockResolvedValue({ rotated: true, uncovered: [] })

      await rotateNow()

      expect(mockedWait).toHaveBeenCalledWith(
        expect.objectContaining({ vaultId: 'v1', deviceId: 'd2' })
      )
      expect(toasts()).toEqual([ROTATED])
      expect(screen.queryByTestId('revoke-access-rotate')).toBeNull()
      await expectOutcome(ROTATED_LABEL)
    })

    it('says the key is rotating when another device has to rotate it', async () => {
      await failRevoke()
      ensureEpoch.mockResolvedValue({
        rotated: false,
        reason: 'pending',
        uncovered: []
      })

      await rotateNow()

      expect(mockedWait).not.toHaveBeenCalled()
      await expectOutcome(PENDING)
    })

    it('stays at key not rotated when the rotation fails again', async () => {
      await failRevoke()
      ensureEpoch.mockRejectedValue(new Error('Request timeout: x'))

      await rotateNow()

      expect(toasts()).toEqual([])
      expect(outcomeText()).toBe(FAILED_LABEL + FAILED)
      expect(screen.getByTestId('revoke-access-rotate')).toBeTruthy()
    })

    it('cannot be closed while the rotation runs', async () => {
      await failRevoke()
      ensureEpoch.mockReturnValue(new Promise(() => {}))

      fireEvent.click(screen.getByTestId('revoke-access-rotate'))

      expect(setCloseable).toHaveBeenLastCalledWith('m1', false)
      expect(screen.getByRole('status').textContent).toBe(PENDING_LABEL)
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
