import { getHostname } from '../../../shared/utils/getHostname'

/**
 * Title for the save card.
 * A saved record title wins on update. Otherwise the page title, then the site host.
 *
 * @param {{ pageTitle?: string, pageUrl?: string, existingTitle?: string }} params
 * @returns {string}
 */
export const resolveLoginDetectTitle = ({
  pageTitle,
  pageUrl,
  existingTitle
} = {}) => {
  const saved = typeof existingTitle === 'string' ? existingTitle.trim() : ''
  if (saved) return saved

  const title = typeof pageTitle === 'string' ? pageTitle.trim() : ''
  if (title) return title

  return getHostname(pageUrl) ?? ''
}
