import { CLIPBOARD_CLEAR_TIMEOUT } from 'lockwright-lib-constants'

describe('pearpass-lib-constants exports the extension needs', () => {
  it('exports CLIPBOARD_CLEAR_TIMEOUT', () => {
    expect(CLIPBOARD_CLEAR_TIMEOUT).toBe(30000)
  })
})
