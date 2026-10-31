import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { profileManifest, profilePlugins, readProfile } from './profile.mjs'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const constantsFile = path.join(
  repoRoot,
  'src/shared/constants/nativeMessaging.js'
)

// Chrome derives the extension ID from sha256 of the DER key, first 32 hex
// digits mapped 0-f to a-p.
function chromeExtensionId(base64Key) {
  const hex = createHash('sha256')
    .update(Buffer.from(base64Key, 'base64'))
    .digest('hex')
    .slice(0, 32)
  return [...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('')
}

function pluginContext() {
  return {
    error(message) {
      throw new Error(message)
    }
  }
}

describe('readProfile', () => {
  it('returns null without LOCKWRIGHT_PROFILE', () => {
    assert.equal(readProfile({}), null)
    assert.deepEqual(profilePlugins(null), [])
  })

  it('derives the host name and dist dir from the profile name', () => {
    assert.deepEqual(readProfile({ LOCKWRIGHT_PROFILE: 'qa_1' }), {
      name: 'qa_1',
      hostName: 'works.dexterity.lockwright.profile_qa_1',
      outDir: 'dist-profile-qa_1'
    })
  })

  it('fails the build on a name outside [a-z0-9_]{1,24}', () => {
    for (const bad of ['', 'QA', 'qa-1', '../x', 'a'.repeat(25)]) {
      assert.throws(
        () => readProfile({ LOCKWRIGHT_PROFILE: bad }),
        /LOCKWRIGHT_PROFILE/
      )
    }
  })
})

describe('profile build', () => {
  const profile = readProfile({ LOCKWRIGHT_PROFILE: 'qa' })
  const [plugin] = profilePlugins(profile)

  it('rewrites name, gecko id and the Chrome key, and leaves the rest', () => {
    const manifest = JSON.parse(
      readFileSync(path.join(repoRoot, 'public/manifest.json'), 'utf8')
    )
    const out = profileManifest(manifest, 'qa')

    assert.equal(out.name, 'Lockwright (profile qa)')
    assert.equal(
      out.browser_specific_settings.gecko.id,
      'lockwright-profile@dexterity.works'
    )
    assert.equal(chromeExtensionId(out.key), 'degfjkbgcfkbfhhhecbdllgcokjgcdfb')
    assert.equal(manifest.key, undefined)

    const { key, ...rest } = out
    rest.name = manifest.name
    rest.browser_specific_settings.gecko.id =
      manifest.browser_specific_settings.gecko.id
    assert.deepEqual(rest, manifest)
  })

  it('points the native host at the profile host', () => {
    const src = readFileSync(constantsFile, 'utf8')
    const out = plugin.transform.call(pluginContext(), src, constantsFile)

    assert.match(out, /HOST_NAME: "works\.dexterity\.lockwright\.profile_qa"/)
    assert.doesNotMatch(out, /HOST_NAME: MANIFEST_NAME/)
    assert.throws(
      () =>
        plugin.transform.call(
          pluginContext(),
          'export const X = {}',
          constantsFile
        ),
      /HOST_NAME: MANIFEST_NAME/
    )
  })

  it('fails a bundle that calls connectNative without the profile host', () => {
    const chunk = (code) => ({
      c: { type: 'chunk', fileName: 'background.js', code }
    })

    assert.throws(
      () =>
        plugin.generateBundle.call(
          pluginContext(),
          {},
          chunk('p.connectNative(c.HOST_NAME)')
        ),
      /connectNative/
    )
    plugin.generateBundle.call(
      pluginContext(),
      {},
      chunk(
        'c={HOST_NAME:"works.dexterity.lockwright.profile_qa"};p.connectNative(c.HOST_NAME)'
      )
    )
  })

  it('adds the badge to the popup only', () => {
    const [badge] = plugin.transformIndexHtml('', {
      filename: path.join(repoRoot, 'index.html')
    })

    assert.equal(badge.children, 'profile qa')
    assert.equal(
      plugin.transformIndexHtml('', {
        filename: path.join(repoRoot, 'onboarding.html')
      }),
      undefined
    )
  })
})
