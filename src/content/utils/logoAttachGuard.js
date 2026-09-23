const sameField = (a, b) => {
  if (!a || !b) return false
  if (typeof a.isSameNode === 'function') return a.isSameNode(b)
  return a === b
}

/**
 * The logo iframe closes itself when the vault is locked or the field has
 * no records. The content script must not open another one for that same
 * focused field, or each close reloads the popup and the page fills with
 * requests. Focusing a different field may try again.
 */
export const createLogoAttachGuard = () => {
  let suppressedField = null

  return {
    onLogoClosed(field) {
      suppressedField = field ?? null
    },
    /**
     * @returns {boolean} false when this focus must not reopen the logo
     */
    onFocus(field) {
      if (sameField(suppressedField, field)) return false
      suppressedField = null
      return true
    },
    canAttach(field) {
      if (!field) return false
      if (sameField(suppressedField, field)) return false
      return true
    }
  }
}
