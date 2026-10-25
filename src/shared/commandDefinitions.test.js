import { COMMAND_NAMES, getCommandParams } from './commandDefinitions'

describe('commandDefinitions', () => {
  it('maps epoch commands to their desktop command parameters', () => {
    const options = { start: true }

    expect(COMMAND_NAMES).toContain('activeVaultEnsureEpoch')
    expect(COMMAND_NAMES).toContain('activeVaultGetEpochStatus')
    expect(getCommandParams('activeVaultEnsureEpoch', [options])).toBe(options)
    expect(getCommandParams('activeVaultGetEpochStatus', [])).toEqual({})
  })

  it('maps only provided arguments for regular commands', () => {
    expect(getCommandParams('encryptionGet', ['record-key'])).toEqual({
      key: 'record-key'
    })
    expect(getCommandParams('encryptionGet', [])).toEqual({})
  })

  it('rejects command names without a definition', () => {
    expect(() => getCommandParams('missingCommand', [])).toThrow(
      'Unknown command: missingCommand'
    )
  })
})
