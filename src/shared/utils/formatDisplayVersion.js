function normalizeSha6(gitSha) {
  if (typeof gitSha !== 'string') {
    return 'unknown'
  }

  const hex = gitSha
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '')
  if (hex.length < 6) {
    return 'unknown'
  }

  return hex.slice(0, 6)
}

export function formatDisplayVersion(version, gitSha) {
  if (typeof version !== 'string' || version.length === 0) {
    return ''
  }

  return `${version}-${normalizeSha6(gitSha)}`
}
