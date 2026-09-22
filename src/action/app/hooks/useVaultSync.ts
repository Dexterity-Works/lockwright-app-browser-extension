import { useEffect } from 'react'

import { useVault } from 'lockwright-lib-vault'

import { useRouter } from '../../../shared/context/RouterContext'
import { isExpectedQuietError } from '../../../shared/utils/isExpectedQuietError'
import { logger } from '../../../shared/utils/logger'

export const useVaultSync = (): void => {
  const { currentPage, navigate } = useRouter()
  const { syncVault } = useVault()

  useEffect(() => {
    const checkVaultSync = async () => {
      try {
        await syncVault()
      } catch (error) {
        if (!isExpectedQuietError(error)) {
          logger.error('Error syncing vault:', error)
        }
      }
    }

    void checkVaultSync()
  }, [currentPage, navigate, syncVault])
}
