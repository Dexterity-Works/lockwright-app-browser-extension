import { setPearpassVaultClient } from 'lockwright-lib-vault'

import { PearpassVaultClient } from '../vaultClient'
import { initCurrentDeviceName } from './utils/initCurrentDeviceName'

/**
 * @type {import('../vaultClient').PearpassVaultClient}
 */
export let client

/**
 * @returns {import('../vaultClient').PearpassVaultClient}
 */
export const createClient = async () => {
  if (client) {
    return client
  }

  client = new PearpassVaultClient({
    debugMode: false
  })

  setPearpassVaultClient(client)
  await initCurrentDeviceName()

  return client
}

/**
 * @returns {import('../vaultClient').PearpassVaultClient}
 */
export const getClient = () => {
  if (!client) {
    throw new Error(
      'Pearpass Vault client is not initialized. Call createClient() first.'
    )
  }

  return client
}
