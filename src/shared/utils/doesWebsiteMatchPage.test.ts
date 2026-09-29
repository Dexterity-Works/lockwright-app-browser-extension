import {
  URI_MATCH_TYPES,
  doesWebsiteMatchPage,
  recordMatchesCurrentSite
} from './doesWebsiteMatchPage'

describe('doesWebsiteMatchPage', () => {
  describe('domain (default)', () => {
    it('matches a bare host stored without protocol', () => {
      expect(
        doesWebsiteMatchPage('https://example.com/login', 'example.com')
      ).toBe(true)
    })

    it('matches https page URL to https website entry', () => {
      expect(
        doesWebsiteMatchPage('https://example.com/path', 'https://example.com')
      ).toBe(true)
    })

    it('matches across www variants via same registrable domain', () => {
      expect(
        doesWebsiteMatchPage('https://www.example.com', 'example.com')
      ).toBe(true)
      expect(
        doesWebsiteMatchPage('https://example.com', 'www.example.com')
      ).toBe(true)
    })

    it('matches subdomain to parent via same eTLD+1', () => {
      expect(
        doesWebsiteMatchPage(
          'https://login.example.com/app',
          'https://example.com'
        )
      ).toBe(true)
      expect(
        doesWebsiteMatchPage('https://example.com', 'login.example.com')
      ).toBe(true)
    })

    it('matches a subdomain under a multi-part public suffix', () => {
      expect(
        doesWebsiteMatchPage('https://login.example.co.uk', 'example.co.uk')
      ).toBe(true)
    })

    it('keeps sibling tenants on a shared-hosting suffix apart', () => {
      for (const suffix of [
        'vercel.app',
        'github.io',
        'netlify.app',
        'pages.dev',
        'herokuapp.com'
      ]) {
        expect(
          doesWebsiteMatchPage(`https://evil.${suffix}`, `myapp.${suffix}`)
        ).toBe(false)
      }
    })

    it('matches equal hostnames even when getDomain is unavailable', () => {
      expect(
        doesWebsiteMatchPage('http://192.168.1.10/login', '192.168.1.10')
      ).toBe(true)
    })

    it('returns false for unrelated hosts', () => {
      expect(
        doesWebsiteMatchPage('https://example.com', 'https://evil-example.com')
      ).toBe(false)
      expect(doesWebsiteMatchPage('https://example.com', 'other.com')).toBe(
        false
      )
    })

    it('returns false for empty/invalid inputs', () => {
      expect(doesWebsiteMatchPage('https://example.com', '')).toBe(false)
      expect(
        doesWebsiteMatchPage('https://example.com', null as unknown as string)
      ).toBe(false)
      expect(doesWebsiteMatchPage('not-a-url', 'example.com')).toBe(false)
      expect(doesWebsiteMatchPage('https://example.com', ':::')).toBe(false)
    })

    it('defaults matchType to domain when omitted', () => {
      expect(
        doesWebsiteMatchPage(
          'https://login.example.com',
          'example.com',
          undefined
        )
      ).toBe(true)
    })
  })

  describe('host', () => {
    it('matches exact hostname including www', () => {
      expect(
        doesWebsiteMatchPage(
          'https://www.example.com/path',
          'https://www.example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(true)
    })

    it('does not match different subdomain', () => {
      expect(
        doesWebsiteMatchPage(
          'https://login.example.com',
          'https://example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(false)
    })

    it('does not match www vs apex (Bitwarden-style)', () => {
      expect(
        doesWebsiteMatchPage(
          'https://www.example.com',
          'example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(false)
      expect(
        doesWebsiteMatchPage(
          'https://example.com',
          'www.example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(false)
    })

    it('requires non-default port to match when present', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com:8443/app',
          'https://example.com:8443',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(true)
      expect(
        doesWebsiteMatchPage(
          'https://example.com:8443/app',
          'https://example.com',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(false)
      expect(
        doesWebsiteMatchPage(
          'https://example.com/app',
          'https://example.com:8443',
          URI_MATCH_TYPES.HOST
        )
      ).toBe(false)
    })
  })

  describe('startsWith', () => {
    it('matches when normalized page URL starts with saved website', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/app/login',
          'https://example.com/app',
          URI_MATCH_TYPES.STARTS_WITH
        )
      ).toBe(true)
    })

    it('rejects when path is not a prefix', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/other',
          'https://example.com/app',
          URI_MATCH_TYPES.STARTS_WITH
        )
      ).toBe(false)
    })

    it('normalizes bare host website before prefix check', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/path',
          'example.com',
          URI_MATCH_TYPES.STARTS_WITH
        )
      ).toBe(true)
    })
  })

  describe('exact', () => {
    it('matches when normalizeUrl values are equal', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/path/',
          'https://example.com/path',
          URI_MATCH_TYPES.EXACT
        )
      ).toBe(true)
    })

    it('rejects path drift', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/path',
          'https://example.com/other',
          URI_MATCH_TYPES.EXACT
        )
      ).toBe(false)
    })

    it('treats query as irrelevant because normalizeUrl strips search', () => {
      expect(
        doesWebsiteMatchPage(
          'https://example.com/path?q=1',
          'https://example.com/path',
          URI_MATCH_TYPES.EXACT
        )
      ).toBe(true)
    })
  })
})

describe('recordMatchesCurrentSite', () => {
  it('returns true when any websites entry matches the page', () => {
    expect(
      recordMatchesCurrentSite(
        { id: 'r1', data: { websites: ['other.com', 'example.com'] } },
        'https://www.example.com'
      )
    ).toBe(true)
  })

  it('returns false when websites is missing or empty', () => {
    expect(recordMatchesCurrentSite({}, 'https://example.com')).toBe(false)
    expect(recordMatchesCurrentSite({ data: {} }, 'https://example.com')).toBe(
      false
    )
    expect(
      recordMatchesCurrentSite(
        { data: { websites: [] } },
        'https://example.com'
      )
    ).toBe(false)
  })

  it('returns false when no website entry matches', () => {
    expect(
      recordMatchesCurrentSite(
        { data: { websites: ['other.com'] } },
        'https://example.com'
      )
    ).toBe(false)
  })

  it('uses getMatchTypeForWebsite when provided', () => {
    expect(
      recordMatchesCurrentSite(
        { id: 'r1', data: { websites: ['example.com'] } },
        'https://login.example.com',
        {
          getMatchTypeForWebsite: () => URI_MATCH_TYPES.HOST
        }
      )
    ).toBe(false)

    expect(
      recordMatchesCurrentSite(
        { id: 'r1', data: { websites: ['example.com'] } },
        'https://example.com',
        {
          getMatchTypeForWebsite: () => URI_MATCH_TYPES.HOST
        }
      )
    ).toBe(true)
  })

  it('uses defaultMatchType when no per-website resolver is given', () => {
    expect(
      recordMatchesCurrentSite(
        { data: { websites: ['example.com'] } },
        'https://login.example.com',
        { defaultMatchType: URI_MATCH_TYPES.HOST }
      )
    ).toBe(false)
  })

  it('matches a host written only on data.uris when websites is empty', () => {
    expect(
      recordMatchesCurrentSite(
        {
          id: 'r1',
          data: {
            websites: [],
            uris: [{ uri: 'https://dashboard.stripe.com', match: 'host' }]
          }
        },
        'https://dashboard.stripe.com/login'
      )
    ).toBe(true)
  })

  it('matches a host written on data.uris even when websites is a different stale list', () => {
    expect(
      recordMatchesCurrentSite(
        {
          id: 'r1',
          data: {
            websites: ['https://other.com'],
            uris: [{ uri: 'https://dashboard.stripe.com', match: 'host' }]
          }
        },
        'https://dashboard.stripe.com/2fa'
      )
    ).toBe(true)
  })

  it('uses vault uris match via resolveUriMatchType when record has uris', () => {
    expect(
      recordMatchesCurrentSite(
        {
          id: 'r1',
          data: {
            websites: ['https://example.com'],
            uris: [{ uri: 'https://example.com', match: 'host' }]
          }
        },
        'https://login.example.com'
      )
    ).toBe(false)

    expect(
      recordMatchesCurrentSite(
        {
          id: 'r1',
          data: {
            websites: ['https://example.com'],
            uris: [{ uri: 'https://example.com', match: 'baseDomain' }]
          }
        },
        'https://login.example.com'
      )
    ).toBe(true)
  })
})
