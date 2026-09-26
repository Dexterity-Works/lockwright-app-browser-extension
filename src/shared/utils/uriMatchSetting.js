import { normalizeUrl } from './normalizeUrl'
import { CHROME_STORAGE_KEYS } from '../constants/storage'
import { URI_MATCH_TYPES } from '../constants/uriMatch'

const VALID_MATCH_TYPES = new Set(Object.values(URI_MATCH_TYPES))

/** Vault schema uses Bitwarden-style `baseDomain`; extension UI uses `domain`. */
const VAULT_MATCH_BASE_DOMAIN = 'baseDomain'

/** @type {string} */
let cachedDefault = URI_MATCH_TYPES.DOMAIN

/** @type {Record<string, Record<string, string>>} */
let cachedOverrides = {}

let hydrated = false
let hydratePromise = null
let changeListenerAttached = false

const isValidMatchType = (value) => VALID_MATCH_TYPES.has(value)

/**
 * Map vault/lib-vault match string → extension UriMatchType.
 * @param {unknown} vaultMatch
 * @returns {string|null}
 */
export const fromVaultUriMatch = (vaultMatch) => {
  if (vaultMatch === VAULT_MATCH_BASE_DOMAIN) return URI_MATCH_TYPES.DOMAIN
  if (isValidMatchType(vaultMatch)) return vaultMatch
  return null
}

/**
 * Map extension UriMatchType → vault/lib-vault match string.
 * @param {string} matchType
 * @returns {string}
 */
export const toVaultUriMatch = (matchType) => {
  if (matchType === URI_MATCH_TYPES.DOMAIN) return VAULT_MATCH_BASE_DOMAIN
  if (isValidMatchType(matchType)) return matchType
  return VAULT_MATCH_BASE_DOMAIN
}

const storedLoginUri = (website) =>
  website.trim().replace(/^(https?:\/\/)((?:android|ios)app:\/\/)/i, '$2')

const normalizeWebsiteKey = (website) => {
  if (!website || typeof website !== 'string') return null
  return normalizeUrl(website, true) || website.trim().toLowerCase() || null
}

/**
 * @param {{ data?: { uris?: Array<{ uri?: string, match?: string }> } }} record
 * @param {string|null} websiteKey
 * @returns {string|null}
 */
const matchFromRecordUris = (record, websiteKey) => {
  if (!websiteKey) return null
  const uris = record?.data?.uris
  if (!Array.isArray(uris) || uris.length === 0) return null
  for (const entry of uris) {
    if (!entry || typeof entry.uri !== 'string') continue
    const entryKey = normalizeWebsiteKey(entry.uri)
    if (entryKey && entryKey === websiteKey) {
      return fromVaultUriMatch(entry.match)
    }
  }
  return null
}

const ensureChangeListener = () => {
  if (changeListenerAttached) return
  if (!chrome?.storage?.onChanged?.addListener) return
  changeListenerAttached = true
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    let changed = false
    if (CHROME_STORAGE_KEYS.DEFAULT_URI_MATCH_TYPE in changes) {
      const next = changes[CHROME_STORAGE_KEYS.DEFAULT_URI_MATCH_TYPE]?.newValue
      cachedDefault = isValidMatchType(next) ? next : URI_MATCH_TYPES.DOMAIN
      changed = true
    }
    if (CHROME_STORAGE_KEYS.URI_MATCH_OVERRIDES in changes) {
      const next = changes[CHROME_STORAGE_KEYS.URI_MATCH_OVERRIDES]?.newValue
      cachedOverrides =
        next && typeof next === 'object' && !Array.isArray(next) ? next : {}
      changed = true
    }
    if (changed) {
      hydrated = true
      for (const cb of listeners) cb()
    }
  })
}

/** @type {Set<() => void>} */
const listeners = new Set()

/**
 * Loads default + overrides into the in-memory cache.
 * chrome.storage still holds the **default** match preference (AppPreferences)
 * and legacy per-record overrides (fallback when vault uris absent).
 * @returns {Promise<void>}
 */
export const hydrateUriMatchSettings = async () => {
  ensureChangeListener()
  if (hydrated) return
  if (!chrome?.storage?.local?.get) {
    hydrated = true
    return
  }
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    const res = await chrome.storage.local.get([
      CHROME_STORAGE_KEYS.DEFAULT_URI_MATCH_TYPE,
      CHROME_STORAGE_KEYS.URI_MATCH_OVERRIDES
    ])
    const storedDefault = res?.[CHROME_STORAGE_KEYS.DEFAULT_URI_MATCH_TYPE]
    cachedDefault = isValidMatchType(storedDefault)
      ? storedDefault
      : URI_MATCH_TYPES.DOMAIN
    const storedOverrides = res?.[CHROME_STORAGE_KEYS.URI_MATCH_OVERRIDES]
    cachedOverrides =
      storedOverrides &&
      typeof storedOverrides === 'object' &&
      !Array.isArray(storedOverrides)
        ? storedOverrides
        : {}
    hydrated = true
  })().finally(() => {
    hydratePromise = null
  })

  return hydratePromise
}

/**
 * @returns {Promise<string>}
 */
export const getDefaultUriMatchType = async () => {
  await hydrateUriMatchSettings()
  return cachedDefault
}

/**
 * Sync read of the cached default (domain if not hydrated yet).
 * @returns {string}
 */
export const getDefaultUriMatchTypeSync = () => cachedDefault

/**
 * @param {string} matchType
 * @returns {Promise<void>}
 */
export const setDefaultUriMatchType = async (matchType) => {
  if (!isValidMatchType(matchType)) return
  cachedDefault = matchType
  hydrated = true
  if (!chrome?.storage?.local?.set) return
  await chrome.storage.local.set({
    [CHROME_STORAGE_KEYS.DEFAULT_URI_MATCH_TYPE]: matchType
  })
}

/**
 * @param {string} recordId
 * @returns {Promise<Record<string, string>>}
 */
export const getUriMatchOverrides = async (recordId) => {
  await hydrateUriMatchSettings()
  if (!recordId) return {}
  return { ...(cachedOverrides[recordId] ?? {}) }
}

/**
 * Replaces overrides for a record. Website keys are normalized.
 * Legacy chrome.storage path — vault `data.uris` is source of truth when present.
 * @param {string} recordId
 * @param {Record<string, string>} overrides
 * @returns {Promise<void>}
 */
export const setUriMatchOverrides = async (recordId, overrides) => {
  if (!recordId) return

  await hydrateUriMatchSettings()

  /** @type {Record<string, string>} */
  const normalized = {}
  if (overrides && typeof overrides === 'object') {
    for (const [website, matchType] of Object.entries(overrides)) {
      if (!isValidMatchType(matchType)) continue
      const key = normalizeWebsiteKey(website)
      if (!key) continue
      normalized[key] = matchType
    }
  }

  const nextAll = { ...cachedOverrides }
  if (Object.keys(normalized).length === 0) {
    delete nextAll[recordId]
  } else {
    nextAll[recordId] = normalized
  }
  cachedOverrides = nextAll
  hydrated = true

  if (!chrome?.storage?.local?.set) return
  await chrome.storage.local.set({
    [CHROME_STORAGE_KEYS.URI_MATCH_OVERRIDES]: nextAll
  })
}

/**
 * Sync resolve: vault `record.data.uris` match (when record object given) ||
 * chrome.storage override for (recordId, website) || cached default || domain.
 *
 * @param {string|{ id?: string, data?: { uris?: Array<{ uri?: string, match?: string }> } }} recordOrId
 * @param {string} website
 * @returns {string}
 */
export const resolveUriMatchType = (recordOrId, website) => {
  ensureChangeListener()
  const key = normalizeWebsiteKey(website)

  if (recordOrId && typeof recordOrId === 'object') {
    const fromVault = matchFromRecordUris(recordOrId, key)
    if (fromVault) return fromVault
    const recordId = recordOrId.id
    if (recordId && key) {
      const override = cachedOverrides?.[recordId]?.[key]
      if (isValidMatchType(override)) return override
    }
  } else if (typeof recordOrId === 'string' && recordOrId && key) {
    const override = cachedOverrides?.[recordOrId]?.[key]
    if (isValidMatchType(override)) return override
  }

  return isValidMatchType(cachedDefault)
    ? cachedDefault
    : URI_MATCH_TYPES.DOMAIN
}

/**
 * Build v2 `uris` entries from website rows (extension match types → vault).
 * @param {Array<{ website?: string, matchType?: string }>} websiteRows
 * @returns {Array<{ uri: string, match: string }>}
 */
export const buildLoginUris = (websiteRows, existingUris) => {
  /** @type {Array<{ uri: string, match: string }>} */
  const uris = []
  if (!Array.isArray(websiteRows)) return uris
  const previous = new Map()
  if (Array.isArray(existingUris)) {
    for (const entry of existingUris) {
      if (!entry || typeof entry.uri !== 'string') continue
      const key = normalizeWebsiteKey(entry.uri)
      if (key) previous.set(key, entry)
    }
  }
  for (const row of websiteRows) {
    const trimmed = typeof row?.website === 'string' ? row.website.trim() : ''
    if (!trimmed) continue
    const uri = storedLoginUri(trimmed)
    if (row.matchType && isValidMatchType(row.matchType)) {
      uris.push({ uri, match: toVaultUriMatch(row.matchType) })
      continue
    }
    const prev = previous.get(normalizeWebsiteKey(uri))
    if (prev && typeof prev.match === 'string' && prev.match.length > 0) {
      uris.push({ uri, match: prev.match })
      continue
    }
    const matchType = getDefaultUriMatchTypeSync()
    uris.push({ uri, match: toVaultUriMatch(matchType) })
  }
  return uris
}

/**
 * Website strings for form rows. Prefer websites, include uris-only hosts.
 * @param {{ data?: { websites?: string[]|null, uris?: Array<{ uri?: string }>|null } }|null|undefined} record
 * @returns {string[]}
 */
const getRecordWebsiteValues = (record) => {
  const websites = Array.isArray(record?.data?.websites)
    ? record.data.websites
        .filter(
          (website) => typeof website === 'string' && website.trim() !== ''
        )
        .map(storedLoginUri)
    : []
  const fromUris = Array.isArray(record?.data?.uris)
    ? record.data.uris
        .map((entry) =>
          entry && typeof entry.uri === 'string' && entry.uri.trim() !== ''
            ? storedLoginUri(entry.uri)
            : null
        )
        .filter((uri) => uri !== null)
    : []

  if (fromUris.length === 0) return websites
  if (websites.length === 0) return fromUris

  const seen = new Set()
  const merged = []
  for (const website of [...websites, ...fromUris]) {
    const key = normalizeWebsiteKey(website)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(website)
  }
  return merged
}

/**
 * Form rows for create/edit login: website + UI match type.
 * @param {{ data?: { websites?: string[], uris?: Array<{ uri?: string, match?: string }> } }|null|undefined} record
 * @returns {Array<{ website: string, matchType: string }>}
 */
export const websiteRowsFromRecord = (record) => {
  const websites = getRecordWebsiteValues(record)
  if (websites.length === 0) {
    return [{ website: '', matchType: getDefaultUriMatchTypeSync() }]
  }
  return websites.map((website) => ({
    website,
    matchType: resolveUriMatchType(record, website)
  }))
}

/**
 * One-time migrate hook: copy chrome.storage URI_MATCH_OVERRIDES into vault
 * login records as `data.uris` match fields, then clear those overrides.
 * Pass lib-vault `updateRecords` — match-only changes skip v1 dual-write.
 *
 * Not auto-invoked; call after records are loaded when migrating legacy data.
 *
 * @param {Array<{ id?: string, data?: object }>} records
 * @param {(records: Array) => Promise<unknown>|unknown} updateRecords
 * @returns {Promise<{ migratedRecordIds: string[] }>}
 */
export const migrateUriMatchOverridesToVaultRecords = async (
  records,
  updateRecords
) => {
  await hydrateUriMatchSettings()
  if (!Array.isArray(records) || typeof updateRecords !== 'function') {
    return { migratedRecordIds: [] }
  }

  /** @type {Array<object>} */
  const updates = []
  /** @type {string[]} */
  const migratedRecordIds = []

  for (const record of records) {
    const recordId = record?.id
    if (!recordId) continue
    const overrides = cachedOverrides[recordId]
    if (!overrides || typeof overrides !== 'object') continue

    const overrideEntries = Object.entries(overrides).filter(([, m]) =>
      isValidMatchType(m)
    )
    if (!overrideEntries.length) continue

    const websites = Array.isArray(record.data?.websites)
      ? record.data.websites.filter((w) => typeof w === 'string' && w.length)
      : []
    const existingUris = Array.isArray(record.data?.uris)
      ? record.data.uris
      : []

    const websiteList =
      websites.length > 0
        ? websites
        : existingUris.length > 0
          ? existingUris
              .map((e) => (e && typeof e.uri === 'string' ? e.uri : null))
              .filter(Boolean)
          : overrideEntries.map(([uri]) => uri)

    if (!websiteList.length) continue

    let needsUpdate = false
    const uris = websiteList.map((uri) => {
      const entryKey = normalizeWebsiteKey(uri)
      const existing = existingUris.find(
        (e) => e && normalizeWebsiteKey(e.uri) === entryKey
      )
      const overrideMatch = entryKey ? overrides[entryKey] : null
      if (overrideMatch && isValidMatchType(overrideMatch)) {
        const current = fromVaultUriMatch(existing?.match)
        if (current !== overrideMatch) needsUpdate = true
        return { uri, match: toVaultUriMatch(overrideMatch) }
      }
      return {
        uri,
        match:
          typeof existing?.match === 'string' && existing.match.length > 0
            ? existing.match
            : toVaultUriMatch(URI_MATCH_TYPES.DOMAIN)
      }
    })

    if (!needsUpdate) continue

    updates.push({
      ...record,
      data: {
        ...(record.data ?? {}),
        websites: websiteList,
        uris
      }
    })
    migratedRecordIds.push(recordId)
  }

  if (!updates.length) return { migratedRecordIds: [] }

  await updateRecords(updates)

  const nextAll = { ...cachedOverrides }
  for (const id of migratedRecordIds) delete nextAll[id]
  cachedOverrides = nextAll
  hydrated = true
  if (chrome?.storage?.local?.set) {
    await chrome.storage.local.set({
      [CHROME_STORAGE_KEYS.URI_MATCH_OVERRIDES]: nextAll
    })
  }

  return { migratedRecordIds }
}

/**
 * @param {() => void} cb
 * @returns {() => void}
 */
export const onUriMatchSettingsChanged = (cb) => {
  ensureChangeListener()
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** @internal */
export const __resetUriMatchSettingsCacheForTests = () => {
  cachedDefault = URI_MATCH_TYPES.DOMAIN
  cachedOverrides = {}
  hydrated = false
  hydratePromise = null
  changeListenerAttached = false
  listeners.clear()
}
