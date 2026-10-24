import { useEffect, useRef, useState } from 'react'

import { t } from '@lingui/core/macro'
import { Button, Dialog, Text } from 'lockwright-lib-ui-react-native-components'
import { kickDevice, useVault, waitForKeyRotation } from 'lockwright-lib-vault'
import { listDevices } from 'lockwright-lib-vault/src/api/listDevices'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import {
  NATIVE_MESSAGING_ERRORS,
  REQUEST_TIMEOUT
} from '../../constants/nativeMessaging'
import { useModal, useModalId } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { formatDateTime } from '../../utils/date'
import { logger } from '../../utils/logger'

export type RevokeAccessModalContentProps = {
  vaultId: string
  targetDeviceId: string
  deviceName: string
}

type KickResult = Awaited<ReturnType<typeof kickDevice>>

// After the kick the device is out of the roster. It counts as revoked only
// once the vault's key has rotated past it.
type Outcome =
  | { kind: 'rotating' }
  | { kind: 'rotated'; at: number }
  | { kind: 'pending' }
  | { kind: 'failed' }

type EpochStatus = Awaited<
  ReturnType<typeof pearpassVaultClient.activeVaultGetEpochStatus>
>

export const readEpochStatus = async (): Promise<EpochStatus | null> => {
  try {
    return await pearpassVaultClient.activeVaultGetEpochStatus()
  } catch (error) {
    logger.warn('RevokeAccessModalContent', 'epoch status failed:', error)
    return null
  }
}

export const readRosterIds = async (): Promise<Set<
  string | undefined
> | null> => {
  try {
    const devices = await listDevices()
    return Array.isArray(devices)
      ? new Set(devices.map((device: { id?: string }) => device?.id))
      : null
  } catch (error) {
    logger.warn('RevokeAccessModalContent', 'device list failed:', error)
    return null
  }
}

// A rotation that timed out may still have landed. It counts as done only
// when the vault's epoch moved on since before the kick (a new latest record
// always has a new id), the new one leaves the device out, and it seals only
// to devices still on the roster. An unchanged epoch can leave this device
// id out while the same peer holds the key under another device row, and a
// member that rotated from an older view can still seal to that row.
const rotatedSince = (
  before: EpochStatus | null,
  after: EpochStatus | null,
  roster: Set<string | undefined> | null,
  vaultId: string,
  targetDeviceId: string
) =>
  !!before &&
  !!after &&
  !!roster &&
  before.vaultId === vaultId &&
  after.vaultId === vaultId &&
  !!after.epoch &&
  !after.legacy &&
  after.epoch !== before.epoch &&
  Array.isArray(after.members) &&
  !after.members.includes(targetDeviceId) &&
  after.members.every((id) => roster.has(id))

export const RevokeAccessModalContent = ({
  vaultId,
  targetDeviceId,
  deviceName
}: RevokeAccessModalContentProps) => {
  const { closeModal: closeModalEntry, setCloseable: setEntryCloseable } =
    useModal() as {
      closeModal: (id?: string) => void
      setCloseable: (id: string | undefined, closeable: boolean) => void
    }
  // Act on this dialog's own entry; another modal may be on top by the time
  // a slow revoke returns.
  const modalId = useModalId() as string | undefined
  const closeModal = () => closeModalEntry(modalId)
  const setCloseable = (closeable: boolean) =>
    setEntryCloseable(modalId, closeable)
  const { setToast } = useToast() as {
    setToast: (toast: { message: string }) => void
  }
  const { data: vault, refetch: refetchVault } = useVault()

  const [isLoading, setIsLoading] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const settled = !!outcome && outcome.kind !== 'rotating'
  const doneRef = useRef<HTMLButtonElement>(null)
  const waitRef = useRef<AbortController | null>(null)
  // A late kickDevice result must not touch state or close whatever modal
  // is on top once this one is gone.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      waitRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (settled) doneRef.current?.focus()
  }, [settled])

  const detailFor = (kind: Outcome['kind']) => {
    switch (kind) {
      case 'pending':
        return t`${deviceName} can't change this vault. The vault key will rotate when the vault next syncs. Until then it can still read new items.`
      case 'failed':
        return t`${deviceName} can't change this vault, but it can still read new items until the key rotates.`
      default:
        return null
    }
  }
  const labelFor = (current: Outcome) => {
    switch (current.kind) {
      case 'rotated': {
        const dateTime = formatDateTime(current.at)
        return t`Revoked · key rotated ${dateTime}`
      }
      case 'failed':
        return t`Removed · key not rotated`
      default:
        return t`Removed · key rotating`
    }
  }

  // Shows the outcome, or toasts its warning once the dialog is gone.
  const show = (next: Outcome) => {
    const detail = detailFor(next.kind)
    if (mounted.current) setOutcome(next)
    else if (detail) setToast({ message: detail })
  }

  // The device is out of the roster; judge the rotation that followed.
  // Returns false when the key did not rotate.
  const settle = async (
    epoch: KickResult['epoch'],
    signal: AbortSignal,
    error?: string
  ): Promise<boolean> => {
    // 'current': the latest key already leaves this device out.
    // 'pending': another member rotates when it syncs.
    if (
      !epoch ||
      (!epoch.rotated &&
        epoch.reason !== 'current' &&
        epoch.reason !== 'pending')
    ) {
      logger.warn('RevokeAccessModalContent', 'vault key not rotated:', {
        reason: epoch?.reason,
        error
      })
      show({ kind: 'failed' })
      return false
    }
    if (epoch.reason === 'pending') {
      show({ kind: 'pending' })
      return true
    }
    show({ kind: 'rotating' })
    const state = await waitForKeyRotation({
      vaultId,
      deviceId: targetDeviceId,
      timeoutMs: REQUEST_TIMEOUT.EPOCH_MS,
      signal
    })
    if (!state) {
      show({ kind: 'pending' })
      return true
    }
    show({ kind: 'rotated', at: state.rotatedAt ?? Date.now() })
    setToast({ message: t`${deviceName} revoked. Vault key rotated.` })
    return true
  }

  const onRevoke = async () => {
    if (isLoading) return
    setIsLoading(true)
    setCloseable(false)
    const wait = new AbortController()
    waitRef.current = wait
    try {
      const statusBefore = await readEpochStatus()
      const kick = await kickDevice({
        vaultId,
        targetDeviceId
      })
      const { failures = [] } = kick
      let { epoch } = kick
      const unreachable = failures.filter(({ kind }) => !kind)
      let epochFailure = failures.find(({ kind }) => kind === 'epoch')
      const timedOut =
        !epoch &&
        !!epochFailure?.error?.message?.includes(
          NATIVE_MESSAGING_ERRORS.REQUEST_TIMEOUT
        )
      if (timedOut) {
        const statusAfter = await readEpochStatus()
        const roster = await readRosterIds()
        if (
          rotatedSince(
            statusBefore,
            statusAfter,
            roster,
            vaultId,
            targetDeviceId
          )
        ) {
          epoch = { rotated: true, uncovered: statusAfter?.uncovered ?? [] }
          epochFailure = undefined
        }
      }
      const epochFailed = !!epochFailure

      try {
        await refetchVault(vaultId)
      } catch (error) {
        logger.error('RevokeAccessModalContent', 'refetch failed:', error)
      }

      // No epoch and no epoch failure: removal did not finish; the envelope
      // may already be out; retry.
      if (!epoch && !epochFailed) {
        setToast({
          message: t`Couldn't finish revoking access. Please try again.`
        })
        return
      }

      if (unreachable.length) {
        setToast({
          message: t`Couldn't reach the device. It will stop editing next time it comes online.`
        })
      }

      // A timed-out rotation the read above did not see may still land:
      // the key is rotating, not revoked. The Devices list shows it later.
      if (timedOut && epochFailed) {
        logger.warn('RevokeAccessModalContent', 'vault key rotation unseen:', {
          error: epochFailure?.error?.message
        })
        show({ kind: 'pending' })
        return
      }

      const rotated = await settle(
        epoch,
        wait.signal,
        epochFailure?.error?.message
      )

      if (rotated && epoch?.uncovered?.length) {
        const names = [
          ...new Set(
            epoch.uncovered.map(
              (id) =>
                vault?.devices?.find((d) => d?.id === id)?.name ||
                t`Unknown Device`
            )
          )
        ].join(', ')
        setToast({
          message: t`${names} can't read new items until they open this vault once on a current Lockwright version.`
        })
      }
    } catch (error) {
      logger.error('RevokeAccessModalContent', 'kickDevice failed:', error)
      setToast({
        message: t`Couldn't revoke access. Please try again.`
      })
    } finally {
      if (mounted.current) {
        setIsLoading(false)
        setCloseable(true)
      }
    }
  }

  return (
    <Dialog
      title={t`Revoke access for ${deviceName}?`}
      onClose={isLoading ? undefined : closeModal}
      hideCloseButton={isLoading}
      testID="revoke-access-dialog"
      closeButtonTestID="revoke-access-close"
      footer={
        <div className="flex w-full justify-end gap-[var(--spacing8)]">
          {settled ? (
            <Button
              ref={doneRef}
              variant="primary"
              size="small"
              type="button"
              onClick={closeModal}
              data-testid="revoke-access-done"
            >
              {t`Done`}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="small"
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                data-testid="revoke-access-cancel"
              >
                {t`Cancel`}
              </Button>
              <Button
                variant="destructive"
                size="small"
                type="button"
                isLoading={isLoading}
                onClick={onRevoke}
                data-testid="revoke-access-submit"
              >
                {t`Revoke Access`}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div
        className="flex w-full flex-col gap-[var(--spacing12)]"
        data-testid="revoke-access-body"
      >
        {outcome && (
          <div
            role={detailFor(outcome.kind) ? 'alert' : 'status'}
            data-testid="revoke-access-warning"
          >
            <Text as="p" variant="labelEmphasized">
              {labelFor(outcome)}
            </Text>
            {detailFor(outcome.kind) && (
              <Text as="p" variant="caption">
                {detailFor(outcome.kind)}
              </Text>
            )}
          </div>
        )}
        <div className="flex flex-col">
          <Text as="p" variant="caption">
            {t`Revoking removes this device from the vault and rotates the vault key. Once the key rotates, the device can't read items added or changed after that.`}
          </Text>
          <Text as="p" variant="caption">
            {t`Before you proceed, please note:`}
          </Text>
        </div>
        <ul className="m-0 flex list-outside list-disc flex-col gap-[var(--spacing12)] pl-[var(--spacing20)]">
          <li className="m-0">
            <Text as="span" variant="caption">
              {t`Items from before the key rotates aren't re-encrypted, so the device can still read them. Revoking cannot delete what it already synced. Change passwords the device could see, especially if it was lost or stolen.`}
            </Text>
          </li>
          <li className="m-0">
            <Text as="span" variant="caption">
              {t`Devices still on an older Lockwright version must update before they can read new items.`}
            </Text>
          </li>
        </ul>
      </div>
    </Dialog>
  )
}
