/**
 * Loads the same compiled catalog as the extension action UI so `t` from
 * `@lingui/core/macro` works in the content script (imperative / non-React).
 */
import { i18n } from '@lingui/core'

import { messages } from '../../locales/en/messages.mjs'

const LOCALE = 'en'

i18n.load(LOCALE, messages)
i18n.activate(LOCALE)
