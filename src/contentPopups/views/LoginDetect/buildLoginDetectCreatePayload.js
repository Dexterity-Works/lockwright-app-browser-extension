import { RECORD_TYPES } from 'lockwright-lib-vault'

import {
  buildLoginUris,
  getDefaultUriMatchTypeSync
} from '../../../shared/utils/uriMatchSetting'

/**
 * Build the createRecord payload for save-after-login.
 * v2 writes need both websites[] and uris[].
 *
 * @param {{
 *   title?: string,
 *   username?: string,
 *   password?: string,
 *   pageUrl?: string
 * }} params
 * @returns {{
 *   type: string,
 *   data: {
 *     title: string,
 *     username: string,
 *     password: string,
 *     websites: string[],
 *     uris: Array<{ uri: string, match: string }>
 *   }
 * }}
 */
export const buildLoginDetectCreatePayload = ({
  title,
  username,
  password,
  pageUrl
}) => {
  const trimmedUrl = typeof pageUrl === 'string' ? pageUrl.trim() : ''
  const websites = trimmedUrl ? [trimmedUrl] : []
  const uris = trimmedUrl
    ? buildLoginUris([
        { website: trimmedUrl, matchType: getDefaultUriMatchTypeSync() }
      ])
    : []

  return {
    type: RECORD_TYPES.LOGIN,
    data: {
      title,
      username,
      password,
      websites,
      uris
    }
  }
}
