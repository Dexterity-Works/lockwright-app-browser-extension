import { REQUEST_TIMEOUT, SPECIAL_COMMANDS } from '../constants/nativeMessaging'

/**
 * @param {string | undefined} command
 * @returns {number} ms the desktop gets to answer this command
 */
export const getTimeoutForCommand = (command) => {
  switch (command) {
    case SPECIAL_COMMANDS.CHECK_AVAILABILITY:
      return REQUEST_TIMEOUT.AVAILABILITY_CHECK_MS
    case SPECIAL_COMMANDS.PAIR_ACTIVE_VAULT:
      return REQUEST_TIMEOUT.PAIRING_MS
    case 'activeVaultEnsureEpoch':
      return REQUEST_TIMEOUT.EPOCH_MS
    default:
      return REQUEST_TIMEOUT.DEFAULT_MS
  }
}
