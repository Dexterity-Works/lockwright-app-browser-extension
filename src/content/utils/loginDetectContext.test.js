import { loginDetectContext } from './loginDetectContext'

describe('loginDetectContext', () => {
  it('sends the page URL and title for the site being saved', () => {
    expect(
      loginDetectContext({
        href: 'https://time.prios.no/auth',
        title: 'Prios Tid'
      })
    ).toEqual({
      url: 'https://time.prios.no/auth',
      pageTitle: 'Prios Tid'
    })
  })

  it('sends an empty title when the page has none', () => {
    expect(
      loginDetectContext({
        href: 'https://time.prios.no/auth',
        title: '   '
      })
    ).toEqual({
      url: 'https://time.prios.no/auth',
      pageTitle: ''
    })
  })
})
