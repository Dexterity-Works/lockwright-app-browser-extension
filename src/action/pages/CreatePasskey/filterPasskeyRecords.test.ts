import { filterPasskeyRecords } from './filterPasskeyRecords'

const login = (website: string) => ({
  data: { username: 'alice', websites: [website] }
})

const offered = (rpId: string, website: string) =>
  filterPasskeyRecords(
    [login(website)],
    JSON.stringify({ rp: { id: rpId }, user: { name: 'alice' } })
  ).length === 1

describe('filterPasskeyRecords', () => {
  it.each([
    ['www.example.com', 'https://example.com'],
    ['example.com', 'https://www.example.com'],
    ['login.example.co.uk', 'https://example.co.uk'],
    ['foo.myapp.vercel.app', 'https://myapp.vercel.app']
  ])('offers a login on the same site (rp %s, login %s)', (rpId, website) => {
    expect(offered(rpId, website)).toBe(true)
  })

  it.each([
    ['www.vercel.app', 'https://myapp.vercel.app'],
    ['evil.github.io', 'https://www.github.io']
  ])(
    'does not offer a sibling tenant login (rp %s, login %s)',
    (rpId, website) => {
      expect(offered(rpId, website)).toBe(false)
    }
  )

  it('requires the same username', () => {
    expect(
      filterPasskeyRecords(
        [login('https://example.com')],
        JSON.stringify({ rp: { id: 'example.com' }, user: { name: 'bob' } })
      )
    ).toEqual([])
  })
})
