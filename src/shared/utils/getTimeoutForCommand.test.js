import { getTimeoutForCommand } from './getTimeoutForCommand'

describe('getTimeoutForCommand', () => {
  it.each([
    ['activeVaultEnsureEpoch', 40_000],
    ['pairActiveVault', 30_000],
    ['checkAvailability', 3_000],
    ['activeVaultList', 10_000]
  ])('%s gets %d ms', (command, ms) => {
    expect(getTimeoutForCommand(command)).toBe(ms)
  })
})
