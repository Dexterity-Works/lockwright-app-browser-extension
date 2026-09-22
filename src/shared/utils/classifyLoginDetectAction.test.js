import { classifyLoginDetectAction } from './classifyLoginDetectAction'

jest.mock('lockwright-lib-vault', () => ({
  RECORD_TYPES: { LOGIN: 'login' }
}))

const loginRecord = ({
  id = 'rec-1',
  username = 'alice',
  password = 'secret',
  websites = ['https://example.com']
} = {}) => ({
  id,
  type: 'login',
  data: { username, password, websites, title: 'Example', note: 'keep-me' }
})

describe('classifyLoginDetectAction', () => {
  it('returns save when no matching login exists', () => {
    const result = classifyLoginDetectAction({
      records: [
        loginRecord({ username: 'other' }),
        { type: 'note', data: { username: 'alice' } }
      ],
      pageUrl: 'https://example.com/login',
      username: 'alice',
      password: 'new'
    })

    expect(result).toEqual({ action: 'save', existingRecord: null })
  })

  it('returns save when username matches but site does not', () => {
    const result = classifyLoginDetectAction({
      records: [loginRecord({ websites: ['https://other.com'] })],
      pageUrl: 'https://example.com/login',
      username: 'alice',
      password: 'secret'
    })

    expect(result.action).toBe('save')
    expect(result.existingRecord).toBeNull()
  })

  it('trims usernames when matching', () => {
    const existing = loginRecord({ username: 'alice' })
    const result = classifyLoginDetectAction({
      records: [existing],
      pageUrl: 'https://example.com/login',
      username: '  alice  ',
      password: 'secret'
    })

    expect(result.action).toBe('noop')
    expect(result.existingRecord).toBe(existing)
  })

  it('returns noop when username+site match and password is unchanged', () => {
    const existing = loginRecord()
    const result = classifyLoginDetectAction({
      records: [existing],
      pageUrl: 'https://example.com/login',
      username: 'alice',
      password: 'secret'
    })

    expect(result).toEqual({ action: 'noop', existingRecord: existing })
  })

  it('returns update when username+site match and password differs', () => {
    const existing = loginRecord()
    const result = classifyLoginDetectAction({
      records: [existing],
      pageUrl: 'https://www.example.com/path',
      username: 'alice',
      password: 'changed'
    })

    expect(result).toEqual({ action: 'update', existingRecord: existing })
  })

  it('ignores non-login records even with matching username/site', () => {
    const result = classifyLoginDetectAction({
      records: [
        {
          id: 'n1',
          type: 'note',
          data: {
            username: 'alice',
            password: 'secret',
            websites: ['https://example.com']
          }
        }
      ],
      pageUrl: 'https://example.com',
      username: 'alice',
      password: 'secret'
    })

    expect(result.action).toBe('save')
  })

  it('handles missing records/username safely', () => {
    expect(
      classifyLoginDetectAction({
        pageUrl: 'https://example.com',
        password: 'x'
      })
    ).toEqual({ action: 'save', existingRecord: null })
  })

  it('trims passwords when comparing for noop', () => {
    const existing = loginRecord({ password: 'secret' })
    const result = classifyLoginDetectAction({
      records: [existing],
      pageUrl: 'https://example.com/login',
      username: 'alice',
      password: '  secret  '
    })

    expect(result.action).toBe('noop')
    expect(result.existingRecord).toBe(existing)
  })

  it('noops for localhost when password is unchanged', () => {
    const existing = loginRecord({
      websites: ['http://localhost:8080'],
      password: 'secret'
    })
    const result = classifyLoginDetectAction({
      records: [existing],
      pageUrl: 'http://localhost:8080/dashboard',
      username: 'alice',
      password: 'secret'
    })

    expect(result.action).toBe('noop')
    expect(result.existingRecord).toBe(existing)
  })

  it('noops for IP host when websites match via hostname equality', () => {
    const existing = loginRecord({
      websites: ['http://10.0.12.54'],
      password: 'secret'
    })
    const result = classifyLoginDetectAction({
      records: [existing],
      pageUrl: 'http://10.0.12.54/login',
      username: 'alice',
      password: 'secret'
    })

    expect(result.action).toBe('noop')
    expect(result.existingRecord).toBe(existing)
  })

  it('prefers the more specific URI match when multiple logins match', () => {
    const domainOnly = loginRecord({
      id: 'domain',
      password: 'old',
      websites: ['https://example.com']
      // force domain via missing uris → default domain
    })
    const startsWith = {
      id: 'starts',
      type: 'login',
      data: {
        username: 'alice',
        password: 'secret',
        title: 'App',
        websites: ['https://example.com/app'],
        uris: [
          {
            uri: 'https://example.com/app',
            match: 'startsWith'
          }
        ]
      }
    }

    const result = classifyLoginDetectAction({
      records: [domainOnly, startsWith],
      pageUrl: 'https://example.com/app/dashboard',
      username: 'alice',
      password: 'secret'
    })

    expect(result.action).toBe('noop')
    expect(result.existingRecord).toBe(startsWith)
  })
})
