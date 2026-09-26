export const PASSWORD_GENERATOR_CHARACTERS_KEY = 'password-generator-characters'
export const DEFAULT_CHARACTER_COUNT = 20
const MIN_CHARACTER_COUNT = 4
const MAX_CHARACTER_COUNT = 4096

const clampCharacterCount = (value) => {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) return null
  return Math.min(MAX_CHARACTER_COUNT, Math.max(MIN_CHARACTER_COUNT, parsed))
}

export const loadLastCharacterCount = () => {
  try {
    const raw = localStorage.getItem(PASSWORD_GENERATOR_CHARACTERS_KEY)
    return clampCharacterCount(raw) ?? DEFAULT_CHARACTER_COUNT
  } catch {
    return DEFAULT_CHARACTER_COUNT
  }
}

export const saveLastCharacterCount = (count) => {
  const next = clampCharacterCount(count)
  if (next === null) return
  try {
    localStorage.setItem(PASSWORD_GENERATOR_CHARACTERS_KEY, String(next))
  } catch {
    // Device-local only. Ignore quota / private-mode failures.
  }
}
