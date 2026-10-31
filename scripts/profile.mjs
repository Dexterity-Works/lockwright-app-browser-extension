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
// LOCKWRIGHT_PROFILE it does nothing.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

function realHostError(dir, files) {
  return `${files.join(', ')} in ${path.relative(repoRoot, dir)} name the installed desktop's native host works.dexterity.lockwright; a profile build must not reach it`
}

// Spread into a vite config's plugins: [] for the normal build.
export function profilePlugins(profile) {
  if (!profile) return []
  const hostLiteral = JSON.stringify(profile.hostName)
  return [
    {
      name: 'lockwright-profile',
      enforce: 'pre',
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
      // Vite copies public/ before writing, so this replaces that copy.
      // Then fails the build if anything in the folder could reach the
      // installed desktop.
      writeBundle(options) {
        const manifest = JSON.parse(
          readFileSync(path.join(repoRoot, 'public/manifest.json'), 'utf8')
        )
        writeFileSync(
          path.join(options.dir, 'manifest.json'),
          JSON.stringify(profileManifest(manifest, profile.name), null, 2) +
            '\n'
        )
        const files = filesNamingRealHost(options.dir)
        if (files.length) this.error(realHostError(options.dir, files))
      }
    }
  ]
}

function main() {
  const profile = readProfile()
  if (!profile) return
  const dir = path.join(repoRoot, profile.outDir)
  const files = filesNamingRealHost(dir)
  if (files.length) throw new Error(realHostError(dir, files))
  console.log(`[profile] ${profile.outDir} does not name the installed host`)
}

const isCli =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (isCli) {
  try {
    main()
  } catch (err) {
    console.error(`[profile] ${err.message}`)
    process.exit(1)
  }
}
