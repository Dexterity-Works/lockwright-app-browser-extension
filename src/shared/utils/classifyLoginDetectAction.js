import { RECORD_TYPES } from 'lockwright-lib-vault'

import { recordMatchesCurrentSite } from './doesWebsiteMatchPage'
import { getRecordSiteMatchRank } from './uriMatchSpecificity'

const LOGIN_TYPE = RECORD_TYPES?.LOGIN ?? 'login'

/**
 * Decide whether login-detect should save, update, or no-op.
 *
 * Among username+site matches, prefer the most specific URI match
 * (exact > startsWith > host > domain). On a rank tie, prefer an
 * unchanged-password (noop) candidate over update.
 *
 * @param {{
 *   records?: Array<{ type?: string, data?: { username?: string, password?: string, websites?: string[] } }>,
 *   pageUrl?: string,
 *   username?: string,
 *   password?: string
 * }} params
 * @returns {{ action: 'save'|'update'|'noop', existingRecord: object|null }}
 */
export const classifyLoginDetectAction = ({
  records,
  pageUrl,
  username,
  password
}) => {
  const trimmedUsername = (username ?? '').trim()
  const trimmedPassword = (password ?? '').trim()
  const url = pageUrl ?? ''

  const candidates = (records ?? []).filter((record) => {
    if (record?.type !== LOGIN_TYPE && record?.type !== 'login') {
      return false
    }
    const recordUsername = (record?.data?.username ?? '').trim()
    return (
      recordUsername === trimmedUsername &&
      recordMatchesCurrentSite(record, url)
    )
  })

  if (candidates.length === 0) {
    return { action: 'save', existingRecord: null }
  }

  candidates.sort((a, b) => {
    const rankDiff =
      getRecordSiteMatchRank(b, url) - getRecordSiteMatchRank(a, url)
    if (rankDiff !== 0) return rankDiff

    const aSame = (a?.data?.password ?? '').trim() === trimmedPassword
    const bSame = (b?.data?.password ?? '').trim() === trimmedPassword
    if (aSame === bSame) return 0
    return aSame ? -1 : 1
  })

  const existingRecord = candidates[0]

  if ((existingRecord.data?.password ?? '').trim() === trimmedPassword) {
    return { action: 'noop', existingRecord }
  }

  return { action: 'update', existingRecord }
}
