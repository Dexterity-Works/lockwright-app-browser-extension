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

import {
  firefoxPackagePaths,
  packageFirefox,
  rewriteFirefoxHtml,
  rewriteInnerHtmlAssignments,
  transformFirefoxManifest
} from './package-firefox.mjs'
import { readProfile } from './profile.mjs'

function makeFixtureDist(root) {
  const distDir = path.join(root, 'dist')
  mkdirSync(distDir, { recursive: true })
  writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(
      {
        manifest_version: 3,
        name: 'Lockwright',
        version: '2.2.0',
        permissions: [
          'storage',
          'nativeMessaging',
          'clipboardRead',
          'clipboardWrite',
          'offscreen',
          'alarms',
          'activeTab'
        ],
        browser_specific_settings: {
          gecko: { id: 'lockwright@dexterity.works', strict_min_version: '109.0' }
        },
        background: {
          service_worker: 'background.js',
          scripts: ['background.js']
        },
        action: {
          default_popup: 'index.html',
          default_icon: {
            '16': 'icons/icon16.png',
            '32': 'icons/icon32.png'
          }
        },
        key: 'CHROME-ONLY-NIGHTLY-KEY',
        web_accessible_resources: [
          {
            resources: ['content-popups.html', 'inject.js'],
            matches: ['<all_urls>'],
            use_dynamic_url: true
          }
        ]
      },
      null,
      2
    )
  )
  writeFileSync(
    path.join(distDir, 'background.js'),
    'if (typeof chrome.offscreen !== "undefined") { chrome.offscreen.hasDocument(); chrome.offscreen.createDocument({}); }\n'
  )
  writeFileSync(path.join(distDir, 'offscreen.html'), '<html></html>\n')
  writeFileSync(path.join(distDir, 'offscreen.js'), '// offscreen\n')
  writeFileSync(
    path.join(distDir, 'content.js'),
    'if(l!=null){t.innerHTML=l}\n'
  )
  writeFileSync(
    path.join(distDir, 'index.html'),
    `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/action.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/strict.css">
  </head>
</html>
`
  )
  return distDir
}

describe('rewriteFirefoxHtml', () => {
  it('removes crossorigin and rewrites root-absolute src/href', () => {
    const input = `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/action.js"></script>
    <link rel="modulepreload" crossorigin="anonymous" href="/assets/strict.js">
    <link rel="stylesheet" crossorigin href="/assets/strict.css">
  </head>
</html>
`
    const out = rewriteFirefoxHtml(input)

    assert.match(out, /src="\.\/action\.js"/)
    assert.match(out, /href="\.\/assets\/strict\.js"/)
    assert.match(out, /href="\.\/assets\/strict\.css"/)
    assert.doesNotMatch(out, /crossorigin/i)
    assert.doesNotMatch(out, /src="\/action\.js"/)
    assert.doesNotMatch(out, /href="\/assets\//)
  })
})

describe('rewriteInnerHtmlAssignments', () => {
  it('removes innerHTML assignments AMO flags in React', () => {
    const out = rewriteInnerHtmlAssignments('if(l!=null){t.innerHTML=l}}break;')

    assert.equal(out.includes('.innerHTML='), false)
    assert.equal(out.includes('.innerHTML ='), false)
    assert.match(out, /__lwSetHtml\(t,l\)/)
  })
})

describe('transformFirefoxManifest', () => {
  it('strips Chrome-only fields and keeps gecko id + background scripts', () => {
    const input = {
      permissions: ['storage', 'offscreen', 'alarms'],
      background: {
        service_worker: 'background.js',
        scripts: ['background.js']
      },
      key: 'secret',
      browser_specific_settings: {
        gecko: { id: 'lockwright@dexterity.works', strict_min_version: '109.0' }
      },
      action: {
        default_popup: 'index.html',
        default_icon: { '16': 'icons/icon16.png' }
      },
      web_accessible_resources: [
        {
          resources: ['inject.js'],
          matches: ['<all_urls>'],
          use_dynamic_url: true
        }
      ]
    }

    const out = transformFirefoxManifest(input)

    assert.deepEqual(out.permissions, ['storage', 'alarms'])
    assert.deepEqual(out.background, { scripts: ['background.js'] })
    assert.equal(out.key, undefined)
    assert.equal(out.browser_specific_settings.gecko.id, 'lockwright@dexterity.works')
    assert.equal(out.web_accessible_resources[0].use_dynamic_url, undefined)
    assert.deepEqual(out.web_accessible_resources[0].resources, ['inject.js'])
    assert.equal(out.action.default_area, 'navbar')
    assert.equal(out.action.default_popup, 'index.html')
    assert.deepEqual(out.action.default_icon, { '16': 'icons/icon16.png' })
    assert.deepEqual(
      out.browser_specific_settings.gecko.data_collection_permissions,
      { required: ['none'] }
    )
  })

  it('keeps an explicit gecko data_collection_permissions declaration', () => {
    const out = transformFirefoxManifest({
      background: { scripts: ['background.js'] },
      browser_specific_settings: {
        gecko: {
          id: 'lockwright@dexterity.works',
          data_collection_permissions: {
            required: ['authenticationInfo']
          }
        }
      }
    })

    assert.deepEqual(
      out.browser_specific_settings.gecko.data_collection_permissions,
      { required: ['authenticationInfo'] }
    )
  })

  it('derives background.scripts from service_worker when scripts missing', () => {
    const out = transformFirefoxManifest({
      background: { service_worker: 'background.js' }
    })

    assert.deepEqual(out.background, { scripts: ['background.js'] })
  })
})

describe('packageFirefox', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'pearpass-ff-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('copies dist to outDir, omits offscreen assets, writes zip', () => {
    const distDir = makeFixtureDist(root)
    const outDir = path.join(root, 'dist-firefox')
    const zipPath = path.join(root, 'dist-firefox.zip')

    const result = packageFirefox({ distDir, outDir, zipPath })

    assert.equal(result.outDir, outDir)
    assert.equal(result.zipPath, zipPath)
    assert.equal(existsSync(path.join(outDir, 'background.js')), true)
    assert.equal(existsSync(path.join(outDir, 'content.js')), true)
    assert.equal(existsSync(path.join(outDir, 'offscreen.html')), false)
    assert.equal(existsSync(path.join(outDir, 'offscreen.js')), false)
    assert.equal(existsSync(zipPath), true)

    const background = readFileSync(path.join(outDir, 'background.js'), 'utf8')
    assert.equal(background.includes('offscreen.hasDocument'), false)
    assert.equal(background.includes('offscreen.createDocument'), false)

    const content = readFileSync(path.join(outDir, 'content.js'), 'utf8')
    assert.equal(content.includes('.innerHTML='), false)
    assert.match(content, /__lwSetHtml\(t,l\)/)

    const zipBuf = readFileSync(zipPath)
    assert.ok(zipBuf.length > 22)
    // Local file header signature (STORE zip)
    assert.equal(zipBuf.readUInt32LE(0), 0x04034b50)
    assert.ok(zipBuf.includes(Buffer.from('manifest.json')))
    assert.ok(zipBuf.includes(Buffer.from('background.js')))
    assert.equal(zipBuf.includes(Buffer.from('offscreen.js')), false)

    const manifest = JSON.parse(
      readFileSync(path.join(outDir, 'manifest.json'), 'utf8')
    )
    assert.ok(!manifest.permissions.includes('offscreen'))
    assert.equal(manifest.background.service_worker, undefined)
    assert.deepEqual(manifest.background.scripts, ['background.js'])
    assert.equal(manifest.key, undefined)
    assert.equal(
      manifest.web_accessible_resources[0].use_dynamic_url,
      undefined
    )
    assert.equal(
      manifest.browser_specific_settings.gecko.id,
      'lockwright@dexterity.works'
    )
    assert.equal(manifest.action.default_area, 'navbar')
    assert.equal(manifest.action.default_popup, 'index.html')

    const indexHtml = readFileSync(path.join(outDir, 'index.html'), 'utf8')
    assert.match(indexHtml, /src="\.\/action\.js"/)
    assert.doesNotMatch(indexHtml, /crossorigin/i)
  })

  it('throws when distDir is missing', () => {
    assert.throws(
      () =>
        packageFirefox({
          distDir: path.join(root, 'missing-dist'),
          outDir: path.join(root, 'dist-firefox'),
          zipPath: path.join(root, 'dist-firefox.zip')
        }),
      /run `pnpm run build` first/i
    )
  })
})

describe('firefoxPackagePaths', () => {
  it('packages the profile build, not dist/, when LOCKWRIGHT_PROFILE is set', () => {
    const repoRoot = path.resolve(import.meta.dirname, '..')

    assert.deepEqual(
      firefoxPackagePaths(readProfile({ LOCKWRIGHT_PROFILE: 'qa' })),
      {
        distDir: path.join(repoRoot, 'dist-profile-qa'),
        outDir: path.join(repoRoot, 'dist-profile-qa-firefox'),
        zipPath: path.join(repoRoot, 'dist-profile-qa-firefox.zip')
      }
    )
    assert.equal(firefoxPackagePaths(null), undefined)
  })
})
