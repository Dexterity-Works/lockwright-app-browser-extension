import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { loadConfigFromFile } from 'vite'

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

describe('profile output check', () => {
  const [plugin] = profilePlugins(readProfile({ LOCKWRIGHT_PROFILE: 'qa' }))
  let outDir

  function writeOut(files) {
    for (const [name, code] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(outDir, name)), { recursive: true })
      writeFileSync(path.join(outDir, name), code)
    }
  }

  beforeEach(() => {
    outDir = mkdtempSync(path.join(tmpdir(), 'lockwright-profile-'))
  })

  afterEach(() => {
    rmSync(outDir, { recursive: true, force: true })
  })

  it('passes when only the profile host is named', () => {
    writeOut({
      'background.js':
        'c={HOST_NAME:"works.dexterity.lockwright.profile_qa"};p.connectNative(c.HOST_NAME)'
    })
    plugin.writeBundle.call(pluginContext(), { dir: outDir })

    const manifest = JSON.parse(
      readFileSync(path.join(outDir, 'manifest.json'), 'utf8')
    )
    assert.equal(manifest.name, 'Lockwright (profile qa)')
  })

  it('fails when a fallback or a second call names the installed host', () => {
    writeOut({
      'background.js':
        'p.connectNative(c.HOST_NAME||"works.dexterity.lockwright")',
      'assets/send.js': "r.sendNativeMessage('works.dexterity.lockwright',m)"
    })

    assert.throws(
      () => plugin.writeBundle.call(pluginContext(), { dir: outDir }),
      /assets\/send\.js, background\.js .*works\.dexterity\.lockwright/
    )
  })

  it('fails when an earlier config built into the folder without the plugin', () => {
    // background.js as vite.config.background.js writes it with no
    // profile plugin; inject.js is from the config that still has it.
    writeOut({
      'background.js':
        'p.connectNative({}.HOST_NAME="works.dexterity.lockwright")',
      'inject.js': '(()=>{})()'
    })

    assert.throws(
      () => plugin.writeBundle.call(pluginContext(), { dir: outDir }),
      /background\.js/
    )
  })
})

describe('vite configs', () => {
  const configs = ['main', 'content', 'background', 'inject']

  async function load(name, profile) {
    const saved = process.env.LOCKWRIGHT_PROFILE
    if (profile === undefined) delete process.env.LOCKWRIGHT_PROFILE
    else process.env.LOCKWRIGHT_PROFILE = profile
    try {
      const { config } = await loadConfigFromFile(
        { command: 'build', mode: 'production' },
        path.join(repoRoot, `vite.config.${name}.js`),
        repoRoot,
        'silent'
      )
      return {
        outDir: config.build.outDir,
        hasPlugin: config.plugins
          .flat()
          .some((p) => p?.name === 'lockwright-profile')
      }
    } finally {
      if (saved === undefined) delete process.env.LOCKWRIGHT_PROFILE
      else process.env.LOCKWRIGHT_PROFILE = saved
    }
  }

  for (const name of configs) {
    it(`vite.config.${name}.js builds the profile into dist-profile-<name> with the plugin`, async () => {
      assert.deepEqual(await load(name, 'qa'), {
        outDir: 'dist-profile-qa',
        hasPlugin: true
      })
      assert.deepEqual(await load(name, undefined), {
        outDir: 'dist',
        hasPlugin: false
      })
    })
  }
})
