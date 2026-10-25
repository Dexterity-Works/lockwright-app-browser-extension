import { useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@lingui/core/macro'
import {
  Button,
  ContextMenu,
  Dialog,
  ListItem,
  NavbarListItem,
  Text,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import {
  Devices,
  DoNotDisturb,
  LaptopMac,
  LaptopWindows,
  MoreVert,
  PhoneIphone,
  Tablet
} from 'lockwright-lib-ui-react-native-components/icons'
import {
  getMyDeviceId,
  getVaultKeyState,
  useVault,
  type VaultKeyState
} from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { useModal } from '../../context/ModalContext'
import { formatDate, formatDateTime } from '../../utils/date'
import { logger } from '../../utils/logger'
import { RevokeAccessModalContent } from '../RevokeAccessModalContent'

const DEVICE_ACTIONS_MENU_WIDTH = 220

type IconComponent = React.ComponentType<{
  width?: number
  height?: number
  color?: string
}>

type Device = { id?: string; name?: string; createdAt?: string }

const getDeviceDisplayName = (deviceName: string | undefined): string => {
  if (!deviceName) return t`Unknown Device`

  const lowerName = deviceName.toLowerCase()

  if (lowerName.startsWith('ios')) return t`iPhone`
  if (lowerName.startsWith('android')) return t`Android`

  return deviceName
}

const getDeviceIcon = (deviceName?: string): IconComponent => {
  if (!deviceName) return Devices

  const lowerName = deviceName.toLowerCase()

  if (lowerName.startsWith('ios') || lowerName.includes('iphone'))
    return PhoneIphone
  if (lowerName.startsWith('android')) return PhoneIphone
  if (lowerName.includes('ipad') || lowerName.includes('tablet')) return Tablet
  if (
    lowerName.includes('mac') ||
    lowerName.includes('imac') ||
    lowerName.includes('darwin') ||
    lowerName.includes('macbook')
  )
    return LaptopMac
  if (lowerName.includes('windows')) return LaptopWindows

  return Devices
}

export const PairedDevicesModalContent = () => {
  const { closeModal, setModal } = useModal() as {
    setModal: (content: React.ReactNode) => void
    closeModal: () => void
  }
  const { theme } = useTheme()

  const { data: vaultData } = useVault()
  const vaultId = (vaultData as { id?: string } | undefined)?.id ?? null

  const devices = useMemo<Device[]>(
    () =>
      Array.isArray(vaultData?.devices) ? (vaultData.devices as Device[]) : [],
    [vaultData]
  )

  const [myDeviceId, setMyDeviceId] = useState<string | null>(null)
  // Removed devices stay listed until the vault key rotates past them: a
  // revoke's rotation that timed out and never landed, or one still owed.
  const [readState, setKeyState] = useState<VaultKeyState | null>(null)
  // Only the latest read counts, and only for the vault on screen: an
  // older read can resolve last, and a switch can leave the old state.
  const readSeq = useRef(0)
  const keyState = readState?.vaultId === vaultId ? readState : null
  const readKeyState = () => {
    const seq = ++readSeq.current
    return getVaultKeyState()
      .then((state) => {
        if (seq === readSeq.current) setKeyState(state)
      })
      .catch((error: unknown) => {
        logger.warn('PairedDevicesModalContent', 'key state failed:', error)
      })
  }

  useEffect(() => {
    if (vaultId) void readKeyState()
  }, [vaultId, devices])

  const rotateNow = async () => {
    try {
      await pearpassVaultClient.activeVaultEnsureEpoch({ start: true })
    } catch (error) {
      logger.error('PairedDevicesModalContent', 'rotation failed:', error)
    }
    await readKeyState()
  }

  useEffect(() => {
    let cancelled = false
    getMyDeviceId()
      .then((id: string | null) => {
        if (!cancelled) setMyDeviceId(id ?? null)
      })
      .catch((error: unknown) => {
        logger.error(
          'PairedDevicesModalContent',
          'getMyDeviceId failed:',
          error
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openRevokeModal = (device: Device, displayName: string) => {
    if (!device.id || !vaultId) return
    setModal(
      <RevokeAccessModalContent
        vaultId={vaultId}
        targetDeviceId={device.id}
        deviceName={displayName}
      />
    )
  }

  const rotatedAt = keyState?.rotatedAt
    ? formatDateTime(keyState.rotatedAt)
    : null

  return (
    <Dialog
      title={t`Devices`}
      onClose={closeModal}
      testID="paired-devices-dialog"
      closeButtonTestID="paired-devices-close"
      footer={
        <Button
          size="small"
          type="button"
          onClick={closeModal}
          data-testid="paired-devices-close-button"
        >
          {t`Understood`}
        </Button>
      }
    >
      {devices.length === 0 && !keyState?.removed.length ? (
        <div className="flex items-center justify-center p-[24px]">
          <Text as="p" variant="body" color={theme.colors.colorTextSecondary}>
            {t`No devices synced yet`}
          </Text>
        </div>
      ) : (
        <div className="flex flex-col">
          {devices.map((device, index) => {
            const deviceName = getDeviceDisplayName(device.name)
            const DeviceIcon = getDeviceIcon(device.name)
            const createdAt = device.createdAt
              ? formatDate(device.createdAt, 'dd-mmm-yyyy', ' ')
              : null
            const isCurrentDevice = !!myDeviceId && device.id === myDeviceId
            const canRevoke = !!vaultId && !!device.id && !isCurrentDevice

            return (
              <ListItem
                key={device.id ?? `${deviceName}-${index}`}
                icon={
                  <div className="bg-surface-hover flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px]">
                    <DeviceIcon
                      width={16}
                      height={16}
                      color={theme.colors.colorAccentActive}
                    />
                  </div>
                }
                title={deviceName}
                subtitle={
                  createdAt ? `${t`Paired on`} ${createdAt}` : undefined
                }
                testID={`paired-devices-item-${device.id ?? index}`}
                rightElement={
                  canRevoke ? (
                    <ContextMenu
                      menuWidth={DEVICE_ACTIONS_MENU_WIDTH}
                      testID={`paired-devices-row-menu-${device.id}`}
                      trigger={
                        <Button
                          variant="tertiary"
                          size="small"
                          aria-label={t`Device actions`}
                          iconBefore={
                            <MoreVert
                              width={16}
                              height={16}
                              color={theme.colors.colorTextPrimary}
                            />
                          }
                        />
                      }
                    >
                      <NavbarListItem
                        size="small"
                        variant="destructive"
                        icon={
                          <DoNotDisturb
                            color={theme.colors.colorTextDestructive}
                          />
                        }
                        label={t`Revoke Access`}
                        testID={`paired-devices-row-revoke-${device.id}`}
                        onClick={() => openRevokeModal(device, deviceName)}
                      />
                    </ContextMenu>
                  ) : undefined
                }
              />
            )
          })}
          {keyState?.removed.map((device) => (
            <ListItem
              key={device.id}
              icon={
                <div className="bg-surface-hover flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px]">
                  <DoNotDisturb width={16} height={16} />
                </div>
              }
              title={getDeviceDisplayName(device.name ?? undefined)}
              subtitle={
                // A device that cannot open the latest key leaves the
                // rotation to a member that can, on its next sync.
                keyState.canRead
                  ? t`Removed · key not rotated`
                  : t`Removed · key rotating`
              }
              testID={`paired-devices-removed-${device.id}`}
              rightElement={
                keyState.canRead ? (
                  <Button
                    variant="secondary"
                    size="small"
                    type="button"
                    onClick={rotateNow}
                    data-testid={`paired-devices-rotate-${device.id}`}
                  >
                    {t`Rotate key now`}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
      {keyState?.rotatedAt ? (
        <Text
          as="p"
          variant="caption"
          color={theme.colors.colorTextSecondary}
          data-testid="paired-devices-key-rotated"
        >
          {t`Vault key last rotated ${rotatedAt}`}
        </Text>
      ) : null}
    </Dialog>
  )
}
