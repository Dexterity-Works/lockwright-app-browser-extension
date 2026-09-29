jest.mock('./nativeMessaging', () => ({ nativeMessaging: {} }))

jest.mock('./clientKeyStore', () => ({
  ensureClientKeypairUnlocked: jest.fn(),
  commitPendingClientKeystore: jest.fn()
}))

jest.mock('./secureChannel', () => ({
  secureChannel: {
    isPaired: jest.fn(async () => false),
    hasActiveSession: () => false,
    resetTimer: jest.fn()
  }
}))

jest.mock('./utils/credentialGenerator', () => ({
  rebuildClientDataJSON: jest.fn(() => new ArrayBuffer(4)),
  buildAuthenticatorData: jest.fn(async () => new Uint8Array(37)),
  generateKeyPair: jest.fn(async () => {
    throw new Error('stop before key generation')
  })
}))

jest.mock('lockwright-lib-constants', () => ({
  MANIFEST_NAME: 'com.lockwright.test',
  MS_PER_SECOND: 1000
}))

import { MESSAGES } from './constants'
import * as CredentialGenerator from './utils/credentialGenerator'
import { CONTENT_MESSAGE_TYPES } from '../shared/constants/nativeMessaging'
import { MESSAGE_TYPES } from '../shared/services/messageBridge'

const EXTENSION_ID = 'test-extension-id'
const EXTENSION_URL = `chrome-extension://${EXTENSION_ID}/`

const pageSender = (url, { tabId = 7, frameId = 3 } = {}) => ({
  id: EXTENSION_ID,
  url,
  tab: { id: tabId },
  frameId
})

const popupSender = { id: EXTENSION_ID, url: `${EXTENSION_URL}index.html` }

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

let onMessage

const send = async (msg, sender) => {
  const sendResponse = jest.fn()
  onMessage(msg, sender, sendResponse)
  await flush()
  return sendResponse
}

const popupUrlParams = () => {
  const { url } = chrome.windows.create.mock.calls.at(-1)[0]
  return new URLSearchParams(url.slice(url.indexOf('?') + 1))
}

beforeAll(async () => {
  const event = () => ({ addListener: jest.fn() })
  global.chrome = {
    runtime: {
      id: EXTENSION_ID,
      getURL: (path) => `${EXTENSION_URL}${path}`,
      onInstalled: event(),
      onStartup: event(),
      onSuspend: event(),
      onMessage: event(),
      sendMessage: jest.fn(),
      lastError: null
    },
    windows: { create: jest.fn(), onFocusChanged: event(), WINDOW_ID_NONE: -1 },
    alarms: {
      onAlarm: event(),
      clear: jest.fn(async () => {}),
      create: jest.fn(async () => {})
    },
    tabs: {
      sendMessage: jest.fn(async () => {}),
      onRemoved: event(),
      onUpdated: event()
    },
    storage: {
      local: { get: jest.fn(async () => ({})), set: jest.fn(async () => {}) },
      onChanged: event()
    }
  }
  await import('./index')
  onMessage = chrome.runtime.onMessage.addListener.mock.calls.at(-1)[0]
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('passkey requests', () => {
  it('rejects an rpId that is not a registrable parent of the sender host', async () => {
    const sendResponse = await send(
      {
        type: MESSAGE_TYPES.GET_PASSKEY,
        requestId: 'r-1',
        publicKey: { challenge: 'c', rpId: 'victim.com' },
        requestOrigin: 'https://victim.com'
      },
      pageSender('https://attacker.example/login')
    )

    expect(chrome.windows.create).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
  })

  it('rejects a shared-hosting suffix as rpId from a tenant subdomain', async () => {
    const sendResponse = await send(
      {
        type: MESSAGE_TYPES.GET_PASSKEY,
        requestId: 'r-psl',
        publicKey: { challenge: 'c', rpId: 'github.io' }
      },
      pageSender('https://evil.github.io/login')
    )

    expect(chrome.windows.create).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
  })

  it('binds the request to the sender origin, not the requestOrigin in the message', async () => {
    await send(
      {
        type: MESSAGE_TYPES.GET_PASSKEY,
        requestId: 'r-2',
        publicKey: { challenge: 'c', rpId: 'example.com' },
        requestOrigin: 'https://victim.com'
      },
      pageSender('https://login.example.com/signin')
    )

    expect(popupUrlParams().get('requestOrigin')).toBe(
      'https://login.example.com'
    )
  })

  it('delivers the popup result to the frame that asked', async () => {
    await send(
      {
        type: MESSAGE_TYPES.GET_PASSKEY,
        requestId: 'r-3',
        publicKey: { challenge: 'c' }
      },
      pageSender('https://login.example.com/', { tabId: 11, frameId: 4 })
    )
    await send(
      {
        type: MESSAGE_TYPES.PASSKEY_RESULT,
        requestId: 'r-3',
        credential: { id: 'cred' }
      },
      popupSender
    )

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      11,
      expect.objectContaining({
        type: CONTENT_MESSAGE_TYPES.GOT_PASSKEY,
        requestId: 'r-3',
        credential: { id: 'cred' }
      }),
      { frameId: 4 }
    )
  })
})

describe('passkey signing', () => {
  const askFromPage = (requestId, type = MESSAGE_TYPES.GET_PASSKEY) =>
    send(
      {
        type,
        requestId,
        publicKey: { challenge: 'real-challenge', rpId: 'example.com' }
      },
      pageSender('https://login.example.com/signin')
    )

  const forgedPopupFields = {
    requestOrigin: 'https://attacker.example',
    serializedPublicKey: JSON.stringify({
      challenge: 'forged-challenge',
      rpId: 'attacker.example'
    })
  }

  it('signs an assertion with the stored origin and rpId, not the popup message', async () => {
    await askFromPage('r-sign')
    await send(
      {
        type: MESSAGE_TYPES.GET_ASSERTION_CREDENTIAL,
        requestId: 'r-sign',
        credential: { _privateKeyBuffer: 'AAAA', response: {} },
        ...forgedPopupFields
      },
      popupSender
    )

    expect(CredentialGenerator.rebuildClientDataJSON).toHaveBeenCalledWith(
      'real-challenge',
      'https://login.example.com',
      'webauthn.get'
    )
    expect(CredentialGenerator.buildAuthenticatorData).toHaveBeenCalledWith(
      'example.com',
      null,
      null,
      true,
      'preferred'
    )
    expect(CredentialGenerator.rebuildClientDataJSON).not.toHaveBeenCalledWith(
      'forged-challenge',
      expect.anything(),
      expect.anything()
    )
  })

  it('builds a registration from the stored request, not the popup message', async () => {
    await askFromPage('r-create', MESSAGE_TYPES.CREATE_PASSKEY)
    await send(
      {
        type: MESSAGE_TYPES.READY_FOR_PASSKEY_PAYLOAD,
        requestId: 'r-create',
        ...forgedPopupFields
      },
      popupSender
    )

    expect(CredentialGenerator.rebuildClientDataJSON).toHaveBeenCalledWith(
      'real-challenge',
      'https://login.example.com',
      'webauthn.create'
    )
    expect(CredentialGenerator.rebuildClientDataJSON).not.toHaveBeenCalledWith(
      'forged-challenge',
      expect.anything(),
      expect.anything()
    )
  })

  it.each([
    MESSAGE_TYPES.GET_ASSERTION_CREDENTIAL,
    MESSAGE_TYPES.READY_FOR_PASSKEY_PAYLOAD
  ])('refuses %s for a request the page never made', async (type) => {
    const sendResponse = await send(
      { type, requestId: 'never-asked', credential: {}, ...forgedPopupFields },
      popupSender
    )

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
    expect(CredentialGenerator.rebuildClientDataJSON).not.toHaveBeenCalled()
  })
})

describe('auto-lock and clipboard controls', () => {
  it.each([
    MESSAGE_TYPES.GET_AUTO_LOCK_SETTINGS,
    MESSAGE_TYPES.SET_AUTO_LOCK_ENABLED,
    MESSAGE_TYPES.SET_AUTO_LOCK_TIMEOUT,
    MESSAGE_TYPES.RESET_TIMER,
    MESSAGES.SCHEDULE_CLIPBOARD_CLEAR
  ])('refuses %s from a content script', async (type) => {
    const sendResponse = await send(
      { type, autoLockEnabled: false, autoLockTimeoutMs: null, delayMs: 1 },
      pageSender('https://page.example/')
    )

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Unauthorized'
    })
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
    expect(chrome.alarms.create).not.toHaveBeenCalled()
  })

  it('makes the popup heartbeat a no-op while there is no session', async () => {
    const { secureChannel } = await import('./secureChannel')
    const sendResponse = await send(
      { type: MESSAGE_TYPES.RESET_TIMER },
      popupSender
    )

    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: 'SESSION_NOT_READY'
    })
    expect(secureChannel.resetTimer).not.toHaveBeenCalled()
  })
})

describe('captured logins', () => {
  it('returns a captured login only to the origin that saved it', async () => {
    const data = { username: 'alice', password: 'pw' }
    await send(
      { type: MESSAGE_TYPES.LOGIN, data },
      pageSender('https://a.example/login', { tabId: 21, frameId: 0 })
    )

    const otherOrigin = await send(
      { type: MESSAGE_TYPES.GET_PENDING_LOGIN },
      pageSender('https://evil.example/', { tabId: 21, frameId: 5 })
    )
    expect(otherOrigin).toHaveBeenCalledWith({
      type: 'pendingLogin',
      data: null
    })

    const sameOrigin = await send(
      { type: MESSAGE_TYPES.GET_PENDING_LOGIN },
      pageSender('https://a.example/welcome', { tabId: 21, frameId: 0 })
    )
    expect(sameOrigin).toHaveBeenCalledWith({ type: 'pendingLogin', data })
  })
})
