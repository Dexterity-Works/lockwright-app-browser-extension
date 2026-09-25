/**
 * Validates the sender of a message to ensure it comes from a trusted source.
 * @param {chrome.runtime.MessageSender} sender - The sender object from Chrome
 * @param {'extension-page' | 'content-script' | 'any'} requiredContext - The required sender context
 * @returns {boolean} - Whether the sender is valid for the required context
 */
export const validateSender = (sender, requiredContext = 'any') => {
  const extensionUrl = chrome.runtime.getURL('')

  switch (requiredContext) {
    case 'extension-page':
      if (sender.url?.startsWith(extensionUrl)) return true
      // Firefox popup messages often omit sender.url. Content scripts share
      // the runtime id too, but they always come with a tab.
      return Boolean(
        sender.id && sender.id === chrome.runtime?.id && !sender.tab
      )
    case 'content-script':
      return sender.tab?.id !== undefined
    case 'any':
      return true
    default:
      return false
  }
}
