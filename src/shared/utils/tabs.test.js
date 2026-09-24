import { autofillActiveTab, queryActiveTab, queryTabsByUrl } from './tabs'

describe('tabs helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('queryActiveTab', () => {
    it('returns the active tab when present', async () => {
      global.chrome = {
        tabs: {
          query: jest.fn().mockResolvedValue([{ id: 3, url: 'https://a.test' }])
        }
      }

      await expect(queryActiveTab()).resolves.toEqual({
        id: 3,
        url: 'https://a.test'
      })
    })

    it('returns null when no tab is selected (Zen empty workspace)', async () => {
      global.chrome = {
        tabs: { query: jest.fn().mockResolvedValue([]) }
      }

      await expect(queryActiveTab()).resolves.toBeNull()
    })

    it('returns null when tabs.query throws', async () => {
      global.chrome = {
        tabs: {
          query: jest.fn().mockRejectedValue(new Error('no tab'))
        }
      }

      await expect(queryActiveTab()).resolves.toBeNull()
    })
  })

  describe('queryTabsByUrl', () => {
    it('uses url filter when supported', async () => {
      const tabs = [{ id: 1, url: 'chrome-extension://x/onboarding.html' }]
      global.chrome = {
        tabs: { query: jest.fn().mockResolvedValue(tabs) }
      }

      await expect(queryTabsByUrl('chrome-extension://x/*')).resolves.toEqual(
        tabs
      )
      expect(chrome.tabs.query).toHaveBeenCalledWith({
        url: 'chrome-extension://x/*'
      })
    })

    it('falls back to scanning all tabs when url filter fails', async () => {
      const all = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'chrome-extension://x/onboarding.html' }
      ]
      global.chrome = {
        tabs: {
          query: jest
            .fn()
            .mockRejectedValueOnce(new Error('url filter unsupported'))
            .mockResolvedValueOnce(all)
        }
      }

      const result = await queryTabsByUrl('chrome-extension://x/*')
      expect(result).toEqual([all[1]])
    })
  })

  describe('autofillActiveTab', () => {
    it('sends the record to the top frame only', async () => {
      global.chrome = {
        tabs: {
          query: jest
            .fn()
            .mockResolvedValue([{ id: 7, url: 'https://a.test' }]),
          sendMessage: jest.fn().mockResolvedValue(undefined)
        }
      }
      const data = { username: 'alice', password: 's3cret' }

      await expect(
        autofillActiveTab({ recordType: 'login', data })
      ).resolves.toEqual({ id: 7, url: 'https://a.test' })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        7,
        { type: 'autofillFromAction', recordType: 'login', data },
        { frameId: 0 }
      )
    })
  })
})
