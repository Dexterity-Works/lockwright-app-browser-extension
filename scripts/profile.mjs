// Test-profile build. The extension it makes talks only to a desktop started
// with the same LOCKWRIGHT_PROFILE, never to the installed desktop.
//
// Usage:
//   LOCKWRIGHT_PROFILE=<name> pnpm run build
//
// Writes dist-profile-<name>/. Each vite config calls readProfile(); without
// LOCKWRIGHT_PROFILE it returns null, the configs add no plugin and keep
// outDir 'dist', so the normal build is unchanged.
//
// `pnpm run build` ends with `node scripts/profile.mjs`, which checks the
// whole profile output once more after the last config has built. Without
// LOCKWRIGHT_PROFILE it does nothing. `vite build --watch` (build:watch)
// refuses a profile, because a watcher keeps writing after a failed check.

import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { isCli } from './isCli.mjs'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)

const PROFILE_NAME = /^[a-z0-9_]{1,24}$/
const PROFILE_GECKO_ID = 'lockwright-profile@dexterity.works'
const HOST_CONSTANTS_FILE = path.join(
  repoRoot,
  'src/shared/constants/nativeMessaging.js'
)
const HOST_NAME_SOURCE = 'HOST_NAME: MANIFEST_NAME'
const REAL_HOST = /["'`]works\.dexterity\.lockwright["'`]/

// Public key only. Pins the Chrome extension ID of every profile build to
// degfjkbgcfkbfhhhecbdllgcokjgcdfb, which the desktop lists in the profile
// host manifest's allowed_origins.
const PROFILE_CHROME_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3d3pwajbHNeRQAnjewQzgjvzDP0JqmUvV7qcSdv2OHLCMNNDwsiRhbu9zuVIvP/i2EbKyJvVLSaSpGv76CRy+wMpGFPVpaqYYRB2jWhLp+rXG6WjIlY7a8uTJWjzTAezFrK4ePCbXJ8cPXa/6Gbcgxvn6mRyRO5DC0g5A7sjOcE8gzSmsxu6tq1r7s93Is9hGkr50hG/DryiW+vCJWVziinq/ur0lgMyap/a++4ynwXwqCcMOw4++ipCcdkkPEP/Gdjaw0Uup4SGUrjZ5nM0tzmzIAYdbH45t9dI0njCtr569rl0ocZ1/ST+994mXGNvznbKaD0IA0iM4CtZVcqZVQIDAQAB'

export function readProfile(env = process.env) {
  const name = env.LOCKWRIGHT_PROFILE
  if (name === undefined) return null
  if (!PROFILE_NAME.test(name)) {
    throw new Error(
      `LOCKWRIGHT_PROFILE='${name}' does not match ${PROFILE_NAME}`
    )
  }
  return {
    name,
    hostName: `works.dexterity.lockwright.profile_${name}`,
    outDir: `dist-profile-${name}`
  }
}

export function profileManifest(manifest, name) {
  return {
    ...manifest,
    name: `Lockwright (profile ${name})`,
    key: PROFILE_CHROME_KEY,
    browser_specific_settings: {
      ...manifest.browser_specific_settings,
      gecko: {
        ...manifest.browser_specific_settings.gecko,
        id: PROFILE_GECKO_ID
      }
    }
  }
}

// The .js files under dir that name the installed desktop's native host.
// Scans the whole folder, so a config built without the plugin is caught
// by the next one that has it, and by the check after the last build.
export function filesNamingRealHost(dir) {
  return readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .filter((file) =>
      REAL_HOST.test(readFileSync(path.join(dir, file), 'utf8'))
    )
    .sort()
}

// Deletes the offending files, so an extension already loaded from dir
// cannot run them, and manifest.json, so the browser cannot load or reload
// dir. files are paths relative to dir. Returns the message to fail with.
function refuseOutput(dir, files, reason) {
  const removed = [...new Set([...files, 'manifest.json'])]
  for (const file of removed) rmSync(path.join(dir, file), { force: true })
  return `${reason} Removed ${removed.join(', ')} from ${path.relative(repoRoot, dir)}`
}

function hostError(files) {
  return `${files.join(', ')} name the installed desktop's native host works.dexterity.lockwright; a profile build must not reach it.`
}

function readManifest(dir) {
  try {
    return JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  } catch {
    return null
  }
}

// chromeKey: false for the Firefox package, which drops the key.
export function checkProfileOutput(
  profile,
  dir = path.join(repoRoot, profile.outDir),
  { chromeKey = true } = {}
) {
  const files = filesNamingRealHost(dir)
  if (files.length) throw new Error(refuseOutput(dir, files, hostError(files)))

  const manifest = readManifest(dir)
  if (
    manifest?.browser_specific_settings?.gecko?.id !== PROFILE_GECKO_ID ||
    (chromeKey && manifest.key !== PROFILE_CHROME_KEY)
  ) {
    throw new Error(
      refuseOutput(
        dir,
        [],
        `manifest.json is not the profile ${profile.name} manifest (gecko id ${PROFILE_GECKO_ID}${chromeKey ? ' and the profile Chrome key' : ''}).`
      )
    )
  }
}

// Spread into a vite config's plugins: [] for the normal build.
export function profilePlugins(profile) {
  if (!profile) return []
  const hostLiteral = JSON.stringify(profile.hostName)
  return [
    {
      name: 'lockwright-profile',
      enforce: 'pre',
      configResolved(config) {
        if (config.build.watch) {
          throw new Error(
            `LOCKWRIGHT_PROFILE=${profile.name} cannot build in watch mode; use pnpm run build`
          )
        }
      },
      transform(code, id) {
        if (id.split('?')[0] !== HOST_CONSTANTS_FILE) return null
        if (!code.includes(HOST_NAME_SOURCE)) {
          this.error(
            `${HOST_NAME_SOURCE} not found in ${path.relative(repoRoot, id)}; the profile build cannot point the native host at ${profile.hostName}`
          )
        }
        return code.replace(HOST_NAME_SOURCE, `HOST_NAME: ${hostLiteral}`)
      },
      transformIndexHtml(_html, ctx) {
        if (path.basename(ctx.filename) !== 'index.html') return
        return [
          {
            tag: 'div',
            attrs: {
              'data-testid': 'profile-badge',
              style:
                'position:fixed;left:8px;bottom:8px;z-index:2147483647;pointer-events:none;padding:2px 6px;border-radius:4px;font:12px sans-serif;background:var(--color-primary);color:var(--color-on-primary)'
            },
            children: `profile ${profile.name}`,
            injectTo: 'body'
          }
        ]
      },
      // Before anything reaches disk.
      generateBundle(options, bundle) {
        const files = Object.values(bundle)
          .filter((file) => file.type === 'chunk' && REAL_HOST.test(file.code))
          .map((file) => file.fileName)
          .sort()
        if (files.length) {
          this.error(refuseOutput(options.dir, files, hostError(files)))
        }
      },
      // Vite copies public/ before writing, so this replaces that copy.
      // Then fails the build if anything in the folder, including output of
      // a config without this plugin, could reach the installed desktop.
      writeBundle(options) {
        const manifest = JSON.parse(
          readFileSync(path.join(repoRoot, 'public/manifest.json'), 'utf8')
        )
        writeFileSync(
          path.join(options.dir, 'manifest.json'),
          JSON.stringify(profileManifest(manifest, profile.name), null, 2) +
            '\n'
        )
        try {
          checkProfileOutput(profile, options.dir)
        } catch (err) {
          this.error(err.message)
        }
      }
    }
  ]
}

function main() {
  const profile = readProfile()
  if (!profile) return
  checkProfileOutput(profile)
  console.log(`[profile] ${profile.outDir} passes the profile check`)
}

if (isCli(import.meta.url)) {
  try {
    main()
  } catch (err) {
    console.error(`[profile] ${err.message}`)
    process.exit(1)
  }
}
