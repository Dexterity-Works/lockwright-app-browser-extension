/**
 * @jest-environment node
 */
/* eslint-env jest */
import { ed25519 } from '@noble/curves/ed25519'

import { base64Encode, base64Decode } from '../shared/utils/base64'

const KEY_ID = 'client-ed25519'
const PASSWORD = 'correct horse battery staple'
const LEGACY_ITERATIONS = 100000
const CURRENT_ITERATIONS = 600000

// Minimal in-memory IndexedDB: enough of the request/transaction surface for
// openDb/getKeyRecord/putKeyRecord/deleteKeyRecord in clientKeyStore.js.
const makeFakeIndexedDB = (store) => {
  const request = (run) => {
    const req = {}
    queueMicrotask(() => {
      try {
        req.result = run()
        req.onsuccess?.()
      } catch (error) {
        req.error = error
        req.onerror?.()
      }
    })
    return req
  }

  const db = {
    objectStoreNames: { contains: () => true },
    transaction: () => {
      const tx = {}
      const complete = () => queueMicrotask(() => tx.oncomplete?.())
      tx.objectStore = () => ({
        get: (id) => request(() => store.get(id)),
        put: (record) =>
          request(() => {
            store.set(record.id, record)
            complete()
          }),
        delete: (id) =>
          request(() => {
            store.delete(id)
            complete()
          })
      })
      return tx
    }
  }

  return { open: () => request(() => db) }
}

const deriveKey = async (password, salt, iterations) => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

const buildRecord = async (privateKey, password, iterations, withField) => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, iterations)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    privateKey
  )
  return {
    id: KEY_ID,
    publicKeyB64: base64Encode(ed25519.getPublicKey(privateKey)),
    saltB64: base64Encode(salt),
    nonceB64: base64Encode(nonce),
    ciphertextB64: base64Encode(new Uint8Array(ciphertext)),
    createdAt: '2024-01-01T00:00:00.000Z',
    ...(withField ? { iterations } : {})
  }
}

const decryptRecord = async (record, password, iterations) => {
  const key = await deriveKey(
    password,
    base64Decode(record.saltB64),
    iterations
  )
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(record.nonceB64) },
    key,
    base64Decode(record.ciphertextB64)
  )
  return new Uint8Array(plaintext)
}

const bytes = (u8) => Array.from(u8)

let store
let mod

beforeEach(async () => {
  store = new Map()
  global.indexedDB = makeFakeIndexedDB(store)
  jest.resetModules()
  mod = await import('./clientKeyStore')
})

afterEach(() => {
  delete global.indexedDB
})

describe('clientKeyStore PBKDF2 iterations', () => {
  it('unlocks a record encrypted at 100000 without iterations and rewrites it at 600000', async () => {
    const privateKey = ed25519.utils.randomPrivateKey()
    const legacy = await buildRecord(
      privateKey,
      PASSWORD,
      LEGACY_ITERATIONS,
      false
    )
    store.set(KEY_ID, legacy)
    expect(await mod.hasPersistedClientKeypair()).toBe(true)

    const keypair = await mod.ensureClientKeypairUnlocked(PASSWORD)
    expect(bytes(keypair.privateKey)).toEqual(bytes(privateKey))

    const rewritten = store.get(KEY_ID)
    expect(rewritten).not.toBe(legacy)
    expect(rewritten.iterations).toBe(CURRENT_ITERATIONS)
    expect(rewritten.publicKeyB64).toBe(legacy.publicKeyB64)
    expect(rewritten.createdAt).toBe(legacy.createdAt)
    expect(rewritten.saltB64).not.toBe(legacy.saltB64)
    expect(rewritten.nonceB64).not.toBe(legacy.nonceB64)
    expect(rewritten.ciphertextB64).not.toBe(legacy.ciphertextB64)

    await expect(
      decryptRecord(rewritten, PASSWORD, LEGACY_ITERATIONS)
    ).rejects.toThrow()
    expect(
      bytes(await decryptRecord(rewritten, PASSWORD, CURRENT_ITERATIONS))
    ).toEqual(bytes(privateKey))
    expect(await mod.hasPersistedClientKeypair()).toBe(true)
  })

  it('creates a new record at 600000 iterations', async () => {
    const keypair = await mod.ensureClientKeypairUnlocked(PASSWORD)
    expect(store.has(KEY_ID)).toBe(false)

    await mod.commitPendingClientKeystore()

    const record = store.get(KEY_ID)
    expect(record.iterations).toBe(CURRENT_ITERATIONS)
    expect(record.publicKeyB64).toBe(base64Encode(keypair.publicKey))
    expect(
      bytes(await decryptRecord(record, PASSWORD, CURRENT_ITERATIONS))
    ).toEqual(bytes(keypair.privateKey))
    expect(await mod.hasPersistedClientKeypair()).toBe(true)
  })

  it('a wrong password still fails on either record shape', async () => {
    const privateKey = ed25519.utils.randomPrivateKey()

    const legacy = await buildRecord(
      privateKey,
      PASSWORD,
      LEGACY_ITERATIONS,
      false
    )
    store.set(KEY_ID, legacy)
    await expect(mod.ensureClientKeypairUnlocked('wrong')).rejects.toThrow(
      'MasterPasswordInvalid'
    )
    expect(store.get(KEY_ID)).toBe(legacy)
    expect(mod.isClientKeypairUnlocked()).toBe(false)

    const current = await buildRecord(
      privateKey,
      PASSWORD,
      CURRENT_ITERATIONS,
      true
    )
    store.set(KEY_ID, current)
    await expect(mod.ensureClientKeypairUnlocked('wrong')).rejects.toThrow(
      'MasterPasswordInvalid'
    )
    expect(store.get(KEY_ID)).toBe(current)

    const keypair = await mod.ensureClientKeypairUnlocked(PASSWORD)
    expect(bytes(keypair.privateKey)).toEqual(bytes(privateKey))
    expect(store.get(KEY_ID)).toBe(current)
  })
})
