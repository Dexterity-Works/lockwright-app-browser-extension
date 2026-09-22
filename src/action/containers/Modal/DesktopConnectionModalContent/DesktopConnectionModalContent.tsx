import { useState } from 'react'

import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  Button,
  Dialog,
  Text,
  useTheme
} from 'lockwright-lib-ui-react-native-components'

import { useModal } from '../../../../shared/context/ModalContext'
import { logger } from '../../../../shared/utils/logger'

const TEST_IDS = {
  root: 'desktop-connection-modal',
  closeButton: 'desktop-connection-modal-close',
  discardButton: 'desktop-connection-modal-discard',
  retryButton: 'desktop-connection-modal-retry',
  detail: 'desktop-connection-modal-detail',
  tips: 'desktop-connection-modal-tips'
} as const

type RetryResult = { success?: boolean; message?: string } | undefined | void

interface DesktopConnectionModalContentProps {
  onRetry?: () => Promise<RetryResult>
  onClose?: () => void
  /** Resolved user-facing error (e.g. host-not-found / Zen guidance). */
  detail?: string
}

export const DesktopConnectionModalContent = ({
  onRetry,
  onClose,
  detail
}: DesktopConnectionModalContentProps) => {
  const { theme } = useTheme()
  const { colors } = theme
  const { closeModal } = useModal() as { closeModal: () => Promise<void> }

  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      void closeModal()
    }
    window.close()
  }

  const handleRetry = async () => {
    if (!onRetry) {
      handleClose()
      return
    }

    setLoading(true)
    try {
      const result = await onRetry()
      if (result && result.success === false) {
        throw new Error(result.message)
      }
    } catch (error) {
      logger.error('Retry failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      title={t`Desktop app required`}
      onClose={handleClose}
      closeOnOutsideClick={false}
      testID={TEST_IDS.root}
      closeButtonTestID={TEST_IDS.closeButton}
      footer={
        <div className="flex w-full items-center justify-end gap-[var(--spacing8)]">
          <Button
            variant="secondary"
            size="small"
            onClick={handleClose}
            disabled={loading}
            data-testid={TEST_IDS.discardButton}
          >
            <Trans>Discard</Trans>
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleRetry}
            disabled={loading}
            isLoading={loading}
            data-testid={TEST_IDS.retryButton}
          >
            <Trans>Sync again</Trans>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--spacing12)]">
        <Text variant="caption" color={colors.colorTextSecondary}>
          <Trans>
            The browser extension needs the Lockwright desktop app to be open
            and running to access your secure vaults.
          </Trans>
        </Text>
        {detail ? (
          <Text
            variant="caption"
            color={colors.colorTextSecondary}
            data-testid={TEST_IDS.detail}
          >
            {detail}
          </Text>
        ) : null}
        <Text
          variant="caption"
          color={colors.colorTextSecondary}
          data-testid={TEST_IDS.tips}
        >
          <Trans>
            Firefox / Zen: use the Firefox build of this extension and keep the
            desktop app installed so the native messaging host is registered.
            Flatpak Zen needs permission to read the host native-messaging
            paths.
          </Trans>
        </Text>
      </div>
    </Dialog>
  )
}
