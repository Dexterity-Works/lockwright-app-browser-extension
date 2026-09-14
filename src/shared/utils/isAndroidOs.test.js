import { isAndroidOs } from './isAndroidOs'

describe('isAndroidOs', () => {
  it('is true only for the browser platform os android', () => {
    expect(isAndroidOs('android')).toBe(true)
    expect(isAndroidOs('linux')).toBe(false)
    expect(isAndroidOs('win')).toBe(false)
    expect(isAndroidOs('mac')).toBe(false)
    expect(isAndroidOs('cros')).toBe(false)
    expect(isAndroidOs(undefined)).toBe(false)
    expect(isAndroidOs('')).toBe(false)
  })
})
