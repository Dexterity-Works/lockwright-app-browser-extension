import { URI_MATCH_TYPES, type UriMatchType } from '../constants/uriMatch'
import { getHostname } from './getHostname'
import { getRegistrableDomain } from './getRegistrableDomain'
import { normalizeUrl } from './normalizeUrl'
import { resolveUriMatchType } from './uriMatchSetting'

export { URI_MATCH_TYPES, type UriMatchType }

const isUriMatchType = (value: unknown): value is UriMatchType =>
  value === URI_MATCH_TYPES.DOMAIN ||
  value === URI_MATCH_TYPES.HOST ||
  value === URI_MATCH_TYPES.STARTS_WITH ||
  value === URI_MATCH_TYPES.EXACT

/** Hostname + non-default port (Bitwarden host match key). */
const getHostWithPort = (value: string): string | null => {
  const normalized = normalizeUrl(value, true)
  if (!normalized) return null
  try {
    const url = new URL(normalized)
    const hostname = url.hostname.toLowerCase()
    if (!hostname) return null
    const port =
      url.port && url.port !== '80' && url.port !== '443' ? `:${url.port}` : ''
    return `${hostname}${port}`
  } catch {
    return null
  }
}

const matchesDomain = (pageUrl: string, website: string): boolean => {
  const pageHost = getHostname(pageUrl)
  const recordHost = getHostname(website)
  if (!pageHost || !recordHost) return false

  if (pageHost === recordHost) return true

  const pageDomain = getRegistrableDomain(pageHost)
  const recordDomain = getRegistrableDomain(recordHost)
  return Boolean(pageDomain && recordDomain && pageDomain === recordDomain)
}

const matchesHost = (pageUrl: string, website: string): boolean => {
  const pageHost = getHostWithPort(pageUrl)
  const recordHost = getHostWithPort(website)
  if (!pageHost || !recordHost) return false
  return pageHost === recordHost
}

const matchesStartsWith = (pageUrl: string, website: string): boolean => {
  const pageNormalized = normalizeUrl(pageUrl, true)
  const websiteNormalized = normalizeUrl(website, true)
  if (!pageNormalized || !websiteNormalized) return false
  return pageNormalized.startsWith(websiteNormalized)
}

const matchesExact = (pageUrl: string, website: string): boolean => {
  const pageNormalized = normalizeUrl(pageUrl, true)
  const websiteNormalized = normalizeUrl(website, true)
  if (!pageNormalized || !websiteNormalized) return false
  return pageNormalized === websiteNormalized
}

/**
 * True when the current page URL matches a stored website entry
 * under the given URI match type (Bitwarden-style).
 */
export const doesWebsiteMatchPage = (
  pageUrl: string,
  website: string | null | undefined,
  matchType: UriMatchType = URI_MATCH_TYPES.DOMAIN
): boolean => {
  if (!website) return false

  const type = isUriMatchType(matchType) ? matchType : URI_MATCH_TYPES.DOMAIN

  switch (type) {
    case URI_MATCH_TYPES.HOST:
      return matchesHost(pageUrl, website)
    case URI_MATCH_TYPES.STARTS_WITH:
      return matchesStartsWith(pageUrl, website)
    case URI_MATCH_TYPES.EXACT:
      return matchesExact(pageUrl, website)
    case URI_MATCH_TYPES.DOMAIN:
    default:
      return matchesDomain(pageUrl, website)
  }
}

type RecordWithWebsites = {
  id?: string
  data?: {
    websites?: string[] | null
    uris?: Array<{ uri?: string; match?: string }> | null
    [key: string]: unknown
  } | null
}

/**
 * Website strings used for page matching. Prefer `data.websites`, and
 * always include `data.uris[].uri` so a host stored only on the v2 URI
 * list is still detected.
 */
export const getRecordWebsiteValues = (
  record: RecordWithWebsites | null | undefined
): string[] => {
  const websites = Array.isArray(record?.data?.websites)
    ? record.data.websites.filter(
        (website): website is string =>
          typeof website === 'string' && website.trim() !== ''
      )
    : []
  const fromUris = Array.isArray(record?.data?.uris)
    ? record.data.uris
        .map((entry) =>
          entry && typeof entry.uri === 'string' && entry.uri.trim() !== ''
            ? entry.uri
            : null
        )
        .filter((uri): uri is string => uri !== null)
    : []

  if (fromUris.length === 0) return websites
  if (websites.length === 0) return fromUris

  const seen = new Set<string>()
  const merged: string[] = []
  for (const website of [...websites, ...fromUris]) {
    const key = normalizeUrl(website, true) || website.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(website)
  }
  return merged
}

export type RecordMatchOptions = {
  defaultMatchType?: UriMatchType
  getMatchTypeForWebsite?: (website: string) => UriMatchType
}

/** True when any of the record's website entries match the current page URL. */
export const recordMatchesCurrentSite = (
  record: RecordWithWebsites | null | undefined,
  pageUrl: string,
  options?: RecordMatchOptions
): boolean => {
  const websites = getRecordWebsiteValues(record)
  if (!websites.length) return false

  return websites.some((website) => {
    const hasVaultUris =
      Array.isArray(record?.data?.uris) && record.data.uris.length > 0
    const canResolveFromRecord = Boolean(record?.id || hasVaultUris)
    const matchType =
      options?.getMatchTypeForWebsite?.(website) ??
      (canResolveFromRecord && record
        ? resolveUriMatchType(record, website)
        : undefined) ??
      options?.defaultMatchType ??
      URI_MATCH_TYPES.DOMAIN

    return doesWebsiteMatchPage(pageUrl, website, matchType)
  })
}
