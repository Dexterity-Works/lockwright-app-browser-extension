import { readdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import path from 'path'

import { generateUniqueId } from 'lockwright-utils-generate-unique-id'
import { matchPatternToValue } from 'lockwright-utils-pattern-search'

const require = createRequire(__filename)

const TETHERTO_FROM = /from\s+['"](@tetherto\/[^'"]+)['"]/g

const vaultSrcFiles = (root) => {
  const src = path.join(root, 'src')
  return readdirSync(src, { recursive: true })
    .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
    .map((name) => path.join(src, name))
}

describe('vault import graph', () => {
  it('resolves every @tetherto import from installed vault source', () => {
    const vaultRoot = path.dirname(
      require.resolve('lockwright-lib-vault/package.json')
    )
    const fromVault = createRequire(
      path.join(vaultRoot, 'src/api/broadcastAction.js')
    )
    const missing = []
    const seen = new Set()
    for (const file of vaultSrcFiles(vaultRoot)) {
      const src = readFileSync(file, 'utf8')
      for (const match of src.matchAll(TETHERTO_FROM)) {
        const spec = match[1]
        if (seen.has(spec)) continue
        seen.add(spec)
        try {
          fromVault.resolve(spec)
        } catch {
          missing.push(spec)
        }
      }
    }
    expect(seen.size).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  it('ships generateUniqueId skipUUID as 32 hex, and case-insensitive search', () => {
    expect(generateUniqueId({ skipUUID: true })).toMatch(/^[0-9a-f]{32}$/)
    expect(matchPatternToValue('Ab', 'xxabXX')).toBe(true)
    expect(matchPatternToValue('Ab', 'xxxx')).toBe(false)
  })
})
