/**
 * Hidden or zero-size inputs are never filled, so a page cannot collect
 * secrets through fields the user does not see.
 *
 * @param {HTMLElement | null | undefined} element
 * @returns {boolean}
 */
export const isVisibleField = (element) => {
  if (!element) return false

  const { width, height } = element.getBoundingClientRect()
  if (!width || !height) return false

  return window.getComputedStyle(element).visibility !== 'hidden'
}
