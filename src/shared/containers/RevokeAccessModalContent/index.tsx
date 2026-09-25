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
  const { refetch: refetchVault } = useVault()

  const [isLoading, setIsLoading] = useState(false)

  const onRevoke = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const { failures } = await kickDevice({ vaultId, targetDeviceId })

      try {
        await refetchVault(vaultId)
      } catch (error) {
        logger.error('RevokeAccessModalContent', 'refetch failed:', error)
      }

      closeModal()
      setToast({
        message: failures?.length
          ? t`Couldn't reach the device. It will lose access next time it comes online.`
          : t`"${deviceName}" can no longer edit this vault`
      })
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
            {t`Revoking stops this device from making changes. It can still read what has already synced, and anything synced later, until you move your items to a new vault.`}
          </Text>
          <Text as="p" variant="caption">
            {t`Before you proceed, please note:`}
          </Text>
        </div>
        <ul className="m-0 flex list-outside list-disc flex-col gap-[var(--spacing12)] pl-[var(--spacing20)]">
          <li className="m-0">
            <Text as="span" variant="caption">
              {t`For Your Security: We recommend moving your items to a new vault and updating your passwords. This is especially important if the device was lost or stolen, as it ensures your data remains protected even if a local copy exists on the revoked device.`}
            </Text>
          </li>
          <li className="m-0">
            <Text as="span" variant="caption">
              {t`Offline Data: Revoking cannot remotely delete data that is already on the device or was exported from it.`}
            </Text>
          </li>
        </ul>
      </div>
    </Dialog>
  )
}
