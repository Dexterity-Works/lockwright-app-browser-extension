import {
  URI_MATCH_TYPES,
  doesWebsiteMatchPage
} from '../../../shared/utils/doesWebsiteMatchPage'
import { getHostname } from '../../../shared/utils/getHostname'

type LoginRecord = {
  data?: { username?: string; websites?: string[] }
}

/** Login records a new passkey may be stored on: same username, same site. */
export const filterPasskeyRecords = <T extends LoginRecord>(
  loginRecords: T[],
  serializedPublicKey: string | undefined
): T[] => {
  if (!serializedPublicKey) return loginRecords

  let publicKeyData: {
    rp?: { id?: string }
    user?: { name?: string }
  } | null = null
  try {
    publicKeyData = JSON.parse(serializedPublicKey)
  } catch {
    return loginRecords
  }

  const passkeyHostname = getHostname(publicKeyData?.rp?.id)
  if (!passkeyHostname) return []

  const passkeyUsername = (publicKeyData?.user?.name ?? '').trim()
  if (!passkeyUsername) return []

  const rpUrl = `https://${passkeyHostname}`

  return loginRecords.filter((record) => {
    const recordUsername = (record?.data?.username ?? '').trim()
    if (recordUsername !== passkeyUsername) return false

    const websites = record?.data?.websites ?? []
    return websites.some((website) =>
      doesWebsiteMatchPage(rpUrl, website, URI_MATCH_TYPES.DOMAIN)
    )
  })
}
