import { RECORD_TYPES } from 'lockwright-lib-vault'

import { buildLoginDetectCreatePayload } from './buildLoginDetectCreatePayload'

jest.mock('lockwright-lib-vault', () => ({
  RECORD_TYPES: { LOGIN: 'login' }
}))

describe('buildLoginDetectCreatePayload', () => {
  it('stores the page URL as typed so v2 create can write', () => {
    const pageUrl = 'https://inking.example/login/'
    const payload = buildLoginDetectCreatePayload({
      title: 'Inking',
      username: 'inkingone@logi.pm',
      password: 'secret',
      pageUrl
    })

    expect(payload.type).toBe(RECORD_TYPES.LOGIN)
    expect(payload.data.title).toBe('Inking')
    expect(payload.data.username).toBe('inkingone@logi.pm')
    expect(payload.data.password).toBe('secret')
    expect(payload.data.websites).toEqual([pageUrl])
    expect(payload.data.uris).toEqual(
      expect.arrayContaining([expect.objectContaining({ uri: pageUrl })])
    )
    expect(payload.data.uris).toHaveLength(1)
  })

  it('omits websites and uris when pageUrl is empty', () => {
    const payload = buildLoginDetectCreatePayload({
      title: 'Inking',
      username: 'a@b.c',
      password: 'x',
      pageUrl: ''
    })

    expect(payload.data.websites).toEqual([])
    expect(payload.data.uris).toEqual([])
  })
})
