import { renderHook, waitFor } from '@testing-library/react'
import { useRecords } from 'lockwright-lib-vault'

import { useFilteredRecords } from './useFilteredRecords'
import { URI_MATCH_TYPES } from '../../shared/constants/uriMatch'
import { useRouter } from '../../shared/context/RouterContext'
import {
  __resetUriMatchSettingsCacheForTests,
  setDefaultUriMatchType,
  setUriMatchOverrides
} from '../../shared/utils/uriMatchSetting'

jest.mock('lockwright-lib-vault', () => ({
  useRecords: jest.fn()
}))

jest.mock('../../shared/context/RouterContext', () => ({
  useRouter: jest.fn()
}))

beforeEach(() => {
  __resetUriMatchSettingsCacheForTests()
  global.chrome = {
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined)
      },
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    }
  }
})

afterEach(() => {
  __resetUriMatchSettingsCacheForTests()
  delete global.chrome
})

describe('useFilteredRecords', () => {
  it('should return filtered records based on router state', () => {
    const mockRouterState = {
      recordType: 'login',
      url: 'https://example.com'
    }

    const mockRecordsData = [
      {
        id: 'r1',
        data: {
          websites: ['https://example.com', 'https://another.com']
        }
      },
      {
        id: 'r2',
        data: {
          websites: ['https://notexample.com']
        }
      }
    ]

    useRouter.mockReturnValue({ state: mockRouterState })
    useRecords.mockReturnValue({
      data: mockRecordsData,
      isInitialized: true,
      isLoading: false
    })

    const { result } = renderHook(() => useFilteredRecords())

    expect(result.current.filteredRecords).toEqual([mockRecordsData[0]])
    expect(result.current.isInitialized).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('should return all records if no URL is provided in router state', () => {
    const mockRouterState = {
      recordType: 'login',
      url: null
    }

    const mockRecordsData = [
      {
        data: {
          websites: ['https://example.com', 'https://another.com']
        }
      },
      {
        data: {
          websites: ['https://notexample.com']
        }
      }
    ]

    useRouter.mockReturnValue({ state: mockRouterState })
    useRecords.mockReturnValue({
      data: mockRecordsData,
      isInitialized: true,
      isLoading: false
    })

    const { result } = renderHook(() => useFilteredRecords())

    expect(result.current.filteredRecords).toEqual(mockRecordsData)
    expect(result.current.isInitialized).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle loading state correctly', () => {
    useRouter.mockReturnValue({ state: { recordType: 'login', url: null } })
    useRecords.mockReturnValue({
      data: null,
      isInitialized: false,
      isLoading: true
    })

    const { result } = renderHook(() => useFilteredRecords())

    expect(result.current.filteredRecords).toBe(null)
    expect(result.current.isInitialized).toBe(false)
    expect(result.current.isLoading).toBe(true)
  })

  it('matches login records whose website is stored without a protocol', () => {
    useRouter.mockReturnValue({
      state: { recordType: 'login', url: 'https://example.com/login' }
    })
    const bareHostRecord = {
      id: 'bare',
      data: { websites: ['example.com'] }
    }
    useRecords.mockReturnValue({
      data: [
        bareHostRecord,
        { id: 'other', data: { websites: ['other.com'] } }
      ],
      isInitialized: true,
      isLoading: false
    })

    const { result } = renderHook(() => useFilteredRecords())

    expect(result.current.filteredRecords).toEqual([bareHostRecord])
  })

  it('matches login records across www and subdomain variations', () => {
    useRouter.mockReturnValue({
      state: { recordType: 'login', url: 'https://login.example.com/app' }
    })
    const parentDomainRecord = {
      id: 'parent',
      data: { websites: ['https://example.com'] }
    }
    const wwwRecord = {
      id: 'www',
      data: { websites: ['www.example.com'] }
    }
    useRecords.mockReturnValue({
      data: [
        parentDomainRecord,
        wwwRecord,
        { id: 'evil', data: { websites: ['https://evil-example.com'] } }
      ],
      isInitialized: true,
      isLoading: false
    })

    const { result } = renderHook(() => useFilteredRecords())

    expect(result.current.filteredRecords).toEqual([
      parentDomainRecord,
      wwwRecord
    ])
  })

  it('respects per-website host match overrides (subdomain does not match)', async () => {
    useRouter.mockReturnValue({
      state: { recordType: 'login', url: 'https://login.example.com/app' }
    })
    const hostOnlyRecord = {
      id: 'host-only',
      data: { websites: ['https://example.com'] }
    }
    useRecords.mockReturnValue({
      data: [hostOnlyRecord],
      isInitialized: true,
      isLoading: false
    })

    await setUriMatchOverrides('host-only', {
      'https://example.com': URI_MATCH_TYPES.HOST
    })

    const { result } = renderHook(() => useFilteredRecords())

    await waitFor(() => {
      expect(result.current.filteredRecords).toEqual([])
    })
  })

  it('respects default match type host (subdomain does not match)', async () => {
    useRouter.mockReturnValue({
      state: { recordType: 'login', url: 'https://login.example.com/app' }
    })
    const record = {
      id: 'r-default-host',
      data: { websites: ['https://example.com'] }
    }
    useRecords.mockReturnValue({
      data: [record],
      isInitialized: true,
      isLoading: false
    })

    await setDefaultUriMatchType(URI_MATCH_TYPES.HOST)

    const { result } = renderHook(() => useFilteredRecords())

    await waitFor(() => {
      expect(result.current.filteredRecords).toEqual([])
    })
  })

  it('matches a host stored only on data.uris', () => {
    const stripeUriOnly = {
      id: 'stripe-uri',
      data: {
        websites: [],
        uris: [{ uri: 'https://dashboard.stripe.com', match: 'host' }]
      }
    }

    useRouter.mockReturnValue({
      state: {
        recordType: 'login',
        url: 'https://dashboard.stripe.com/login'
      }
    })
    useRecords.mockReturnValue({
      data: [stripeUriOnly],
      isInitialized: true,
      isLoading: false
    })

    const { result } = renderHook(() => useFilteredRecords())

    expect(result.current.filteredRecords).toEqual([stripeUriOnly])
  })

  it('in otp fillMode excludes site-matched logins that have no authenticator', () => {
    const stripeLogin = {
      id: 'stripe-login',
      data: {
        username: 'ada',
        password: 'secret',
        websites: ['https://dashboard.stripe.com']
      }
    }
    const stripeTotp = {
      id: 'stripe-totp',
      otpPublic: { type: 'TOTP', currentCode: '123456' },
      data: { websites: ['https://dashboard.stripe.com'] }
    }

    useRouter.mockReturnValue({
      state: {
        recordType: 'login',
        fillMode: 'otp',
        url: 'https://dashboard.stripe.com/login'
      }
    })
    useRecords.mockReturnValue({
      data: [stripeLogin, stripeTotp],
      isInitialized: true,
      isLoading: false
    })

    const { result } = renderHook(() => useFilteredRecords())

    expect(result.current.filteredRecords).toEqual([stripeTotp])
  })
})
