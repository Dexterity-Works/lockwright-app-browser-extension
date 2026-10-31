import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { chromePackagePaths, packageChrome } from './package-chrome.mjs'
import { readProfile } from './profile.mjs'

function makeFixtureDist(root) {
  const distDir = path.join(root, 'dist')
  mkdirSync(distDir, { recursive: true })
  writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify({
      manifest_version: 3,
      name: 'Lockwright',
      permissions: ['storage', 'offscreen'],
      background: { service_worker: 'background.js' }
    })
  )
  writeFileSync(path.join(distDir, 'background.js'), '// bg\n')
  writeFileSync(path.join(distDir, 'offscreen.js'), '// offscreen\n')
  mkdirSync(path.join(distDir, 'icons'), { recursive: true })
  writeFileSync(path.join(distDir, 'icons', 'icon16.png'), 'png')
  return distDir
}

describe('packageChrome', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'lockwright-cr-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('zips dist contents with manifest.json at the zip root', () => {
    const distDir = makeFixtureDist(root)
    const zipPath = path.join(root, 'dist-chrome.zip')

    const result = packageChrome({ distDir, zipPath })

    assert.equal(result.zipPath, zipPath)
    assert.equal(existsSync(zipPath), true)

    const zipBuf = readFileSync(zipPath)
    assert.equal(zipBuf.readUInt32LE(0), 0x04034b50)
    assert.ok(zipBuf.includes(Buffer.from('manifest.json')))
    assert.ok(zipBuf.includes(Buffer.from('background.js')))
    assert.ok(zipBuf.includes(Buffer.from('offscreen.js')))
    assert.ok(zipBuf.includes(Buffer.from('icons/icon16.png')))
    assert.equal(zipBuf.includes(Buffer.from('dist/manifest.json')), false)

    const manifest = JSON.parse(readFileSync(path.join(distDir, 'manifest.json'), 'utf8'))
    assert.ok(manifest.permissions.includes('offscreen'))
    assert.equal(manifest.background.service_worker, 'background.js')
  })

  it('throws when distDir is missing', () => {
    assert.throws(
      () =>
        packageChrome({
          distDir: path.join(root, 'missing-dist'),
          zipPath: path.join(root, 'dist-chrome.zip')
        }),
      /run `pnpm run build` first/i
    )
  })

  it('zips the profile build, not dist/, when LOCKWRIGHT_PROFILE is set', () => {
    const repoRoot = path.resolve(import.meta.dirname, '..')

    assert.deepEqual(chromePackagePaths(readProfile({ LOCKWRIGHT_PROFILE: 'qa' })), {
      distDir: path.join(repoRoot, 'dist-profile-qa'),
      zipPath: path.join(repoRoot, 'dist-profile-qa-chrome.zip')
    })
    assert.equal(chromePackagePaths(null), undefined)
  })
})
