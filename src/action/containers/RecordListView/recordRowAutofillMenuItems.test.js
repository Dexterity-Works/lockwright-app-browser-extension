import { RECORD_TYPES } from 'lockwright-lib-vault'

import { recordRowAutofillMenuItems } from './recordRowAutofillMenuItems'

describe('recordRowAutofillMenuItems', () => {
  it('shows Autofill and Autofill & Add site on login rows', () => {
    expect(
      recordRowAutofillMenuItems({ recordType: RECORD_TYPES.LOGIN })
    ).toEqual({
      showAutofill: true,
      showAutofillAndAddSite: true
    })
  })

  it('hides autofill items on notes and other types', () => {
    expect(
      recordRowAutofillMenuItems({ recordType: RECORD_TYPES.NOTE })
    ).toEqual({
      showAutofill: false,
      showAutofillAndAddSite: false
    })
    expect(recordRowAutofillMenuItems({ recordType: 'folder' })).toEqual({
      showAutofill: false,
      showAutofillAndAddSite: false
    })
  })
})
