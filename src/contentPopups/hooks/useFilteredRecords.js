import { useEffect, useMemo, useState } from 'react'

import { useRecords } from 'lockwright-lib-vault'

import { useRouter } from '../../shared/context/RouterContext'
import {
  doesWebsiteMatchPage,
  getRecordWebsiteValues
} from '../../shared/utils/doesWebsiteMatchPage'
import {
  hydrateUriMatchSettings,
  onUriMatchSettingsChanged,
  resolveUriMatchType
} from '../../shared/utils/uriMatchSetting'
import { getRecordSiteMatchRank } from '../../shared/utils/uriMatchSpecificity'
import { isOtpAutofillRecord } from '../utils/isOtpAutofillRecord'

export const useFilteredRecords = () => {
  const { state: routerState } = useRouter()
  const [uriMatchEpoch, setUriMatchEpoch] = useState(0)

  const {
    data: recordsData,
    isInitialized,
    isLoading
  } = useRecords({
    variables: {
      filters: {
        type: routerState.recordType
      }
    }
  })

  useEffect(() => {
    let alive = true
    void hydrateUriMatchSettings().then(() => {
      if (alive) setUriMatchEpoch((n) => n + 1)
    })
    const unsubscribe = onUriMatchSettingsChanged(() => {
      setUriMatchEpoch((n) => n + 1)
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const filteredRecords = useMemo(() => {
    if (routerState.recordType === 'login' && routerState?.url) {
      const pageUrl = routerState.url
      const matched =
        recordsData?.filter((record) =>
          getRecordWebsiteValues(record).some((website) =>
            doesWebsiteMatchPage(
              pageUrl,
              website,
              resolveUriMatchType(record, website)
            )
          )
        ) ?? []

      const sorted = [...matched].sort(
        (a, b) =>
          getRecordSiteMatchRank(b, pageUrl) -
          getRecordSiteMatchRank(a, pageUrl)
      )

      if (routerState.fillMode === 'otp') {
        return sorted.filter(isOtpAutofillRecord)
      }

      return sorted
    }

    return recordsData
  }, [
    recordsData,
    routerState?.url,
    routerState?.recordType,
    routerState?.fillMode,
    uriMatchEpoch
  ])

  return {
    filteredRecords,
    isInitialized,
    isLoading
  }
}
