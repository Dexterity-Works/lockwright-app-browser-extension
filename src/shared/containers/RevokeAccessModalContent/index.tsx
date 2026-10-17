import { useState } from 'react'

import { t } from '@lingui/core/macro'
import { Button, Dialog, Text } from 'lockwright-lib-ui-react-native-components'
import { kickDevice, useVault } from 'lockwright-lib-vault'

import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { logger } from '../../utils/logger'

export type RevokeAccessModalContentProps = {
  vaultId: string
  targetDeviceId: string
  deviceName: string
}

export const RevokeAccessModalContent = ({
  vaultId,
  targetDeviceId,
  deviceName
}: RevokeAccessModalContentProps) => {
  const { closeModal } = useModal() as { closeModal: () => void }
  const { setToast } = useToast() as {
    setToast: (toast: { message: string }) => void
  }
  const { data: vault, refetch: refetchVault } = useVault()

  const [isLoading, setIsLoading] = useState(false)

  const onRevoke = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const { failures, epoch } = await kickDevice({ vaultId, targetDeviceId })
      // 'current' means the latest key already leaves this device out.
      const rotationFailed =
        !epoch || (!epoch.rotated && epoch.reason !== 'current')
      // kickDevice reports a failed rotation in `failures` too; that one is
      // not an unreachable device, the warning below covers it.
      const unreachable = failures?.filter(
        ({ error }) => !error?.message?.startsWith('epoch rotation failed')
      )

      try {
        await refetchVault(vaultId)
      } catch (error) {
        logger.error('RevokeAccessModalContent', 'refetch failed:', error)
      }

      closeModal()
      setToast({
        message: unreachable?.length
          ? t`Couldn't reach the device. It will lose access next time it comes online.`
          : t`"${deviceName}" can no longer edit this vault`
      })

      if (rotationFailed) {
        const reason = epoch?.reason
        setToast({
          message: reason
            ? t`Couldn't rotate the vault key (${reason}). "${deviceName}" can still read new items.`
            : t`Couldn't rotate the vault key. "${deviceName}" can still read new items.`
        })
      } else if (epoch.uncovered?.length) {
        const names = epoch.uncovered
          .map((id) => vault?.devices?.find((d) => d?.id === id)?.name ?? id)
          .join(', ')
        setToast({
          message: t`${names} can't read new items until they update Lockwright and open this vault.`
        })
      }
    } catch (error) {
      logger.error('RevokeAccessModalContent', 'kickDevice failed:', error)
      setToast({
        message: t`Couldn't revoke access. Please try again.`
      })
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      title={t`Revoke access for ${deviceName}?`}
      onClose={closeModal}
      testID="revoke-access-dialog"
      closeButtonTestID="revoke-access-close"
      footer={
        <div className="flex w-full justify-end gap-[var(--spacing8)]">
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
        </div>
      }
    >
      <div
        className="flex w-full flex-col gap-[var(--spacing12)]"
        data-testid="revoke-access-body"
      >
        <div className="flex flex-col">
          <Text as="p" variant="caption">
            {t`Revoking removes this device from the vault and rotates the vault key. It can no longer read items added or changed from now on.`}
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
