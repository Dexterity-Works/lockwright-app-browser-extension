/**
 * Page identity sent with a save-after-login capture.
 *
 * @param {{ href?: string, title?: string }} page
 * @returns {{ url: string, pageTitle: string }}
 */
export const loginDetectContext = ({ href, title } = {}) => ({
  url: typeof href === 'string' ? href : '',
  pageTitle: typeof title === 'string' ? title.trim() : ''
})
