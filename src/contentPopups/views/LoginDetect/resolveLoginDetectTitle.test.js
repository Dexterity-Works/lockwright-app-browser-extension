import { resolveLoginDetectTitle } from './resolveLoginDetectTitle'

describe('resolveLoginDetectTitle', () => {
  it('uses the page title for the site being saved', () => {
    expect(
      resolveLoginDetectTitle({
        pageTitle: 'Prios Tid',
        pageUrl: 'https://time.prios.no/auth'
      })
    ).toBe('Prios Tid')
  })

  it('uses the site host when the page has no title', () => {
    expect(
      resolveLoginDetectTitle({
        pageTitle: '   ',
        pageUrl: 'https://time.prios.no/auth'
      })
    ).toBe('time.prios.no')
  })

  it('keeps a saved record title when updating that login', () => {
    expect(
      resolveLoginDetectTitle({
        pageTitle: 'Prios Tid',
        pageUrl: 'https://time.prios.no/auth',
        existingTitle: 'Work Prios'
      })
    ).toBe('Work Prios')
  })
})
