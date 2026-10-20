import { useEffect, useRef, useState } from 'react'

import { t } from '@lingui/core/macro'
import { Button, Dialog, Text } from 'lockwright-lib-ui-react-native-components'
import { kickDevice, useVault } from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { NATIVE_MESSAGING_ERRORS } from '../../constants/nativeMessaging'
import { useModal, useModalId } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { logger } from '../../utils/logger'

export type RevokeAccessModalContentProps = {
  vaultId: string
  targetDeviceId: string
  deviceName: string
}

// Fixed copy per known reason. Anything else, including a thrown error's
// message, gets the generic sentence; the raw reason only goes to the log.
const rotationWarningFor = (reason: string | undefined, deviceName: string) => {
  switch (reason) {
    case 'not-writable':
      return t`This device can't write to the vault. "${deviceName}" can still read new items.`
    case 'self-not-in-roster':
      return t`This device isn't on the vault's member list. "${deviceName}" can still read new items.`
    case 'legacy':
      return t`The vault doesn't use rotating keys yet. "${deviceName}" can still read new items.`
    default:
      return t`Couldn't rotate the vault key. "${deviceName}" can still read new items.`
  }
}

// A rotation that timed out may still have landed. It counts as done when
// the vault's latest key no longer seals to the revoked device.
const epochAfterTimeout = async (vaultId: string, targetDeviceId: string) => {
  try {
    const status = await pearpassVaultClient.activeVaultGetEpochStatus()
    if (
      status?.vaultId === vaultId &&
      status.epoch &&
      !status.legacy &&
      !status.members?.includes(targetDeviceId)
    ) {
      return { rotated: true, uncovered: status.uncovered ?? [] }
    }
  } catch (error) {
    logger.warn('RevokeAccessModalContent', 'epoch status failed:', error)
  }
  return null
}

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
  // Set once the device is removed but the key did not rotate. The dialog
  // stays open with this warning and only offers Done.
  const [rotationWarning, setRotationWarning] = useState<string | null>(null)
  const doneRef = useRef<HTMLButtonElement>(null)
  // A late kickDevice result must not touch state or close whatever modal
  // is on top once this one is gone.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (rotationWarning) doneRef.current?.focus()
  }, [rotationWarning])

  const onRevoke = async () => {
    if (isLoading) return
    setIsLoading(true)
    setCloseable(false)
    try {
      const kick = await kickDevice({
        vaultId,
        targetDeviceId
      })
      const { failures = [] } = kick
      let { epoch } = kick
      const unreachable = failures.filter(({ kind }) => !kind)
      let epochFailure = failures.find(({ kind }) => kind === 'epoch')
      if (
        !epoch &&
        epochFailure?.error?.message?.includes(
          NATIVE_MESSAGING_ERRORS.REQUEST_TIMEOUT
        )
      ) {
        epoch = await epochAfterTimeout(vaultId, targetDeviceId)
        if (epoch) epochFailure = undefined
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

      const unreachableMessage = t`Couldn't reach the device. It will lose access next time it comes online.`

      // 'current': the latest key already leaves this device out.
      // 'pending': another member rotates when it syncs.
      if (
        !epoch ||
        (!epoch.rotated &&
          epoch.reason !== 'current' &&
          epoch.reason !== 'pending')
      ) {
        const reason = epoch?.reason
        logger.warn('RevokeAccessModalContent', 'vault key not rotated:', {
          reason,
          error: epochFailure?.error?.message
        })
        const warning = rotationWarningFor(reason, deviceName)
        // No success toast beside the warning; an unreachable device still
        // gets its toast.
        if (unreachable.length) setToast({ message: unreachableMessage })
        if (mounted.current) setRotationWarning(warning)
        else setToast({ message: warning })
        return
      }

      setToast({
        message: unreachable.length
          ? unreachableMessage
          : t`"${deviceName}" can no longer edit this vault`
      })

      if (mounted.current) closeModal()

      if (epoch.reason === 'pending') {
        setToast({
          message: t`Another device will rotate the vault key when it next syncs.`
        })
      }

      if (epoch.uncovered?.length) {
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
          message: t`${names} can't read new items until they update Lockwright and open this vault.`
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
          {rotationWarning ? (
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
        {rotationWarning && (
          <div role="alert" data-testid="revoke-access-warning">
            <Text as="p" variant="caption">
              {rotationWarning}
            </Text>
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
              {t`Anything it synced before now stays on that device. Revoking cannot delete it. Change passwords the device could see, especially if it was lost or stolen.`}
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
