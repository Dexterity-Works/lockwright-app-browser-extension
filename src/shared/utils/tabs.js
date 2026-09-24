/**
 * Safe tab helpers for Gecko forks (Firefox / Zen) where there may be no
 * selected tab (empty workspace) or where `tabs.query({ url })` is unsupported.
 */

/**
 * @returns {Promise<chrome.tabs.Tab | null>}
 */
export async function queryActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    return tabs?.[0] ?? null
  } catch {
    return null
  }
}

/**
 * Send an Autofill record to the active tab's top frame. Content scripts run
 * in every frame, so a tab-wide send would hand the secrets to third-party
 * iframes too.
 *
 * @param {{ recordType: string, data: Record<string, string> }} params
 * @returns {Promise<chrome.tabs.Tab | null>}
 */
export async function autofillActiveTab({ recordType, data }) {
  const tab = await queryActiveTab()
  if (!tab?.id) return tab

  try {
    await chrome.tabs.sendMessage(
      tab.id,
      { type: 'autofillFromAction', recordType, data },
      { frameId: 0 }
    )
  } catch {
    // No content script (empty Zen workspace, restricted URL, etc.)
  }
  return tab
}

/**
 * Query tabs by URL pattern; falls back to scanning all tabs when the browser
 * rejects URL filters (some Firefox builds) or when the query throws.
 *
 * @param {string} urlPattern
 * @returns {Promise<chrome.tabs.Tab[]>}
 */
export async function queryTabsByUrl(urlPattern) {
  try {
    return (await chrome.tabs.query({ url: urlPattern })) ?? []
  } catch {
    try {
      const all = (await chrome.tabs.query({})) ?? []
      const needle = typeof urlPattern === 'string' ? urlPattern : ''
      // Support patterns like chrome-extension://id/* by matching prefix before *
      const prefix = needle.replace(/\*$/, '')
      return all.filter(
        (tab) => tab.url?.startsWith(prefix) || tab.url?.includes(prefix)
      )
    } catch {
      return []
    }
  }
}
