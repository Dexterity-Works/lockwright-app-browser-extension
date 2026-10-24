import { useCallback, useEffect, useRef } from 'react'

import { t } from '@lingui/core/macro'
import {
  useCreateVault,
  useVault,
  useVaults,
  type Vault
} from 'lockwright-lib-vault'
import { pearpassVaultClient } from 'lockwright-lib-vault/src/instances'

import { useVaultSwitch } from './useVaultSwitch'
import { AccessRemovedModalContent } from '../containers/AccessRemovedModalContent'
import { useModal } from '../context/ModalContext'
import { useRouter } from '../context/RouterContext'
import { useToast } from '../context/ToastContext'
import { logger } from '../utils/logger'

/**
 * Receive-side handler for "another device removed me from this vault".
 * Wipes local data, recovers to a fresh "Personal" vault when nothing
 * remains, and shows the access-removed modal.
 */
export const useVaultAccessRevoked = () => {
  const { setModal } = useModal() as {
    setModal: (content: React.ReactNode) => void
  }
  const { setToast } = useToast() as {
    setToast: (toast: { message: string }) => void
  }
  const { navigate } = useRouter() as unknown as {
    navigate: (page: string, data: { state: { recordType: string } }) => void
  }
  const { data: vaults } = useVaults()
  const { data: activeVault, deleteVaultLocal, addDevice } = useVault()
  const { switchVault } = useVaultSwitch()
  const { createVault } = useCreateVault()

  const latest = useRef({
    vaults,
    activeVault,
    deleteVaultLocal,
    addDevice,
    switchVault,
    createVault,
    setModal,
    setToast,
    navigate
  })
  useEffect(() => {
    latest.current = {
      vaults,
      activeVault,
      deleteVaultLocal,
      addDevice,
      switchVault,
      createVault,
      setModal,
      setToast,
      navigate
    }
  })

  const wipeRevokedVault = useCallback(
    async (payload: { vaultId?: string; actor?: string } = {}) => {
      const { vaultId, actor } = payload
      if (!vaultId) return false
      const {
        vaults,
        activeVault,
        deleteVaultLocal,
        addDevice,
        switchVault,
        createVault,
        setModal,
        setToast,
        navigate
      } = latest.current

      const vault = (vaults ?? []).find((v: Vault) => v.id === vaultId)
      if (!vault) return false
      const vaultName = vault.name ?? vaultId
      const deviceName = (vault.devices ?? []).find(
        (d: { id?: string }) => d?.id === actor
      )?.name as string | undefined
      const wasActive = activeVault?.id === vaultId

      try {
        await deleteVaultLocal(vaultId)
      } catch (error) {
        logger.error('useVaultAccessRevoked', 'deleteVaultLocal failed:', error)
        setModal(
          <AccessRemovedModalContent
            vaultName={vaultName}
            deviceName={deviceName}
          />
        )
        return false
      }

      if (wasActive) {
        const next = (vaults ?? []).find((v: Vault) => v.id !== vaultId)
        if (next) {
          await switchVault(next)
        } else {
          try {
            await createVault({ name: t`Personal` })
            await addDevice()
            navigate('vault', { state: { recordType: 'all' } })
            setToast({
              message: t`A new "Personal" vault was created`
            })
          } catch (error) {
            logger.error(
              'useVaultAccessRevoked',
              'failed to create fallback Personal vault:',
              error
            )
            setToast({
              message: t`Couldn't create a starter vault. Please try again.`
            })
          }
        }
      }

      setModal(
        <AccessRemovedModalContent
          vaultName={vaultName}
          deviceName={deviceName}
        />
      )
      return true
    },
    []
  )

  // The desktop forwards its own announcement and the lib derives one from
  // epoch status, so the same vault can arrive twice. 'wiping' blocks a
  // second wipe while one runs. 'wiped' blocks one until the vault leaves
  // the list, as an announcement can beat the list update. A failed wipe
  // is forgotten so the next announcement retries it.
  const handledVaults = useRef(new Map<string, 'wiping' | 'wiped'>())
  useEffect(() => {
    const listed = new Set((vaults ?? []).map((v: Vault) => v.id))
    for (const [id, state] of handledVaults.current) {
      if (state === 'wiped' && !listed.has(id)) {
        handledVaults.current.delete(id)
      }
    }
  }, [vaults])

  const handleAccessRevoked = useCallback(
    async (payload: { vaultId?: string; actor?: string } = {}) => {
      const { vaultId } = payload
      if (!vaultId || handledVaults.current.has(vaultId)) return
      handledVaults.current.set(vaultId, 'wiping')
      let wiped = false
      try {
        wiped = await wipeRevokedVault(payload)
      } finally {
        const listed = (latest.current.vaults ?? []).some(
          (v: Vault) => v.id === vaultId
        )
        if (wiped && listed) handledVaults.current.set(vaultId, 'wiped')
        else handledVaults.current.delete(vaultId)
      }
    },
    [wipeRevokedVault]
  )

  useEffect(() => {
    const client = pearpassVaultClient as unknown as
      | undefined
      | {
          on?: (event: string, handler: (payload: unknown) => void) => void
          off?: (event: string, handler: (payload: unknown) => void) => void
        }
    if (!client?.on) return
    client.on(
      'vault-access-revoked',
      handleAccessRevoked as (payload: unknown) => void
    )
    return () => {
      client.off?.(
        'vault-access-revoked',
        handleAccessRevoked as (payload: unknown) => void
      )
    }
  }, [handleAccessRevoked])
}
