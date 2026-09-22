import { RECORD_TYPES } from 'lockwright-lib-vault'

/**
 * Right-click items on a vault row. Logins get Autofill plus Autofill & Add
 * site. Add site always stores host match for the current tab.
 *
 * @param {{ recordType?: string }} args
 * @returns {{ showAutofill: boolean, showAutofillAndAddSite: boolean }}
 */
export const recordRowAutofillMenuItems = ({ recordType } = {}) => {
  const isLogin = recordType === RECORD_TYPES.LOGIN
  return {
    showAutofill: isLogin,
    showAutofillAndAddSite: isLogin
  }
}
