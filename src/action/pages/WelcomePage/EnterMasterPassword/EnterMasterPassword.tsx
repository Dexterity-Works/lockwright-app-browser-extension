import React, { useCallback, useState } from 'react'

import { t } from '@lingui/core/macro'
import { useUserData, useVault, useVaults } from 'lockwright-lib-vault'

import { MasterPasswordPrompt } from '../../../containers/MasterPasswordPrompt/MasterPasswordPrompt'
import { useVaultOpenedRedirect } from '../../../app/hooks/useVaultOpenedRedirect'
import { AUTH_ERROR_PATTERNS } from '../../../../shared/constants/auth'
import { NAVIGATION_ROUTES } from '../../../../shared/constants/navigation'
import { useRouter } from '../../../../shared/context/RouterContext'
import { secureChannelMessages } from '../../../../shared/services/messageBridge'
import { logger } from '../../../../shared/utils/logger'
import { sortByName } from '../../../../shared/utils/sortByName'

type MasterPasswordStatus = {
  isLocked?: boolean
  remainingAttempts?: number
} | null

const getIncorrectPasswordError = (status: MasterPasswordStatus) => {
  const remainingAttempts =
    typeof status?.remainingAttempts === 'number'
      ? status.remainingAttempts
      : null

  return remainingAttempts !== null
    ? t`Incorrect password. You have ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} before the app will be temporarily locked.`
    : t`Incorrect password. Please try again.`
}

export const EnterMasterPassword = () => {
  const { navigate, currentPage } = useRouter()
  const { logIn, refreshMasterPasswordStatus } = useUserData()
  const { isVaultProtected, refetch: refetchVault } = useVault()
  const navigateAfterVaultOpened = useVaultOpenedRedirect()

  const [error, setError] = useState<string>('')

  const { initVaults, refetch: refetchVaults } = useVaults()

  const handleIncorrectPassword = useCallback(async () => {
    let status: MasterPasswordStatus
    try {
      status = await refreshMasterPasswordStatus()
    } catch (refreshError) {
      logger.error('Error refreshing master password status:', refreshError)
      setError(t`Incorrect password. Please try again.`)
      return
    }

    if (status?.isLocked) {
      navigate('welcome', {
        params: { state: NAVIGATION_ROUTES.SCREEN_LOCKED }
      })
      return
    }

    setError(getIncorrectPasswordError(status))
  }, [navigate, refreshMasterPasswordStatus])

  const handleSubmit = useCallback(
    async (password: string) => {
      setError('')

      try {
        try {
          await secureChannelMessages.unlockClientKeystore(password)
        } catch (keystoreErr) {
          const message = (keystoreErr as Error)?.message
          if (message?.includes(AUTH_ERROR_PATTERNS.MASTER_PASSWORD_REQUIRED)) {
            setError(t`Incorrect password. Please try again.`)
            logger.error(
              'Error unlocking secure channel keystore:',
              keystoreErr
            )
            return
          }
          if (message?.includes(AUTH_ERROR_PATTERNS.MASTER_PASSWORD_INVALID)) {
            logger.error(
              'Error unlocking secure channel keystore:',
              keystoreErr
            )
            await handleIncorrectPassword()
            return
          }
          logger.error(
            'Error initializing secure channel keystore:',
            keystoreErr
          )
        }

        await logIn({ password })
        await initVaults({ password })

        const vaults = await refetchVaults()
        const firstVault = sortByName(vaults)[0] as
          | { id: string; name: string }
          | undefined

        if (!firstVault) {
          navigate(currentPage, {
            params: { state: NAVIGATION_ROUTES.VAULTS }
          })
          return
        }

        const protectedVault = await isVaultProtected(firstVault.id)
        if (protectedVault) {
          navigate(currentPage, {
            params: {
              state: NAVIGATION_ROUTES.VAULT_PASSWORD,
              vaultId: firstVault.id
            }
          })
          return
        }

        await refetchVault(firstVault.id)
        navigateAfterVaultOpened()
      } catch (submitError) {
        let status: MasterPasswordStatus
        try {
          status = await refreshMasterPasswordStatus()
        } catch (refreshError) {
          logger.error('Error refreshing master password status:', refreshError)
          setError(
            typeof submitError === 'string'
              ? submitError
              : t`Incorrect password. Please try again.`
          )
          logger.error('Error unlocking Lockwright:', submitError)
          return
        }

        const { isLocked } = status || {}

        if (isLocked) {
          navigate('welcome', {
            params: { state: NAVIGATION_ROUTES.SCREEN_LOCKED }
          })
          return
        }

        setError(
          typeof submitError === 'string'
            ? submitError
            : getIncorrectPasswordError(status)
        )
        logger.error('Error unlocking Lockwright:', submitError)
      }
    },
    [
      logIn,
      initVaults,
      refetchVaults,
      isVaultProtected,
      refetchVault,
      navigateAfterVaultOpened,
      refreshMasterPasswordStatus,
      navigate,
      currentPage,
      handleIncorrectPassword
    ]
  )

  return (
    <MasterPasswordPrompt
      onSubmit={handleSubmit}
      error={error}
      onPasswordChange={() => {
        if (error) setError('')
      }}
      testID="unlock-password-input-v2"
    />
  )
}
